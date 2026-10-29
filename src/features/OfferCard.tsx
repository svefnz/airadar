import { ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SafeLink } from '@/components/ui/SafeLink';
import { AmountBadge, AccessBadge, ConditionLine, DeadlineBadge, RiskHint, StatusBadge, TrustBadge } from '@/features/OfferBadges';
import { PersonalActions } from '@/features/PersonalActions';
import { cn } from '@/lib/utils/cn';
import { withBase } from '@/lib/utils/url';
import type { Offer, Platform } from '@/lib/data/schema';

export function OfferCard({ offer, platform, list }: { offer: Offer; platform: Platform; list?: boolean }) {
  const claimUrl = offer.officialUrl ?? platform.websiteUrl;
  const relayPlatform = platform.category === 'api-relay';
  const hasTopModels = offer.models.length > 0;

  return (
    <article
      className={cn(
        'group relative rounded-lg border border-edge bg-surface p-3.5 transition-colors hover:border-edge-strong',
        list && 'rounded-none border-0 border-b first:border-t p-3',
      )}
    >
      <div className={cn('flex items-start justify-between gap-2', list && 'flex-wrap')}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <a href={withBase(`/platforms/${platform.slug}/`)} className="text-[11px] font-medium text-muted hover:text-accent">
              {platform.name}
            </a>
            {offer.demo && <Badge tone="info">Demo</Badge>}
            <StatusBadge status={offer.status} />
            <TrustBadge status={offer.verificationStatus} />
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-ink leading-5">
            {offer.title}
          </h3>
          {offer.models.length === 0 && platform.description && (
            <p className="mt-1 line-clamp-1 text-xs text-faint">{platform.description}</p>
          )}
        </div>
        <PersonalActions offerId={offer.id} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <AmountBadge offer={offer} />
        <AccessBadge access={offer.accessType} />
        <DeadlineBadge offer={offer} />
      </div>

      {hasTopModels && (
        <div className="mt-2 flex flex-wrap gap-1">
          {offer.models.slice(0, 3).map((m) => (
            <span key={m} className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5 text-[11px] text-muted border border-edge">
              <Sparkles className="h-2.5 w-2.5 text-accent" />
              {m}
            </span>
          ))}
          {offer.models.length > 3 && <span className="text-[11px] text-faint self-center">+{offer.models.length - 3}</span>}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-faint">
        {offer.contextWindow ? (
          <span>上下文 {(offer.contextWindow / 1000).toLocaleString()}K</span>
        ) : null}
        {offer.toolCalling === true && <span>Tool Calling</span>}
        {offer.apiCompatibility !== 'unknown' && offer.apiCompatibility !== 'none' && (
          <span>
            {offer.apiCompatibility === 'both' ? 'OpenAI/Anthropic 兼容' : offer.apiCompatibility === 'openai' ? 'OpenAI 兼容' : 'Anthropic 兼容'}
          </span>
        )}
        {offer.rateLimits && <span className="max-w-40 truncate">{offer.rateLimits}</span>}
      </div>

      <div className="mt-2">
        <ConditionLine offer={offer} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <RiskHint offer={offer} relayPlatform={relayPlatform} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-edge pt-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
          <span>发现 {offer.discoveredAt.slice(0, 10)}</span>
          <span>核验 {offer.lastVerifiedAt.slice(0, 10)}</span>
        </div>
        <SafeLink href={claimUrl} className="inline-flex items-center gap-1 text-xs font-medium">
          {offer.officialUrl ? '查看官方依据' : '访问平台'} <ExternalLink className="h-3 w-3" />
        </SafeLink>
      </div>
    </article>
  );
}
