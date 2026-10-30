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
let personalSyncUnsub: (() => void) | null = null;

/**
 * 监听 Auth 变化，在有效登录时全局只加载一次个人数据 (幂等注册 + 防内存泄漏)
 */
export function initPersonalSync() {
  if (typeof window === 'undefined') return;

  if (personalSyncUnsub) {
    personalSyncUnsub();
    personalSyncUnsub = null;
  }

  personalSyncUnsub = $auth.listen((authState) => {
    const nextUserId = authState.user?.id ?? null;
    if (nextUserId === activeUserId) return;
    activeUserId = nextUserId;

    if (!nextUserId) {
      currentFetchSeq++; // 登出立即废弃过去的旧用户异步请求
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
  // 请求过期校验与当前活跃用户校验：防止已退出或切换用户后异步数据晚到回写
  if (seq !== currentFetchSeq || $auth.get().user?.id !== userId) return;

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
// Store Actions (Optimistic UI + 精确局部回滚)
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
    // 细粒度回滚：仅针对当前 offerId 回滚，不覆盖并发其他卡片的成功操作
    const latest = $personal.get().data;
    const revertedFavorites = isFav
      ? [...latest.favorites, offerId]
      : latest.favorites.filter((id) => id !== offerId);
    $personal.setKey('data', { ...latest, favorites: revertedFavorites });
    return false;
  }
  return true;
}

export async function toggleClaimAction(offerId: string, status: ClaimRecord['status']): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  const existing = current.claims[offerId];

  let nextClaim: ClaimRecord | undefined;
  if (existing?.status === status) {
    // 取消该领取状态：若有备注，保留为无状态备注(status: null)；若无备注则清理
    nextClaim = existing.note ? { status: null, note: existing.note } : undefined;
  } else {
    nextClaim = {
      status,
      claimedAt: status === 'claimed' ? new Date().toISOString() : existing?.claimedAt,
      note: existing?.note,
    };
  }

  const nextClaims = { ...current.claims };
  if (nextClaim) {
    nextClaims[offerId] = nextClaim;
  } else {
    delete nextClaims[offerId];
  }

  $personal.setKey('data', { ...current, claims: nextClaims });

  const { error } = nextClaim
    ? await saveCloudClaim(user.id, offerId, nextClaim)
    : await deleteCloudClaim(user.id, offerId);

  if (error) {
    // 细粒度局部回滚
    const latest = $personal.get().data;
    const revertedClaims = { ...latest.claims };
    if (existing) {
      revertedClaims[offerId] = existing;
    } else {
      delete revertedClaims[offerId];
    }
    $personal.setKey('data', { ...latest, claims: revertedClaims });
    return false;
  }
  return true;
}

export async function setNoteAction(offerId: string, note: string): Promise<boolean> {
  const user = $auth.get().user;
  if (!user) return false;

  const current = $personal.get().data;
  const existing = current.claims[offerId];

  // 备注解耦：如无领取记录，保持 status 为 null，彻底不自动设为 claimed
  const trimmed = note.trim();
  let nextClaim: ClaimRecord | undefined;

  if (existing) {
    if (!trimmed && !existing.status) {
      nextClaim = undefined; // 既无状态也无备注，删除
    } else {
      nextClaim = { ...existing, note: trimmed || undefined };
    }
  } else if (trimmed) {
    nextClaim = { status: null, note: trimmed };
  }

  const nextClaims = { ...current.claims };
  if (nextClaim) {
    nextClaims[offerId] = nextClaim;
  } else {
    delete nextClaims[offerId];
  }

  $personal.setKey('data', { ...current, claims: nextClaims });

  const { error } = nextClaim
    ? await saveCloudClaim(user.id, offerId, nextClaim)
    : await deleteCloudClaim(user.id, offerId);

  if (error) {
    // 细粒度局部回滚
    const latest = $personal.get().data;
    const revertedClaims = { ...latest.claims };
    if (existing) {
      revertedClaims[offerId] = existing;
    } else {
      delete revertedClaims[offerId];
    }
    $personal.setKey('data', { ...latest, claims: revertedClaims });
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
