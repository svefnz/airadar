import { useState } from 'react';
import { Star, Check, X, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CLAIM_STATUS_LABELS, type ClaimStatus } from '@/lib/personal';
import { usePersonal } from '@/lib/usePersonal';
import { cn } from '@/lib/utils/cn';

export function PersonalActions({ offerId }: { offerId: string }) {
  const { isFavorite, toggleFavorite, toggleClaim, setNote, state } = usePersonal();
  const [editNote, setEditNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const claim = state.claims[offerId];
  const fav = isFavorite(offerId);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={fav ? '取消收藏' : '收藏'}
          aria-pressed={fav}
          title={fav ? '取消收藏' : '收藏'}
          onClick={() => toggleFavorite(offerId)}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            fav ? 'text-warn bg-warn-bg' : 'text-faint hover:text-warn hover:bg-warn-bg',
          )}
        >
          <Star className="h-3.5 w-3.5" fill={fav ? 'currentColor' : 'none'} />
        </button>
        <Button
          size="sm"
          variant={claim ? (claim.status === 'claimed' ? 'primary' : 'outline') : 'ghost'}
          onClick={() => toggleClaim(offerId, 'claimed')}
          aria-pressed={claim?.status === 'claimed'}
          title="标记已领取/取消"
        >
          <Check className="h-3 w-3" />
          {claim?.status === 'claimed' ? '已领取' : '领取'}
        </Button>
        <Button
          size="sm"
          variant={claim?.status === 'ignored' ? 'outline' : 'ghost'}
          onClick={() => toggleClaim(offerId, 'ignored')}
          aria-pressed={claim?.status === 'ignored'}
          title="不感兴趣/取消"
        >
          <X className="h-3 w-3" />
          {claim?.status === 'ignored' ? '已忽略' : '忽略'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditNote(!editNote); setNoteDraft(claim?.note ?? ''); }} title="个人备注" aria-expanded={editNote}>
          <StickyNote className="h-3 w-3" />
        </Button>
      </div>

      {editNote && (
        <form className="flex w-56 items-center gap-1" onSubmit={(e) => { e.preventDefault(); setNote(offerId, noteDraft.trim()); setEditNote(false); }}>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="备注（仅本浏览器）"
            className="h-7 w-full rounded border border-edge-strong bg-surface px-2 text-xs focus:outline-2 focus:outline-accent"
            autoFocus
          />
          <Button size="sm" variant="primary" type="submit">存</Button>
        </form>
      )}

      {claim?.claimedAt && <span className="text-[10px] text-faint">领取于 {claim.claimedAt.slice(0, 10)}</span>}
      {claim?.status === 'ignored' && <span className="text-[10px] text-faint">{CLAIM_STATUS_LABELS.ignored}</span>}
    </div>
  );
}

export type { ClaimStatus };
