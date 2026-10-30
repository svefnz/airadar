/**
 * 用户个人状态模型与 Supabase 云端数据操作服务
 * - 仅在用户登录后生效，通过 user_id 与稳定 offer_id 关联
 * - RLS 保护：每个 GitHub 用户仅能读写自身数据
 */
import { z } from 'zod';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const CLAIM_STATUSES = ['claimed', 'ignored', 'expired'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  claimed: '已领取',
  ignored: '不感兴趣',
  expired: '已过期',
};

export interface ClaimRecord {
  status: ClaimStatus;
  claimedAt?: string;
  note?: string;
}

export const claimRecordSchema = z.object({
  status: z.enum(CLAIM_STATUSES),
  claimedAt: z.string().optional(),
  note: z.string().max(2000).optional(),
});

export const personalSchema = z.object({
  version: z.literal(1),
  favorites: z.array(z.string()).default([]),
  claims: z.record(z.string(), claimRecordSchema).default({}),
});
export type PersonalState = z.infer<typeof personalSchema>;

export function emptyPersonal(): PersonalState {
  return { version: 1, favorites: [], claims: {} };
}

export function isFavorite(state: PersonalState, offerId: string): boolean {
  return state.favorites.includes(offerId);
}

export function toggleFavorite(state: PersonalState, offerId: string): PersonalState {
  return {
    ...state,
    favorites: isFavorite(state, offerId)
      ? state.favorites.filter((id) => id !== offerId)
      : [...state.favorites, offerId],
  };
}

export function setClaim(state: PersonalState, offerId: string, claim: ClaimRecord): PersonalState {
  return {
    ...state,
    claims: {
      ...state.claims,
      [offerId]: claim,
    },
  };
}

export function getClaim(state: PersonalState, offerId: string): ClaimRecord | undefined {
  return state.claims[offerId];
}

// ============================================================================
// Supabase Cloud Data Layer APIs
// ============================================================================

/**
 * 从 Supabase 批量加载指定用户的全部收藏与领取状态
 */
export async function fetchCloudPersonal(userId: string): Promise<PersonalState> {
  if (!isSupabaseConfigured || !userId) {
    return emptyPersonal();
  }

  try {
    const [favsRes, claimsRes] = await Promise.all([
      supabase.from('user_favorites').select('offer_id').eq('user_id', userId),
      supabase.from('user_claims').select('offer_id, status, claimed_at, notes').eq('user_id', userId),
    ]);

    const favorites = (favsRes.data || []).map((r: { offer_id: string }) => r.offer_id);
    const claims: Record<string, ClaimRecord> = {};

    for (const r of (claimsRes.data || []) as Array<{ offer_id: string; status: ClaimStatus; claimed_at: string; notes?: string }>) {
      claims[r.offer_id] = {
        status: r.status,
        claimedAt: r.claimed_at,
        note: r.notes || undefined,
      };
    }

    return {
      version: 1,
      favorites,
      claims,
    };
  } catch (err) {
    console.error('Failed to fetch personal data from Supabase:', err);
    return emptyPersonal();
  }
}

/**
 * 云端添加收藏
 */
export async function addCloudFavorite(userId: string, offerId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !userId) return { error: null };
  const { error } = await supabase.from('user_favorites').upsert(
    { user_id: userId, offer_id: offerId },
    { onConflict: 'user_id,offer_id' }
  );
  return { error: error ? new Error(error.message) : null };
}

/**
 * 云端移除收藏
 */
export async function removeCloudFavorite(userId: string, offerId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !userId) return { error: null };
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('offer_id', offerId);
  return { error: error ? new Error(error.message) : null };
}

/**
 * 云端保存领取状态与备忘录
 */
export async function saveCloudClaim(
  userId: string,
  offerId: string,
  claim: ClaimRecord
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !userId) return { error: null };
  const { error } = await supabase.from('user_claims').upsert(
    {
      user_id: userId,
      offer_id: offerId,
      status: claim.status,
      claimed_at: claim.claimedAt || new Date().toISOString(),
      notes: claim.note || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,offer_id' }
  );
  return { error: error ? new Error(error.message) : null };
}

/**
 * 云端删除领取标记
 */
export async function deleteCloudClaim(userId: string, offerId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !userId) return { error: null };
  const { error } = await supabase
    .from('user_claims')
    .delete()
    .eq('user_id', userId)
    .eq('offer_id', offerId);
  return { error: error ? new Error(error.message) : null };
}

/**
 * 清空当前用户在云端的所有个人记录
 */
export async function clearCloudPersonal(userId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !userId) return { error: null };
  try {
    const [delFavs, delClaims] = await Promise.all([
      supabase.from('user_favorites').delete().eq('user_id', userId),
      supabase.from('user_claims').delete().eq('user_id', userId),
    ]);
    if (delFavs.error) throw delFavs.error;
    if (delClaims.error) throw delClaims.error;
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('清空云端数据失败') };
  }
}
