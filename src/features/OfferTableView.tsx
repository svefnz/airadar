import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Star,
  ArrowRight,
  User,
  Zap,
  CreditCard,
  Layers,
  Terminal,
  Globe,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { BrandLogo } from '@/features/brand/BrandLogo';
import { OfferDetailDialog } from '@/features/OfferDetailDialog';
import { usePersonal } from '@/lib/usePersonal';
import { fmtDate, daysUntil, fmtAmount } from '@/lib/utils/format';
import {
  ACCESS_TYPE_LABELS,
  AMOUNT_TYPE_LABELS,
  BILLING_REQUIREMENT_LABELS,
  TRUST_STATUS_LABELS,
} from '@/lib/data/enums';
import type { Offer, Platform } from '@/lib/data/schema';

interface OfferTableViewProps {
  offers: Offer[];
  platformById: Map<string, Platform>;
  onSortToggle?: () => void;
}

export function OfferTableView({ offers, platformById, onSortToggle }: OfferTableViewProps) {
  const [selectedOffer, setSelectedOffer] = useState<{ offer: Offer; platform: Platform } | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const { isFavorite, toggleFavorite, toggleClaim } = usePersonal();

  const allSelected = offers.length > 0 && checkedIds.size === offers.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(offers.map((o) => o.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedIds(next);
  };

  const batchFavorite = () => {
    for (const id of checkedIds) {
      if (!isFavorite(id)) {
        toggleFavorite(id);
      }
    }
  };

  const batchClaim = () => {
    for (const id of checkedIds) {
      toggleClaim(id, 'claimed');
    }
  };

  return (
    <>
      <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {/* Batch action toolbar when rows selected */}
        {checkedIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2 text-xs text-foreground">
            <span className="font-medium">已选择 {checkedIds.size} 项活动</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={batchFavorite}
                className="rounded-md bg-card hover:bg-muted px-2.5 py-1 text-xs text-foreground border border-border cursor-pointer shadow-xs"
              >
                批量收藏
              </button>
              <button
                type="button"
                onClick={batchClaim}
                className="rounded-md bg-foreground text-background hover:bg-foreground/90 px-2.5 py-1 text-xs font-medium cursor-pointer shadow-xs"
              >
                批量标记已领取
              </button>
              <button
                type="button"
                onClick={() => setCheckedIds(new Set())}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs ml-1"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto touch-pan-x overscroll-x-contain">
          <table className="w-full text-left border-collapse min-w-[880px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground select-none">
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="全选"
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={onSortToggle}
                    className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span>平台 / 活动</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">核心权益</th>
                <th className="px-4 py-3">领取条件</th>
                <th className="px-4 py-3">时效信息</th>
                <th className="w-20 px-4 py-3 text-center">状态</th>
                <th className="w-36 px-4 py-3 text-right">操作</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#182338] text-xs">
              {offers.map((offer) => {
                const platform = platformById.get(offer.platformId) ?? {
                  id: offer.platformId,
                  name: offer.platformId,
                  slug: offer.platformId,
                  canonicalDomain: '',
                  websiteUrl: offer.officialUrl ?? '',
                  description: '',
                  category: 'other',
                  firstDiscoveredAt: offer.discoveredAt,
                  lastCheckedAt: offer.lastVerifiedAt,
                  trustStatus: offer.verificationStatus,
                };

                const fav = isFavorite(offer.id);
                const isChecked = checkedIds.has(offer.id);
                const daysLeft = daysUntil(offer.endAt);

                // 核心权益 Primary & Secondary lines
                let benefitPrimary = '';
                let benefitSecondary = '';

                if (offer.contextWindow) {
                  benefitPrimary = `${(offer.contextWindow / 1000).toLocaleString()}K 上下文`;
                  if (offer.amountType === 'daily') benefitPrimary += ' / 每日';
                } else if (/14\s*天/i.test(offer.title)) {
                  benefitPrimary = '14 天免费';
                } else if (/3\s*个?月/i.test(offer.title)) {
                  benefitPrimary = '3 个月免费';
                } else if (offer.amount !== null && offer.amount !== undefined) {
                  benefitPrimary = `${fmtAmount(offer.amount, offer.unit)}`;
                  if (offer.amountType === 'daily') benefitPrimary += ' / 每日';
                } else {
                  benefitPrimary = '限时免费权益';
                }

                if (offer.rateLimits) {
                  benefitSecondary = offer.rateLimits;
                } else if (offer.claimConditions.length > 0 && offer.claimConditions[0]) {
                  benefitSecondary = offer.claimConditions[0];
                } else if (offer.models.length > 0) {
                  benefitSecondary = offer.models.slice(0, 2).join('、');
                } else {
                  benefitSecondary = '官方直接开放';
                }

                // 领取条件 Badges
                const conditionBadges: Array<{ label: string; icon: React.ReactNode }> = [];
                if (offer.billingRequirements === 'none') {
                  conditionBadges.push({ label: '无需绑卡', icon: <User className="h-3 w-3" /> });
                } else if (offer.billingRequirements === 'card') {
                  conditionBadges.push({ label: '需信用卡', icon: <CreditCard className="h-3 w-3" /> });
                }

                if (offer.claimConditions.some((c) => /新注册|新用户/i.test(c))) {
                  conditionBadges.push({ label: '新用户', icon: <User className="h-3 w-3" /> });
                }

                if (offer.accessType === 'client') {
                  conditionBadges.push({ label: '客户端专用', icon: <Globe className="h-3 w-3" /> });
                } else if (offer.accessType === 'api') {
                  conditionBadges.push({ label: '原生 API', icon: <Terminal className="h-3 w-3" /> });
                }

                // 时效 Display
                const dateDisc = offer.discoveredAt.slice(5, 10);
                const dateVeri = offer.lastVerifiedAt.slice(5, 10);

                return (
                  <tr
                    key={offer.id}
                    className={`group transition-colors hover:bg-[#121c2e] ${
                      isChecked ? 'bg-[#15233c]/60' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(offer.id)}
                        aria-label={`选择 ${offer.title}`}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                    </td>

                    {/* 平台 / 活动 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <BrandLogo platformId={platform.id} platformName={platform.name} size="md" />
                        <div className="min-w-0">
                          <p
                            onClick={() => setSelectedOffer({ offer, platform })}
                            className="font-bold text-slate-100 hover:text-blue-400 transition-colors cursor-pointer truncate max-w-sm"
                          >
                            {offer.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-sm">
                            {offer.models.length > 0 ? offer.models.join('、') : platform.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 核心权益 */}
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-bold text-emerald-400">{benefitPrimary}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-xs">
                          {benefitSecondary}
                        </p>
                      </div>
                    </td>

                    {/* 领取条件 */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {conditionBadges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full bg-[#182338] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60"
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* 时效信息 */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              daysLeft !== null && daysLeft <= 3
                                ? 'text-amber-400 font-bold animate-pulse drop-shadow-xs'
                                : daysLeft !== null && daysLeft <= 7
                                ? 'text-amber-400'
                                : 'text-slate-200'
                            }`}
                          >
                            {daysLeft !== null && daysLeft <= 3 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping inline-block shrink-0" />
                            )}
                            {offer.endAt
                              ? daysLeft !== null && daysLeft <= 7
                                ? `${daysLeft} 天后截止`
                                : `${offer.endAt.slice(0, 10)} 截止`
                              : '长期有效'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          发现 {dateDisc} &nbsp; 核验 {dateVeri}
                        </p>
                      </div>
                    </td>

                    {/* 状态 */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-medium shadow-xs">
                        有效
                      </span>
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOffer({ offer, platform })}
                          className="inline-flex items-center gap-1 rounded-md bg-[#1d3557]/80 hover:bg-[#1d4ed8] text-blue-200 border border-blue-600/40 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <span>查看详情</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(offer.id)}
                          aria-label={fav ? '取消收藏' : '收藏'}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            fav
                              ? 'text-amber-400 bg-amber-950/50'
                              : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/50'
                          }`}
                        >
                          <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Offer Detail Dialog */}
      {selectedOffer && (
        <OfferDetailDialog
          open={Boolean(selectedOffer)}
          onOpenChange={(open) => !open && setSelectedOffer(null)}
          offer={selectedOffer.offer}
          platform={selectedOffer.platform}
        />
      )}
    </>
  );
}
