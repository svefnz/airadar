import { atom, map, computed } from 'nanostores';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  emptyPersonal,
  fetchCloudPersonal,
  addCloudFavorite,
  removeCloudFavorite,
  saveCloudClaim,
  deleteCloudClaim,
  clearCloudPersonal,
  type ClaimRecord,
  type PersonalState,
} from '@/lib/personal';

// ----------------------------------------------------------------------------
// 1. Auth Store (Cross-Islands Global Session)
// ----------------------------------------------------------------------------
export interface AuthStoreState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
}

export const $auth = map<AuthStoreState>({
  session: null,
  user: null,
  loading: true,
  isConfigured: isSupabaseConfigured,
});

let isAuthInitialized = false;

export function initAuthListener() {
  if (typeof window === 'undefined' || isAuthInitialized) return;
  isAuthInitialized = true;

  if (!isSupabaseConfigured) {
    $auth.setKey('loading', false);
    return;
  }

  // 1. Initial Session
  supabase.auth.getSession().then(({ data: { session } }) => {
    $auth.set({
      session,
      user: session?.user ?? null,
      loading: false,
      isConfigured: isSupabaseConfigured,
    });
  });

  // 2. Auth Changes
  supabase.auth.onAuthStateChange((_event, session) => {
    $auth.set({
      session,
      user: session?.user ?? null,
      loading: false,
      isConfigured: isSupabaseConfigured,
    });
  });
}

// ----------------------------------------------------------------------------
// 2. Personal Cloud Data Store (Single Global Subscription, Zero Duplicate DB Calls)
// ----------------------------------------------------------------------------
export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PersonalStoreState {
  data: PersonalState;
  syncStatus: SyncStatus;
  errorMessage: string | null;
}

export const $personal = map<PersonalStoreState>({
  data: emptyPersonal(),
  syncStatus: 'idle',
  errorMessage: null,
});

// Computed favorites Set for O(1) query across all cards
export const $favoritesSet = computed($personal, (state) => new Set(state.data.favorites));

let activeUserId: string | null = null;
let currentFetchSeq = 0;

/**
 * 监听 Auth 变化，在有效登录时全局只加载一次个人数据
 */
export function initPersonalSync() {
  if (typeof window === 'undefined') return;

  $auth.listen((authState) => {
    const nextUserId = authState.user?.id ?? null;
    if (nextUserId === activeUserId) return;
    activeUserId = nextUserId;

    if (!nextUserId) {
      $personal.set({
        data: emptyPersonal(),
        syncStatus: 'idle',
        errorMessage: null,
      });
      return;
    }

    // Trigger single global cloud load
    loadCloudData(nextUserId);
  });
}

export async function loadCloudData(userId: string) {
  const seq = ++currentFetchSeq;
  $personal.setKey('syncStatus', 'loading');
  $personal.setKey('errorMessage', null);

  const result = await fetchCloudPersonal(userId);
  if (seq !== currentFetchSeq) return; // Stale request guard

  if (result.error) {
    $personal.setKey('syncStatus', 'error');
    $personal.setKey('errorMessage', result.error.message);
  } else {
    $personal.set({
      data: result.data,
      syncStatus: 'success',
      errorMessage: null,
    });
  }
}

// ----------------------------------------------------------------------------
// Store Actions (Optimistic UI + Safe Rollback)
// ----------------------------------------------------------------------------

export async function toggleFavoriteAction(offerId: string): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  const isFav = current.favorites.includes(offerId);

  // Optimistic update
  const nextFavorites = isFav
    ? current.favorites.filter((id) => id !== offerId)
    : [...current.favorites, offerId];

  $personal.setKey('data', { ...current, favorites: nextFavorites });

  const { error } = isFav
    ? await removeCloudFavorite(user.id, offerId)
    : await addCloudFavorite(user.id, offerId);

  if (error) {
    // Rollback
    $personal.setKey('data', current);
    return false;
  }
  return true;
}

export async function toggleClaimAction(offerId: string, status: ClaimRecord['status']): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  const existing = current.claims[offerId];

  if (existing?.status === status) {
    // 取消该领取状态，但保留备注！避免误删备注
    const nextClaim: ClaimRecord | undefined = existing.note
      ? { status: 'expired', note: existing.note } // 或解耦保留
      : undefined;

    const nextClaims = { ...current.claims };
    if (existing.note) {
      nextClaims[offerId] = { status: 'ignored', note: existing.note };
    } else {
      delete nextClaims[offerId];
    }

    $personal.setKey('data', { ...current, claims: nextClaims });

    const nextRecord = nextClaims[offerId];
    const { error } = nextRecord
      ? await saveCloudClaim(user.id, offerId, nextRecord)
      : await deleteCloudClaim(user.id, offerId);

    if (error) {
      $personal.setKey('data', current);
      return false;
    }
  } else {
    const claim: ClaimRecord = {
      status,
      claimedAt: status === 'claimed' ? new Date().toISOString() : existing?.claimedAt,
      note: existing?.note,
    };

    $personal.setKey('data', {
      ...current,
      claims: { ...current.claims, [offerId]: claim },
    });

    const { error } = await saveCloudClaim(user.id, offerId, claim);
    if (error) {
      $personal.setKey('data', current);
      return false;
    }
  }
  return true;
}

export async function setNoteAction(offerId: string, note: string): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  const existing = current.claims[offerId];

  // 备注解耦：如尚无领取记录，保持 status 为 'ignored' 或初始记录，不强行设为 claimed
  const claim: ClaimRecord = existing
    ? { ...existing, note: note || undefined }
    : { status: 'claimed', note: note || undefined };

  $personal.setKey('data', {
    ...current,
    claims: { ...current.claims, [offerId]: claim },
  });

  const { error } = await saveCloudClaim(user.id, offerId, claim);
  if (error) {
    $personal.setKey('data', current);
    return false;
  }
  return true;
}

export async function clearAllPersonalAction(): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  $personal.setKey('data', emptyPersonal());

  const { error } = await clearCloudPersonal(user.id);
  if (error) {
    $personal.setKey('data', current);
    return false;
  }
  return true;
}
