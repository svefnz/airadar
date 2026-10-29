import React, { useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Globe,
  Sparkles,
  Zap,
  Cpu,
  Clock,
  Star,
  Check,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Terminal,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/features/brand/BrandLogo';
import { usePersonal } from '@/lib/usePersonal';
import { fmtDate, daysUntil, fmtAmount } from '@/lib/utils/format';
import { SafeLink } from '@/components/ui/SafeLink';
import {
  ACCESS_TYPE_LABELS,
  AMOUNT_TYPE_LABELS,
  BILLING_REQUIREMENT_LABELS,
  IDENTITY_VERIFICATION_LABELS,
  TRUST_STATUS_LABELS,
} from '@/lib/data/enums';
import type { Offer, Platform } from '@/lib/data/schema';

interface OfferDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer;
  platform: Platform;
}

export function OfferDetailDialog({
  open,
  onOpenChange,
  offer,
  platform,
}: OfferDetailDialogProps) {
  const { isFavorite, toggleFavorite, toggleClaim, setNote, state } = usePersonal();
  const [noteDraft, setNoteDraft] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [copied, setCopied] = useState(false);

  const claim = state.claims[offer.id];
  const fav = isFavorite(offer.id);
  const claimUrl = offer.officialUrl ?? platform.websiteUrl;
  const daysLeft = daysUntil(offer.endAt);

  const isApi = offer.accessType === 'api';
  const modelName = offer.models[0] || 'default-model';
  const baseUrl = platform.websiteUrl.replace(/\/$/, '') + '/v1';
  const curlSnippet = offer.apiCompatibility === 'anthropic'
    ? `curl ${baseUrl}/messages \\
  -H "x-api-key: $API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "${modelName}",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`
    : `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;

  const copySnippet = () => {
    navigator.clipboard?.writeText(curlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1424] border-slate-800 text-slate-100 p-0 shadow-2xl rounded-2xl">
        {/* Header Bar */}
        <div className="relative border-b border-slate-800/80 bg-[#10192e] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandLogo platformId={platform.id} platformName={platform.name} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-300">{platform.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                      offer.verificationStatus === 'official'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : offer.verificationStatus === 'community'
                        ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    }`}
                  >
                    {TRUST_STATUS_LABELS[offer.verificationStatus]}
                  </span>
                  {offer.demo && (
                    <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-[11px] font-medium text-blue-300 border border-blue-700/50">
                      Demo
                    </span>
                  )}
                </div>
                <DialogTitle className="mt-1 text-lg font-bold text-white leading-snug">
                  {offer.title}
                </DialogTitle>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1">
              <button
                type="button"
                onClick={() => toggleFavorite(offer.id)}
                className={`p-2 rounded-lg border transition-colors ${
                  fav
                    ? 'bg-amber-950/50 border-amber-700/60 text-amber-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-amber-400'
                }`}
                title={fav ? '取消收藏' : '收藏'}
              >
                <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => toggleClaim(offer.id, 'claimed')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  claim?.status === 'claimed'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {claim?.status === 'claimed' ? '已领取' : '标记领取'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Core Benefit Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-800/80 bg-[#131d33] p-3.5">
            <div>
              <span className="text-[11px] text-slate-400">额度 / 周期</span>
              <p className="mt-0.5 text-sm font-bold text-emerald-400">
                {offer.unit === 'Unknown' && offer.amountType === 'unknown'
                  ? '额度待核验'
                  : `${fmtAmount(offer.amount, offer.unit)} · ${AMOUNT_TYPE_LABELS[offer.amountType]}`}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">接入形式</span>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {ACCESS_TYPE_LABELS[offer.accessType]}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">绑卡要求</span>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {BILLING_REQUIREMENT_LABELS[offer.billingRequirements]}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400">活动时效</span>
              <p
                className={`mt-0.5 text-sm font-bold ${
                  daysLeft !== null && daysLeft <= 7
                    ? 'text-amber-400'
                    : 'text-slate-200'
                }`}
              >
                {offer.endAt
                  ? daysLeft !== null && daysLeft <= 7
                    ? `${daysLeft} 天后截止`
                    : `至 ${fmtDate(offer.endAt)}`
                  : '长期有效'}
              </p>
            </div>
          </div>

          {/* Detailed Features & Capabilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              包含模型与接口特性
            </h4>
            <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Cpu className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">可用模型：</span>
                  <span className="text-slate-200 ml-1">
                    {offer.models.length > 0 ? offer.models.join('、') : '以官方控制台实时开放为准'}
                  </span>
                </div>
              </div>

              {offer.contextWindow && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-400 font-medium">上下文窗口：</span>
                  <span className="text-slate-200">
                    {(offer.contextWindow / 1000).toLocaleString()}K Tokens
                  </span>
                </div>
              )}

              {offer.toolCalling !== null && offer.toolCalling !== undefined && (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400 font-medium">Tool Calling：</span>
                  <span className="text-slate-200">{offer.toolCalling ? '支持' : '不支持'}</span>
                </div>
              )}

              {offer.apiCompatibility !== 'unknown' && offer.apiCompatibility !== 'none' && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="text-slate-400 font-medium">API 协议兼容：</span>
                  <span className="text-slate-200">
                    {offer.apiCompatibility === 'both'
                      ? '兼容 OpenAI + Anthropic 格式'
                      : offer.apiCompatibility === 'openai'
                      ? '兼容 OpenAI 格式'
                      : '兼容 Anthropic 格式'}
                  </span>
                </div>
              )}

              {offer.rateLimits && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-400 font-medium">频率限制：</span>
                  <span className="text-slate-200">{offer.rateLimits}</span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-medium">地区与实名：</span>
                  <span className="text-slate-200 ml-1">
                    {offer.regionRestrictions.length > 0
                      ? offer.regionRestrictions.join('、')
                      : '全球可用（部分国家网络限制除外）'}
                    {` · ${IDENTITY_VERIFICATION_LABELS[offer.identityVerification]}`}
                  </span>
                </div>
              </div>

              {/* cURL API snippet for developers */}
              {isApi && (
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                      <Terminal className="h-3.5 w-3.5 text-blue-400" />
                      <span>开发者 cURL 快速接入代码</span>
                    </span>
                    <button
                      type="button"
                      onClick={copySnippet}
                      className="inline-flex items-center gap-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>复制代码</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
                    {curlSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Claim Conditions */}
          {offer.claimConditions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                领取条件与指引
              </h4>
              <ul className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 space-y-1.5 text-xs text-slate-300">
                {offer.claimConditions.map((cond, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources and Verification Trail */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              信源核验证据
            </h4>
            <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
                <span>发现时间：{fmtDate(offer.discoveredAt)}</span>
                <span>最近复核：{fmtDate(offer.lastVerifiedAt)}</span>
              </div>
              {offer.sources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">{s.label}</span>
                  </div>
                  <SafeLink
                    href={s.url}
                    className="shrink-0 text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    查看依据 <ExternalLink className="h-3 w-3" />
                  </SafeLink>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Note */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                私密备忘录（仅存本机）
              </h4>
              {!isEditingNote && (
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(claim?.note ?? '');
                    setIsEditingNote(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  {claim?.note ? '修改备注' : '+ 添加备注'}
                </button>
              )}
            </div>
            {isEditingNote ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setNote(offer.id, noteDraft.trim());
                  setIsEditingNote(false);
                }}
              >
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="例如：主账号已绑定 Visa 卡领取，到期日前记得解绑..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <Button size="sm" type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                >
                  取消
                </Button>
              </form>
            ) : claim?.note ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300 italic">
                “{claim.note}”
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">暂无备忘信息</p>
            )}
          </div>
        </div>

        {/* Footer with Main Action Button */}
        <div className="border-t border-slate-800 bg-[#10192e] px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            关闭
          </Button>
          <SafeLink
            href={claimUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            前往官方活动页面领取 <ExternalLink className="h-4 w-4" />
          </SafeLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}
