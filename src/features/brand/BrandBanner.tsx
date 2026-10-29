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

  // 1. OpenAI / ChatGPT Banner
  if (pId.includes('openai') || pName.includes('openai') || title.includes('chatgpt')) {
    return (
      <div className={cn('relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0c1328] via-[#101e40] to-[#182a5c] border border-blue-500/20 p-3.5 flex items-center justify-between shadow-inner', className)}>
        {/* Left Headline */}
        <div className="relative z-10 max-w-[62%]">
          <p className="text-sm font-bold text-white tracking-tight leading-snug drop-shadow-sm">
            体验 GPT-4o、o1、Advanced Voice 和更多高级功能
          </p>
        </div>

        {/* Ambient Neon Glows */}
        <div className="absolute right-2 -bottom-4 w-32 h-32 rounded-full bg-blue-500/20 blur-xl pointer-events-none" />
        <div className="absolute right-12 top-0 w-24 h-24 rounded-full bg-indigo-500/30 blur-lg pointer-events-none" />

        {/* Right 3D Wireframe / Neon Orb Emblem */}
        <div className="relative z-10 flex items-center justify-center pr-2">
          <div className="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 via-indigo-500/40 to-cyan-400/20 border border-cyan-400/40 shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-8 h-8 text-cyan-300 drop-shadow">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="3 3" />
              <path d="M12 3a9 9 0 0 1 9 9m-9 9a9 9 0 0 1-9-9" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7a5 5 0 0 1 5 5m-5 5a5 5 0 0 1-5-5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // 2. Google / Gemini Banner
  if (pId.includes('google') || pName.includes('google') || title.includes('gemini')) {
    return (
      <div className={cn('relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#ffffff] via-[#f5f7fc] to-[#e4e9f8] border border-white/60 p-3.5 flex items-center justify-between shadow-sm', className)}>
        {/* Soft Cosmic Aurora Blurs */}
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-blue-400/25 blur-2xl pointer-events-none" />
        <div className="absolute right-8 -bottom-6 w-28 h-28 rounded-full bg-purple-400/30 blur-xl pointer-events-none" />
        <div className="absolute left-1/3 top-1/2 w-20 h-20 rounded-full bg-rose-400/20 blur-xl pointer-events-none" />

        {/* Center / Left: Gemini 4-color Star + Typography */}
        <div className="relative z-10 flex items-center gap-3 pl-3">
          {/* Gemini 4-Pointed Sparkle Star */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 100 100" fill="none" className="w-10 h-10 drop-shadow-sm">
              <defs>
                <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a73e8" />
                  <stop offset="35%" stopColor="#8ab4f8" />
                  <stop offset="65%" stopColor="#c58af9" />
                  <stop offset="100%" stopColor="#ea4335" />
                </linearGradient>
              </defs>
              <path
                d="M50 0 C50 27.6 27.6 50 0 50 C27.6 50 50 72.4 50 100 C50 72.4 72.4 50 100 50 C72.4 50 50 27.6 50 0 Z"
                fill="url(#gemini-grad)"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#1e293b]">Gemini</span>
        </div>

        {/* Right Model Hint */}
        <div className="relative z-10 pr-3 text-right">
          <span className="inline-block rounded-full bg-blue-50/80 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200/60 shadow-xs">
            1.5 Pro & 2.0 Flash
          </span>
        </div>
      </div>
    );
  }

  // 3. Anthropic / Claude Banner
  if (pId.includes('anthropic') || pName.includes('anthropic') || title.includes('claude')) {
    return (
      <div className={cn('relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#faf6f0] via-[#f7f0e6] to-[#edd9c8] border border-[#e5d0be] p-3.5 flex items-center justify-between shadow-sm', className)}>
        {/* Left: Claude Sunburst Star + Serif Logo */}
        <div className="relative z-10 flex items-center gap-3 pl-3">
          {/* Anthropic / Claude Sunburst */}
          <div className="text-[#cc785c]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12 2a1 1 0 0 1 1 1v2.07a8 8 0 0 1 3.93 1.63l1.46-1.46a1 1 0 1 1 1.42 1.42l-1.46 1.46A8 8 0 0 1 20 12h2a1 1 0 1 1 0 2h-2a8 8 0 0 1-1.63 3.93l1.46 1.46a1 1 0 0 1-1.42 1.42l-1.46-1.46A8 8 0 0 1 13 20.93V23a1 1 0 1 1-2 0v-2.07a8 8 0 0 1-3.93-1.63l-1.46 1.46a1 1 0 1 1-1.42-1.42l1.46-1.46A8 8 0 0 1 4 14H2a1 1 0 1 1 0-2h2a8 8 0 0 1 1.63-3.93L4.17 6.61a1 1 0 0 1 1.42-1.42l1.46 1.46A8 8 0 0 1 11 5.07V3a1 1 0 0 1 1-1z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-[#2d241e] font-serif">Claude</span>
        </div>

        {/* Right Terracotta Diagonal Accents */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none overflow-hidden">
          <div className="absolute -right-6 -top-4 w-28 h-32 bg-[#e89d82]/35 rotate-12 transform" />
          <div className="absolute -right-2 top-2 w-20 h-28 bg-[#d97c5e]/30 rotate-24 transform" />
        </div>
      </div>
    );
  }

  // 4. DeepSeek Banner
  if (pId.includes('deepseek') || title.includes('deepseek')) {
    return (
      <div className={cn('relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#07192e] via-[#0b2847] to-[#123e6b] border border-cyan-500/20 p-3.5 flex items-center justify-between shadow-inner', className)}>
        <div className="relative z-10 max-w-[65%]">
          <p className="text-sm font-bold text-white tracking-tight leading-snug">
            DeepSeek V4.1 Flash 每日限免 · 1M 上下文
          </p>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-cyan-300">
            <Zap className="h-3 w-3 text-cyan-400" /> 不消耗 Credits · 极速推理
          </span>
        </div>

        <div className="absolute right-4 -bottom-6 w-28 h-28 rounded-full bg-cyan-500/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center pr-2">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  }

  // 5. Default High-Tech Dynamic Banner
  const models = offer.models.slice(0, 2);
  return (
    <div className={cn('relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0d1527] via-[#13203c] to-[#17274b] border border-slate-700/50 p-3.5 flex items-center justify-between shadow-inner', className)}>
      {/* Background glow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-blue-500/15 blur-xl pointer-events-none" />

      <div className="relative z-10 max-w-[68%]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>{platform?.name ?? offer.title}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-200 leading-snug">
          {offer.claimConditions[0] || offer.rateLimits || `${platform?.name ?? '平台'} 免费活动权益`}
        </p>
      </div>

      <div className="relative z-10 flex flex-col items-end gap-1">
        {models.length > 0 ? (
          models.map((m) => (
            <span key={m} className="inline-block rounded-md bg-blue-950/70 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-300 max-w-28 truncate">
              {m}
            </span>
          ))
        ) : (
          <span className="inline-block rounded-md bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            限时免费
          </span>
        )}
      </div>
    </div>
  );
}
