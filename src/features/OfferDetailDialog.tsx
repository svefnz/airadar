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
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border text-foreground p-0 shadow-lg rounded-xl">
        {/* Header Bar */}
        <div className="relative border-b border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandLogo platformId={platform.id} platformName={platform.name} size="lg" />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{platform.name}</span>
                  <span className="rounded bg-muted border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    {TRUST_STATUS_LABELS[offer.verificationStatus]}
                  </span>
                  {offer.demo && (
                    <span className="rounded bg-muted border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Demo
                    </span>
                  )}
                </div>
                <DialogTitle className="mt-1 text-base sm:text-lg font-bold text-foreground leading-snug">
                  {offer.title}
                </DialogTitle>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <button
                type="button"
                onClick={() => toggleFavorite(offer.id)}
                className={`p-1.5 rounded-md border text-xs transition-colors ${
                  fav
                    ? 'bg-muted border-border text-warn'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={fav ? '取消收藏' : '收藏'}
              >
                <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => toggleClaim(offer.id, 'claimed')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  claim?.status === 'claimed'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card hover:bg-muted text-foreground border-border'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {claim?.status === 'claimed' ? '已领取' : '标记领取'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Core Benefit Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <span className="text-[11px] text-muted-foreground">额度 / 周期</span>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-ok">
                {offer.unit === 'Unknown' && offer.amountType === 'unknown'
                  ? '额度待核验'
                  : `${fmtAmount(offer.amount, offer.unit)} · ${AMOUNT_TYPE_LABELS[offer.amountType]}`}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground">接入形式</span>
              <p className="mt-0.5 text-xs sm:text-sm font-medium text-foreground">
                {ACCESS_TYPE_LABELS[offer.accessType]}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground">绑卡要求</span>
              <p className="mt-0.5 text-xs sm:text-sm font-medium text-foreground">
                {BILLING_REQUIREMENT_LABELS[offer.billingRequirements]}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground">活动时效</span>
              <p
                className={`mt-0.5 text-xs sm:text-sm font-medium ${
                  daysLeft !== null && daysLeft <= 7
                    ? 'text-warn font-semibold'
                    : 'text-foreground'
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
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">
              包含模型与接口特性
            </h4>
            <div className="rounded-lg border border-border bg-card p-3.5 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">可用模型：</span>
                  <span className="text-foreground ml-1 font-medium">
                    {offer.models.length > 0 ? offer.models.join('、') : '以官方控制台实时开放为准'}
                  </span>
                </div>
              </div>

              {offer.contextWindow && (
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">上下文窗口：</span>
                  <span className="text-foreground font-medium">
                    {(offer.contextWindow / 1000).toLocaleString()}K Tokens
                  </span>
                </div>
              )}

              {offer.toolCalling !== null && offer.toolCalling !== undefined && (
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Tool Calling：</span>
                  <span className="text-foreground font-medium">{offer.toolCalling ? '支持' : '不支持'}</span>
                </div>
              )}

              {offer.apiCompatibility !== 'unknown' && offer.apiCompatibility !== 'none' && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">API 协议兼容：</span>
                  <span className="text-foreground font-medium">
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
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">频率限制：</span>
                  <span className="text-foreground font-medium">{offer.rateLimits}</span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">地区与实名：</span>
                  <span className="text-foreground ml-1">
                    {offer.regionRestrictions.length > 0
                      ? offer.regionRestrictions.join('、')
                      : '全球可用（部分国家网络限制除外）'}
                    {` · ${IDENTITY_VERIFICATION_LABELS[offer.identityVerification]}`}
                  </span>
                </div>
              </div>

              {/* cURL API snippet for developers */}
              {isApi && (
                <div className="pt-2.5 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>开发者 cURL 快速接入代码</span>
                    </span>
                    <button
                      type="button"
                      onClick={copySnippet}
                      className="inline-flex items-center gap-1 text-[11px] rounded bg-muted hover:bg-muted/80 text-foreground px-2 py-0.5 border border-border transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-ok" />
                          <span className="text-ok">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>复制代码</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="rounded-md bg-muted p-2.5 font-mono text-[11px] text-foreground overflow-x-auto leading-relaxed border border-border">
                    {curlSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Claim Conditions */}
          {offer.claimConditions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground">
                领取条件与指引
              </h4>
              <ul className="rounded-lg border border-border bg-card p-3 space-y-1 text-xs text-muted-foreground">
                {offer.claimConditions.map((cond, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-foreground">{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources and Verification Trail */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">
              信源核验证据
            </h4>
            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground pb-1.5 border-b border-border">
                <span>发现时间：{fmtDate(offer.discoveredAt)}</span>
                <span>最近复核：{fmtDate(offer.lastVerifiedAt)}</span>
              </div>
              {offer.sources.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-3.5 w-3.5 text-ok shrink-0" />
                    <span className="text-foreground">{s.label}</span>
                  </div>
                  <SafeLink
                    href={s.url}
                    className="shrink-0 text-primary hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    查看依据 <ExternalLink className="h-3 w-3" />
                  </SafeLink>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">
                私密备忘录（仅存本机）
              </h4>
              {!isEditingNote && (
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(claim?.note ?? '');
                    setIsEditingNote(true);
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
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
                  className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-border"
                  autoFocus
                />
                <Button size="sm" type="submit" className="h-8 bg-foreground text-background hover:bg-foreground/90 text-xs">
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="h-8 text-xs text-muted-foreground"
                >
                  取消
                </Button>
              </form>
            ) : claim?.note ? (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-foreground italic">
                “{claim.note}”
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">暂无备忘信息</p>
            )}
          </div>
        </div>

        {/* Footer with Main Action Button */}
        <div className="border-t border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:text-foreground">
            关闭
          </Button>
          <SafeLink
            href={claimUrl}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background hover:bg-foreground/90 px-3.5 py-1.5 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            前往官方活动页面领取 <ExternalLink className="h-3.5 w-3.5" />
          </SafeLink>
        </div>
      </DialogContent>
    </Dialog>
  );
}
