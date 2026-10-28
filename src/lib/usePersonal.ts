import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearPersonal,
  emptyPersonal,
  exportPersonal,
  loadPersonal,
  parsePersonalImport,
  savePersonal,
  setClaim,
  toggleFavorite,
  type ClaimRecord,
  type PersonalState,
} from '@/lib/personal';

export function usePersonal() {
  const [state, setState] = useState<PersonalState>(() => {
    if (typeof window === 'undefined') return emptyPersonal();
    return loadPersonal();
  });

  useEffect(() => {
    try {
      savePersonal(state);
    } catch {
      /* 隐私模式等场景存储失败时静默 */
    }
  }, [state]);

  const favorites = useMemo(() => new Set(state.favorites), [state.favorites]);

  const toggleFavorite = useCallback((offerId: string) => setState((s) => toggleFavoriteLocal(s, offerId)), []);
  const setClaim = useCallback((offerId: string, claim: ClaimRecord) => setState((s) => setClaimLocal(s, offerId, claim)), []);
  const toggleClaim = useCallback(
    (offerId: string, status: ClaimRecord['status']) =>
      setState((s) => {
        const existing = s.claims[offerId];
        if (existing?.status === status) {
          // 再次点击取消该状态
          const next = { ...s.claims };
          delete next[offerId];
          return { ...s, claims: next };
        }
        return setClaimLocal(s, offerId, { status, claimedAt: status === 'claimed' ? new Date().toISOString() : existing?.claimedAt });
      }),
    [],
  );
  const setNote = useCallback(
    (offerId: string, note: string) =>
      setState((s) => {
        const existing = s.claims[offerId];
        if (!existing) return setClaimLocal(s, offerId, { status: 'claimed', note });
        return setClaimLocal(s, offerId, { ...existing, note: note || undefined });
      }),
    [],
  );
  const clear = useCallback(() => {
    clearPersonal();
    setState(emptyPersonal());
  }, []);

  const importFromText = useCallback((text: string): { ok: boolean; error?: string } => {
    const parsed = parsePersonalImport(text);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    setState(parsed.state);
    return { ok: true };
  }, []);

  return {
    state,
    favorites,
    isFavorite: (id: string) => favorites.has(id),
    toggleFavorite,
    setClaim,
    toggleClaim,
    setNote,
    clear,
    exportText: () => exportPersonal(state),
    importFromText,
  };
}

function toggleFavoriteLocal(s: PersonalState, id: string): PersonalState {
  return toggleFavorite(s, id);
}
function setClaimLocal(s: PersonalState, id: string, claim: ClaimRecord): PersonalState {
  return setClaim(s, id, claim);
}
