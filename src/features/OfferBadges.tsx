import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { badgeTone } from '@/lib/utils/badgeTone';
import {
  ACCESS_TYPE_LABELS,
  AMOUNT_TYPE_LABELS,
  BILLING_REQUIREMENT_LABELS,
  IDENTITY_VERIFICATION_LABELS,
  OFFER_STATUS_LABELS,
  RESET_INTERVAL_LABELS,
  TRUST_STATUS_LABELS,
  type AccessType,
  type AmountType,
  type OfferStatus,
  type TrustStatus,
} from '@/lib/data/enums';
import { fmtAmount } from '@/lib/utils/format';
import type { Offer } from '@/lib/data/schema';
import { daysUntil } from '@/lib/utils/format';

export function amountTone(offer: Offer): 'accent' | 'ok' | 'warn' | 'neutral' {
  if (offer.unit === 'Unknown') return 'neutral';
  if (offer.amountType !== 'one-time' && offer.amountType !== 'unknown') return 'ok';
  return 'accent';
}

/** 额度徽章: 高对比展示核心信息, 附单位语义说明 */
export function AmountBadge({ offer }: { offer: Offer }) {
  const label = offer.unit === 'Unknown' && offer.amountType === 'unknown' ? '额度未确认' : `${fmtAmount(offer.amount, offer.unit)} · ${AMOUNT_TYPE_LABELS[offer.amountType]}`;
  const tip = offer.unit === 'Unknown' ? '额度数值未知, 不得与其他单位比较' : `单位 ${offer.unit}${offer.resetInterval !== 'unknown' ? ` · ${RESET_INTERVAL_LABELS[offer.resetInterval]}` : ''} · 不同单位之间不作价值比较`;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Badge variant="outline" className={badgeTone(amountTone(offer), 'text-xs font-semibold')}>{label}</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StatusBadge({ status }: { status: OfferStatus }) {
  const tone: Record<OfferStatus, 'ok' | 'info' | 'bad' | 'warn' | 'neutral'> = {
    active: 'ok',
    upcoming: 'info',
    ended: 'bad',
    paused: 'warn',
    unknown: 'neutral',
  };
  return <Badge variant="outline" className={badgeTone(tone[status])}>{OFFER_STATUS_LABELS[status]}</Badge>;
}

export function TrustBadge({ status }: { status: TrustStatus }) {
  const tone: Record<TrustStatus, 'ok' | 'warn' | 'info'> = { official: 'ok', community: 'info', unverified: 'warn' };
  return <Badge variant="outline" className={badgeTone(tone[status])}>{TRUST_STATUS_LABELS[status]}</Badge>;
}

export function AccessBadge({ access }: { access: AccessType }) {
  const tone: Record<AccessType, 'accent' | 'neutral' | 'info'> = { api: 'accent', client: 'info', web: 'neutral', unknown: 'neutral' };
  return <Badge variant="outline" className={badgeTone(tone[access])}>{ACCESS_TYPE_LABELS[access]}</Badge>;
}

/** 截止倒计时 */
export function DeadlineBadge({ offer }: { offer: Offer }) {
  const d = daysUntil(offer.endAt);
  if (offer.status === 'ended') return <Badge variant="outline" className={badgeTone('bad')}>已结束</Badge>;
  if (offer.status === 'upcoming') return <Badge variant="outline" className={badgeTone('info')}>即将开始</Badge>;
  if (d === null) return <Badge variant="outline" className={badgeTone('neutral')}>长期</Badge>;
  if (d <= 7) return <Badge variant="outline" className={badgeTone('warn')}>{d} 天后截止</Badge>;
  if (d <= 30) return <Badge variant="outline" className={badgeTone('info')}>{d} 天后截止</Badge>;
  return <Badge variant="outline" className={badgeTone('neutral')}>截止 {offer.endAt!.slice(0, 10)}</Badge>;
}

/** 领取条件与风险信息行 */
export function ConditionLine({ offer }: { offer: Offer }) {
  const bits: string[] = [];
  if (offer.billingRequirements === 'card') bits.push('需绑卡');
  if (offer.billingRequirements === 'none') bits.push('无需绑卡');
  if (offer.identityVerification === 'id') bits.push('需实名认证');
  if (offer.identityVerification === 'phone') bits.push('需手机号');
  if (offer.regionRestrictions.length) bits.push(`限 ${offer.regionRestrictions.join('/')}`);
  if (offer.rateLimits) bits.push(offer.rateLimits);
  if (!bits.length && !offer.claimConditions.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      {bits.map((b) => (
        <span key={b} className="inline-flex items-center gap-1">· {b}</span>
      ))}
      {offer.claimConditions.slice(0, 3).map((c) => (
        <span key={c} className="inline-flex items-center gap-1">· {c}</span>
      ))}
    </div>
  );
}

/** 风险提示(仅高风险项) */
export function RiskHint({ offer, relayPlatform }: { offer: Offer; relayPlatform?: boolean }) {
  const risks: string[] = [];
  if (relayPlatform && offer.accessType === 'api') risks.push('API 中转');
  const cond = [...offer.claimConditions, offer.billingRequirements, offer.identityVerification].join(' ');
  if (/api\s*key|key\s*上传|填写.*key/i.test(cond)) risks.push('可能要求上传私人 Key');
  if (/自动续费|到期扣费|订阅/i.test(cond)) risks.push('到期可能自动扣费');
  if (!risks.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {risks.map((r) => (
        <Badge key={r} variant="outline" className={badgeTone('warn')}>⚠ {r}</Badge>
      ))}
    </div>
  );
}
