import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import {
  emptyPersonal,
  fetchCloudPersonal,
  addCloudFavorite,
  removeCloudFavorite,
  saveCloudClaim,
  deleteCloudClaim,
  clearCloudPersonal,
  isFavorite as checkIsFavorite,
  toggleFavorite as toggleFavoritePure,
  setClaim as setClaimPure,
  type ClaimRecord,
  type PersonalState,
} from '@/lib/personal';

export function usePersonal() {
  const { user } = useAuth();
  const userId = user?.id;

  const [state, setState] = useState<PersonalState>(emptyPersonal());
  const [loading, setLoading] = useState(false);

  // 当用户登录并获得 UID 时，从云端一次性拉取最新的收藏与领取状态
  useEffect(() => {
    if (!userId) {
      setState(emptyPersonal());
      return;
    }

    let active = true;
    setLoading(true);

    fetchCloudPersonal(userId)
      .then((cloudData) => {
        if (active) {
          setState(cloudData);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const favorites = useMemo(() => new Set(state.favorites), [state.favorites]);

  /**
   * 切换收藏（本地乐观更新 + 异步云端同步，失败时回滚并 Toast）
   */
  const toggleFavorite = useCallback(
    (offerId: string) => {
      if (!userId) {
        toast.error('请先通过 GitHub 登录后再进行收藏操作');
        return;
      }

      const prev = state;
      const isFav = checkIsFavorite(prev, offerId);
      const next = toggleFavoritePure(prev, offerId);
      setState(next);

      const action = isFav ? removeCloudFavorite(userId, offerId) : addCloudFavorite(userId, offerId);
      action.then(({ error }) => {
        if (error) {
          setState(prev);
          toast.error(isFav ? '取消收藏同步失败，请检查网络' : '添加收藏同步失败，请检查网络');
        } else {
          toast.success(isFav ? '已取消收藏' : '已加入收藏并同步至云端');
        }
      });
    },
    [userId, state]
  );

  /**
   * 写入/更新领取记录与备忘录
   */
  const setClaim = useCallback(
    (offerId: string, claim: ClaimRecord) => {
      if (!userId) {
        toast.error('请先通过 GitHub 登录');
        return;
      }

      const prev = state;
      const next = setClaimPure(prev, offerId, claim);
      setState(next);

      saveCloudClaim(userId, offerId, claim).then(({ error }) => {
        if (error) {
          setState(prev);
          toast.error('保存领取状态失败，请重试');
        }
      });
    },
    [userId, state]
  );

  /**
   * 切换领取状态
   */
  const toggleClaim = useCallback(
    (offerId: string, status: ClaimRecord['status']) => {
      if (!userId) {
        toast.error('请先通过 GitHub 登录');
        return;
      }

      const prev = state;
      const existing = prev.claims[offerId];

      if (existing?.status === status) {
        // 取消该标记
        const nextClaims = { ...prev.claims };
        delete nextClaims[offerId];
        setState({ ...prev, claims: nextClaims });

        deleteCloudClaim(userId, offerId).then(({ error }) => {
          if (error) {
            setState(prev);
            toast.error('取消标记同步失败');
          } else {
            toast.success('已取消领取状态');
          }
        });
      } else {
        const claim: ClaimRecord = {
          status,
          claimedAt: status === 'claimed' ? new Date().toISOString() : existing?.claimedAt,
          note: existing?.note,
        };
        const next = setClaimPure(prev, offerId, claim);
        setState(next);

        saveCloudClaim(userId, offerId, claim).then(({ error }) => {
          if (error) {
            setState(prev);
            toast.error('状态同步失败');
          } else {
            toast.success(status === 'claimed' ? '已标记为已领取' : '已标记为不感兴趣');
          }
        });
      }
    },
    [userId, state]
  );

  /**
   * 更新备注
   */
  const setNote = useCallback(
    (offerId: string, note: string) => {
      if (!userId) {
        toast.error('请先登录');
        return;
      }

      const prev = state;
      const existing = prev.claims[offerId];
      const claim: ClaimRecord = existing
        ? { ...existing, note: note || undefined }
        : { status: 'claimed', note: note || undefined };

      const next = setClaimPure(prev, offerId, claim);
      setState(next);

      saveCloudClaim(userId, offerId, claim).then(({ error }) => {
        if (error) {
          setState(prev);
          toast.error('备忘录保存失败');
        } else {
          toast.success('备忘录已保存并同步至云端');
        }
      });
    },
    [userId, state]
  );

  /**
   * 清空当前用户的云端个人记录
   */
  const clear = useCallback(async () => {
    if (!userId) return;
    const prev = state;
    setState(emptyPersonal());

    const { error } = await clearCloudPersonal(userId);
    if (error) {
      setState(prev);
      toast.error('清空云端记录失败');
    } else {
      toast.success('已清空您的云端个人记录');
    }
  }, [userId, state]);

  return {
    state,
    favorites,
    loading,
    isFavorite: (id: string) => favorites.has(id),
    toggleFavorite,
    setClaim,
    toggleClaim,
    setNote,
    clear,
  };
}
