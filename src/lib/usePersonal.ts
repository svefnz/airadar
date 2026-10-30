import { useStore } from '@nanostores/react';
import { toast } from 'sonner';
import {
  $auth,
  $personal,
  $favoritesSet,
  toggleFavoriteAction,
  toggleClaimAction,
  setNoteAction,
  clearAllPersonalAction,
  loadCloudData,
} from '@/lib/store';
import type { ClaimRecord } from '@/lib/personal';

/**
 * 响应式 usePersonal Hook
 * - 直接消费 Nano Stores 全局单例，实现跨 Astro Islands 零成本实时通信
 * - 全局无论有多少个 OfferCard 实例，均不会发起重复的网络查询
 */
export function usePersonal() {
  const auth = useStore($auth);
  const personal = useStore($personal);
  const favorites = useStore($favoritesSet);

  const toggleFavorite = async (offerId: string) => {
    if (!auth.user) {
      toast.error('请先通过 GitHub 登录');
      return;
    }
    const isFav = favorites.has(offerId);
    const ok = await toggleFavoriteAction(offerId);
    if (ok) {
      toast.success(isFav ? '已取消收藏' : '已收藏并同步至云端');
    } else {
      toast.error('同步失败，请检查网络');
    }
  };

  const toggleClaim = async (offerId: string, status: ClaimRecord['status']) => {
    if (!auth.user) {
      toast.error('请先通过 GitHub 登录');
      return;
    }
    const existing = personal.data.claims[offerId];
    const isCanceling = existing?.status === status;
    const ok = await toggleClaimAction(offerId, status);
    if (ok) {
      toast.success(isCanceling ? '已取消领取状态' : status === 'claimed' ? '已标记为已领取' : '已标记为不感兴趣');
    } else {
      toast.error('状态同步失败');
    }
  };

  const setNote = async (offerId: string, note: string) => {
    if (!auth.user) {
      toast.error('请先登录');
      return;
    }
    const ok = await setNoteAction(offerId, note);
    if (ok) {
      toast.success('备忘录已保存并同步至云端');
    } else {
      toast.error('备忘录保存失败');
    }
  };

  const clear = async () => {
    if (!auth.user) return;
    const ok = await clearAllPersonalAction();
    if (ok) {
      toast.success('已清空云端个人记录');
    } else {
      toast.error('清空云端记录失败');
    }
  };

  const retrySync = () => {
    if (auth.user) {
      loadCloudData(auth.user.id);
    }
  };

  return {
    state: personal.data,
    favorites,
    syncStatus: personal.syncStatus,
    syncError: personal.errorMessage,
    loading: personal.syncStatus === 'loading',
    isFavorite: (id: string) => favorites.has(id),
    toggleFavorite,
    setClaim: async (offerId: string, claim: ClaimRecord) => {
      await toggleClaimAction(offerId, claim.status);
      if (claim.note) await setNoteAction(offerId, claim.note);
    },
    toggleClaim,
    setNote,
    clear,
    retrySync,
  };
}
