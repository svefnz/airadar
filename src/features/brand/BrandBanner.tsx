import React from 'react';
import { Sparkles, Zap, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Offer, Platform } from '@/lib/data/schema';

interface BrandBannerProps {
  offer: Offer;
  platform?: Platform;
  className?: string;
}

export function BrandBanner({ offer, platform, className }: BrandBannerProps) {
  const pId = (platform?.id ?? offer.platformId ?? '').toLowerCase();
  const pName = (platform?.name ?? '').toLowerCase();
  const title = offer.title.toLowerCase();

  // 1. OpenAI / ChatGPT Banner (Notion Minimal Clean)
  if (pId.includes('openai') || pName.includes('openai') || title.includes('chatgpt')) {
    return (
      <div
        className={cn(
          'relative h-20 w-full overflow-hidden rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between transition-colors',
          className
        )}
      >
        <div className="relative z-10 max-w-[70%]">
          <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight leading-snug">
            体验 GPT-4o、o1、Voice 与全系高级模型
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            OpenAI 官方直连
          </span>
        </div>

        <div className="relative z-10 flex items-center justify-center pr-1">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-card border border-border text-foreground shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="2 2" />
              <path d="M12 3a9 9 0 0 1 9 9m-9 9a9 9 0 0 1-9-9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7a5 5 0 0 1 5 5m-5 5a5 5 0 0 1-5-5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // 2. Google / Gemini Banner
  if (pId.includes('google') || pName.includes('google') || title.includes('gemini')) {
    return (
      <div
        className={cn(
          'relative h-20 w-full overflow-hidden rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between transition-colors',
          className
        )}
      >
        <div className="relative z-10 flex items-center gap-2.5 pl-1">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 100 100" fill="none" className="w-8 h-8">
              <defs>
                <linearGradient id="gemini-notion-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a73e8" />
                  <stop offset="35%" stopColor="#8ab4f8" />
                  <stop offset="65%" stopColor="#c58af9" />
                  <stop offset="100%" stopColor="#ea4335" />
                </linearGradient>
              </defs>
              <path
                d="M50 0 C50 27.6 27.6 50 0 50 C27.6 50 50 72.4 50 100 C50 72.4 72.4 50 100 50 C72.4 50 50 27.6 50 0 Z"
                fill="url(#gemini-notion-grad)"
              />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-foreground block">Gemini</span>
            <span className="text-[11px] text-muted-foreground font-mono">Google DeepMind</span>
          </div>
        </div>

        <div className="relative z-10 pr-1 text-right">
          <span className="inline-block rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-foreground border border-border shadow-xs">
            1.5 Pro & 2.0 Flash
          </span>
        </div>
      </div>
    );
  }

  // 3. Anthropic / Claude Banner
  if (pId.includes('anthropic') || pName.includes('anthropic') || title.includes('claude')) {
    return (
      <div
        className={cn(
          'relative h-20 w-full overflow-hidden rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between transition-colors',
          className
        )}
      >
        <div className="relative z-10 flex items-center gap-2.5 pl-1">
          <div className="text-[#cc785c]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M12 2a1 1 0 0 1 1 1v2.07a8 8 0 0 1 3.93 1.63l1.46-1.46a1 1 0 1 1 1.42 1.42l-1.46 1.46A8 8 0 0 1 20 12h2a1 1 0 1 1 0 2h-2a8 8 0 0 1-1.63 3.93l1.46 1.46a1 1 0 0 1-1.42 1.42l-1.46-1.46A8 8 0 0 1 13 20.93V23a1 1 0 1 1-2 0v-2.07a8 8 0 0 1-3.93-1.63l-1.46 1.46a1 1 0 1 1-1.42-1.42l1.46-1.46A8 8 0 0 1 4 14H2a1 1 0 1 1 0-2h2a8 8 0 0 1 1.63-3.93L4.17 6.61a1 1 0 0 1 1.42-1.42l1.46 1.46A8 8 0 0 1 11 5.07V3a1 1 0 0 1 1-1z" />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-foreground font-serif block">Claude</span>
            <span className="text-[11px] text-muted-foreground font-mono">Anthropic</span>
          </div>
        </div>

        <div className="relative z-10 pr-1 text-right">
          <span className="inline-block rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-foreground border border-border shadow-xs">
            Sonnet · Haiku · Opus
          </span>
        </div>
      </div>
    );
  }

  // 4. DeepSeek Banner
  if (pId.includes('deepseek') || title.includes('deepseek')) {
    return (
      <div
        className={cn(
          'relative h-20 w-full overflow-hidden rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between transition-colors',
          className
        )}
      >
        <div className="relative z-10 max-w-[70%]">
          <p className="text-xs sm:text-sm font-semibold text-foreground tracking-tight leading-snug">
            DeepSeek V4.1 每日限免 · 1M 上下文
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            <Zap className="h-3 w-3 text-ok" /> 高速推理，免消耗点数
          </span>
        </div>

        <div className="relative z-10 flex items-center justify-center pr-1">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-foreground shadow-xs">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // 5. Default Clean Notion Banner
  const models = offer.models.slice(0, 2);
  return (
    <div
      className={cn(
        'relative h-20 w-full overflow-hidden rounded-lg bg-muted/40 border border-border p-3 flex items-center justify-between transition-colors',
        className
      )}
    >
      <div className="relative z-10 max-w-[68%]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{platform?.name ?? offer.title}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-snug">
          {offer.claimConditions[0] || offer.rateLimits || `${platform?.name ?? '平台'} 免费活动权益`}
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-end gap-1">
        {models.length > 0 ? (
          models.map((m) => (
            <span
              key={m}
              className="inline-block rounded-md bg-card border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground max-w-28 truncate shadow-xs"
            >
              {m}
            </span>
          ))
        ) : (
          <span className="inline-block rounded-md bg-card border border-border px-1.5 py-0.5 text-[10px] font-medium text-ok shadow-xs">
            限时免费
          </span>
        )}
      </div>
    </div>
  );
}
