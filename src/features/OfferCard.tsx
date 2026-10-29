import React, { useState } from 'react';
import {
  Globe,
  Briefcase,
  UserCheck,
  Compass,
  Clock,
  Star,
  ExternalLink,
  ArrowRight,
  User,
  Zap,
  CreditCard,
  Shield,
  Layers,
  Timer,
} from 'lucide-react';
import { BrandLogo } from '@/features/brand/BrandLogo';
import { BrandBanner } from '@/features/brand/BrandBanner';
import { OfferDetailDialog } from '@/features/OfferDetailDialog';
import { SafeLink } from '@/components/ui/SafeLink';
import { usePersonal } from '@/lib/usePersonal';
import { fmtDate, daysUntil, isWithinDays, fmtAmount } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import {
  ACCESS_TYPE_LABELS,
  AMOUNT_TYPE_LABELS,
  TRUST_STATUS_LABELS,
} from '@/lib/data/enums';
import type { Offer, Platform } from '@/lib/data/schema';

interface OfferCardProps {
  offer: Offer;
  platform: Platform;
  list?: boolean;
}

export function OfferCard({ offer, platform }: OfferCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { isFavorite, toggleFavorite } = usePersonal();

  const fav = isFavorite(offer.id);
  const claimUrl = offer.officialUrl ?? platform.websiteUrl;
  const isNew = isWithinDays(offer.discoveredAt, 7);
  const daysLeft = daysUntil(offer.endAt);

  // Derive smart tag chips
  const tags: Array<{
    icon: React.ReactNode;
    label: string;
    variant: 'slate' | 'emerald' | 'purple' | 'amber' | 'blue';
  }> = [];

  // Tag 1: Target Audience
  if (offer.claimConditions.some((c) => /新注册|新用户/i.test(c)) || offer.amountType === 'one-time') {
    tags.push({ icon: <User className="h-3 w-3" />, label: '新用户', variant: 'slate' });
  } else if (/开发者|开发/i.test(offer.title) || platform.category === 'coding-agent' || platform.category === 'llm-api') {
    tags.push({ icon: <User className="h-3 w-3" />, label: '开发者', variant: 'slate' });
  } else {
    tags.push({ icon: <User className="h-3 w-3" />, label: '全员可用', variant: 'slate' });
  }

  // Tag 2: Free Benefit / Duration
  if (/14\s*天/i.test(offer.title)) {
    tags.push({ icon: <Timer className="h-3 w-3" />, label: '14 天免费', variant: 'emerald' });
  } else if (/3\s*个?月/i.test(offer.title)) {
    tags.push({ icon: <Timer className="h-3 w-3" />, label: '3 个月免费', variant: 'emerald' });
  } else if (offer.amount !== null && offer.amount !== undefined) {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: `${fmtAmount(offer.amount, offer.unit)}`, variant: 'emerald' });
  } else if (offer.amountType === 'daily') {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: '每日限免', variant: 'emerald' });
  } else if (offer.amountType === 'limited-unlimited') {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: '限时无限量', variant: 'emerald' });
  } else {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: '免费体验', variant: 'emerald' });
  }

  // Tag 3: Requirements / Card / Identity
  if (offer.billingRequirements === 'none') {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: '无需信用卡', variant: 'purple' });
  } else if (offer.billingRequirements === 'card') {
    tags.push({ icon: <CreditCard className="h-3 w-3" />, label: '需绑定支付方式', variant: 'purple' });
  } else if (offer.identityVerification === 'id') {
    tags.push({ icon: <Shield className="h-3 w-3" />, label: '需验证身份', variant: 'purple' });
  }

  // Tag 4: Urgency or Scope
  if (daysLeft !== null && daysLeft <= 7) {
    tags.push({ icon: <Clock className="h-3 w-3" />, label: '即将结束', variant: 'amber' });
  } else if (/限量/i.test(offer.claimConditions.join(' '))) {
    tags.push({ icon: <Zap className="h-3 w-3" />, label: '限量', variant: 'amber' });
  } else if (offer.regionRestrictions.length === 0) {
    tags.push({ icon: <Globe className="h-3 w-3" />, label: '全球可用', variant: 'slate' });
  }

  // Subtitle deduction
  const subtitle =
    offer.claimConditions.find((c) => c.length > 6 && !c.includes('http')) ||
    platform.description ||
    '限时免费体验官方核心权益';

  // Detail list values
  const regionText =
    offer.regionRestrictions.length > 0
      ? offer.regionRestrictions.join('、')
      : '全球 (部分地区受限)';

  const contentText =
    offer.models.length > 0
      ? offer.models.slice(0, 4).join('、') + (offer.models.length > 4 ? ' 等' : '')
      : offer.title;

  const conditionText =
    offer.claimConditions.length > 0
      ? offer.claimConditions[0]
      : offer.billingRequirements === 'none'
      ? '新注册账号无需绑卡'
      : '新注册账号';

  // Format expiry display
  const expiryDisplay = offer.endAt ? `${fmtDate(offer.endAt)} 截止` : '长期有效';

  return (
    <>
      <article className="group relative flex flex-col justify-between rounded-2xl border border-[#1e2a42] bg-[#101726]/95 p-5 shadow-xl shadow-black/25 hover:border-blue-500/40 hover:shadow-blue-500/5 transition-all duration-200">
        <div>
          {/* Header Row: Logo + Platform Name + Badges + Favorite Star */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandLogo platformId={platform.id} platformName={platform.name} size="md" />
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/platforms/${platform.slug}/`}
                  className="text-base font-bold text-slate-100 hover:text-blue-400 transition-colors"
                >
                  {platform.name}
                </a>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium border',
                    offer.verificationStatus === 'official'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : offer.verificationStatus === 'community'
                      ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                      : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  )}
                >
                  {TRUST_STATUS_LABELS[offer.verificationStatus]}
                </span>
                {isNew && (
                  <span className="rounded-full bg-blue-950/70 text-blue-400 border border-blue-600/60 px-2 py-0.5 text-[11px] font-bold tracking-wider">
                    NEW
                  </span>
                )}
              </div>
            </div>

            {/* Favorite Star Button */}
            <button
              type="button"
              onClick={() => toggleFavorite(offer.id)}
              aria-label={fav ? '取消收藏' : '收藏'}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                fav
                  ? 'text-amber-400 bg-amber-950/40'
                  : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/40'
              )}
            >
              <Star className="h-5 w-5" fill={fav ? 'currentColor' : 'none'} strokeWidth={1.75} />
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-3.5">
            <h3
              onClick={() => setDetailOpen(true)}
              className="text-lg font-bold text-white tracking-tight leading-snug cursor-pointer hover:text-blue-300 transition-colors"
            >
              {offer.title}
            </h3>
            <p className="mt-1 text-xs text-slate-400 line-clamp-1 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Tag Chips Row */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((t, idx) => (
              <span
                key={idx}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                  t.variant === 'slate' &&
                    'bg-[#1a2333]/90 text-slate-300 border-[#2d3a4f]/70',
                  t.variant === 'emerald' &&
                    'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
                  t.variant === 'purple' &&
                    'bg-purple-950/50 text-purple-300 border-purple-800/60',
                  t.variant === 'amber' &&
                    'bg-amber-950/50 text-amber-300 border-amber-800/60',
                  t.variant === 'blue' &&
                    'bg-blue-950/60 text-blue-300 border-blue-800/60'
                )}
              >
                {t.icon}
                <span>{t.label}</span>
              </span>
            ))}
          </div>

          {/* Banner Graphic Showcase */}
          <div className="mt-4">
            <BrandBanner offer={offer} platform={platform} />
          </div>

          {/* Metadata Detail List (4 Rows with Icons) */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0 w-20">
                <Globe className="h-3.5 w-3.5" />
                <span>可用地区</span>
              </span>
              <span className="text-slate-200 truncate">{regionText}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0 w-20">
                <Briefcase className="h-3.5 w-3.5" />
                <span>包含内容</span>
              </span>
              <span className="text-slate-200 truncate">{contentText}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0 w-20">
                <UserCheck className="h-3.5 w-3.5" />
                <span>领取条件</span>
              </span>
              <span className="text-slate-200 truncate">{conditionText}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-slate-400 shrink-0 w-20">
                <Compass className="h-3.5 w-3.5" />
                <span>领取方式</span>
              </span>
              <SafeLink
                href={claimUrl}
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 truncate"
              >
                访问活动页面注册并激活 <ExternalLink className="h-3 w-3 shrink-0" />
              </SafeLink>
            </div>
          </div>
        </div>

        {/* Card Footer: Discovery / Expiry Dates + 查看详情 Button */}
        <div className="mt-5 pt-3.5 border-t border-[#1e2a42]/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{fmtDate(offer.discoveredAt)} 发现</span>
            <span className="text-slate-600">|</span>
            <span className={daysLeft !== null && daysLeft <= 7 ? 'text-amber-400 font-medium' : ''}>
              {expiryDisplay}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            查看详情 <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      {/* Offer Detail Dialog */}
      <OfferDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        offer={offer}
        platform={platform}
      />
    </>
  );
}
