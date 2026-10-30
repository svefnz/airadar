import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Star,
  RotateCcw,
  Info,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Shield,
  CreditCard,
  Zap,
  Clock,
  Globe,
  User,
  Timer,
  ChevronRight,
  Layers,
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

interface OfferSwipeDeckProps {
  offers: Offer[];
  platformById: Map<string, Platform>;
  onSwitchView?: (view: 'card' | 'list') => void;
}

// Zero-dependency Web Audio synthesizer for tactile Reign-style sound FX
function playTone(type: 'swipe' | 'bookmark' | 'undo') {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'swipe') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'bookmark') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'undo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // AudioContext blocked or unsupported in environment
  }
}

export function OfferSwipeDeck({ offers, platformById, onSwitchView }: OfferSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<Array<{ index: number; action: 'pass' | 'bookmark' }>>([]);
  const [inspectOffer, setInspectOffer] = useState<{ offer: Offer; platform: Platform } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Drag State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { isFavorite, toggleFavorite } = usePersonal();

  // Reset index when offer list drastically changes (e.g. Filter applied)
  useEffect(() => {
    setCurrentIndex(0);
    setHistory([]);
  }, [offers]);

  const currentOffer = offers[currentIndex];
  const nextOffer1 = offers[currentIndex + 1];
  const nextOffer2 = offers[currentIndex + 2];
  const currentPlatform = currentOffer ? platformById.get(currentOffer.platformId) : undefined;

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    if (currentIndex >= offers.length) return;
    const targetOffer = offers[currentIndex];
    if (!targetOffer) return;

    if (soundEnabled) {
      playTone(direction === 'right' ? 'bookmark' : 'swipe');
    }

    setExitDirection(direction);
    setIsDragging(false);

    // If swiped right, bookmark it if not already favorited
    if (direction === 'right' && !isFavorite(targetOffer.id)) {
      toggleFavorite(targetOffer.id);
    }

    setTimeout(() => {
      setHistory((prev) => [...prev, { index: currentIndex, action: direction === 'right' ? 'bookmark' : 'pass' }]);
      setCurrentIndex((prev) => prev + 1);
      setDragOffset({ x: 0, y: 0 });
      setExitDirection(null);
    }, 280);
  }, [currentIndex, offers, soundEnabled, isFavorite, toggleFavorite]);

  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    if (!last) return;
    if (soundEnabled) playTone('undo');

    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCurrentIndex(last.index);
    setDragOffset({ x: 0, y: 0 });
    setExitDirection(null);
  }, [history, soundEnabled]);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exitDirection) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    const threshold = 110;
    if (dragOffset.x > threshold) {
      triggerSwipe('right');
    } else if (dragOffset.x < -threshold) {
      triggerSwipe('left');
    } else {
      // Snap back
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering if focus is in an input or dialog
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        triggerSwipe('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        triggerSwipe('right');
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (currentOffer && currentPlatform) {
          setInspectOffer({ offer: currentOffer, platform: currentPlatform });
        }
      } else if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        undoLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipe, undoLast, currentOffer, currentPlatform]);

  // Finished Deck State
  if (currentIndex >= offers.length) {
    const bookmarkedCount = history.filter((h) => h.action === 'bookmark').length;
    return (
      <div className="relative mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-[#1e2a42] bg-gradient-to-b from-[#101726] to-[#0a0e18] p-8 text-center shadow-2xl">
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
          <Sparkles className="h-10 w-10 text-blue-400 animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
        </div>

        <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
          🎉 本轮雷达卡片已全部探索完毕！
        </h3>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          你已完成全部 <span className="font-semibold text-slate-200">{offers.length}</span> 个 AI 资源的王权决策探索，共收藏加星了 <span className="font-bold text-emerald-400">{bookmarkedCount}</span> 个优质限免福利。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setHistory([]);
              setDragOffset({ x: 0, y: 0 });
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            重新洗牌探索
          </button>

          {onSwitchView && (
            <button
              type="button"
              onClick={() => onSwitchView('card')}
              className="flex items-center gap-2 rounded-xl border border-[#1e2a42] bg-[#10192e] hover:bg-[#16223d] px-5 py-2.5 text-sm font-medium text-slate-200 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4 text-blue-400" />
              切换卡片网格
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate dynamic drag transforms for top card
  const rotation = dragOffset.x * 0.08;
  const passOpacity = Math.min(Math.max(-dragOffset.x / 80, 0), 1);
  const bookmarkOpacity = Math.min(Math.max(dragOffset.x / 80, 0), 1);

  let topCardTransform = `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.4}px, 0) rotate(${rotation}deg)`;
  if (exitDirection === 'left') {
    topCardTransform = `translate3d(-600px, ${dragOffset.y}px, 0) rotate(-28deg)`;
  } else if (exitDirection === 'right') {
    topCardTransform = `translate3d(600px, ${dragOffset.y}px, 0) rotate(28deg)`;
  }

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col items-center select-none pt-2 pb-6">
      {/* Top Controller Header */}
      <div className="flex w-full items-center justify-between px-2 mb-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-blue-300 font-semibold">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            王权探索模式
          </span>
          <span>
            {currentIndex + 1} / {offers.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / offers.length) * 100}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1e2a42] bg-[#0e1626] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? '音效开启' : '音效关闭'}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* 3D Stack Container */}
      <div className="relative h-[530px] w-full max-w-[420px] perspective-[1000px] flex items-center justify-center">
        {/* Layer 3: Deep Background Card */}
        {nextOffer2 && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl border border-[#172136] bg-[#0c1220] p-5 opacity-40 shadow-xl transition-all duration-300"
            style={{
              transform: 'scale(0.88) translateY(36px)',
              zIndex: 10,
            }}
          />
        )}

        {/* Layer 2: Next Card In Line */}
        {nextOffer1 && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl border border-[#1e2a42] bg-[#0f1728] p-5 opacity-80 shadow-2xl transition-all duration-300"
            style={{
              transform: `scale(${0.94 + Math.min(Math.abs(dragOffset.x) / 1200, 0.05)}) translateY(${20 - Math.min(Math.abs(dragOffset.x) / 30, 16)}px)`,
              zIndex: 20,
            }}
          >
            {/* Ambient tease of next card */}
            <div className="flex items-center justify-between opacity-50 mb-3">
              <span className="text-xs font-medium text-slate-400">下一张预备</span>
              <span className="text-xs text-slate-500">{nextOffer1.title}</span>
            </div>
          </div>
        )}

        {/* Layer 1: Active Interactive Top Card */}
        {currentOffer && currentPlatform && (
          <div
            ref={cardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: topCardTransform,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 30,
              touchAction: 'none',
            }}
            className={cn(
              'absolute inset-0 flex flex-col justify-between rounded-2xl border bg-[#101726] p-5 shadow-2xl cursor-grab active:cursor-grabbing backdrop-blur-md',
              dragOffset.x > 30 ? 'border-emerald-500/50 shadow-emerald-950/20' : dragOffset.x < -30 ? 'border-rose-500/50 shadow-rose-950/20' : 'border-[#1e2a42]'
            )}
          >
            {/* Reigns Decision Stamps Overlays */}
            <div
              className="pointer-events-none absolute left-6 top-6 z-40 rounded-xl border-2 border-emerald-400 bg-emerald-950/80 px-4 py-1.5 font-black tracking-wider text-emerald-300 shadow-xl backdrop-blur-md -rotate-12 transition-opacity"
              style={{ opacity: bookmarkOpacity }}
            >
              ⭐️ 收藏领取 (KEEP)
            </div>

            <div
              className="pointer-events-none absolute right-6 top-6 z-40 rounded-xl border-2 border-rose-500 bg-rose-950/80 px-4 py-1.5 font-black tracking-wider text-rose-300 shadow-xl backdrop-blur-md rotate-12 transition-opacity"
              style={{ opacity: passOpacity }}
            >
              ✕ 暂不考虑 (PASS)
            </div>

            {/* Top Header */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#131d31] border border-[#1e2a42]">
                    <BrandLogo
                      platformId={currentPlatform.id}
                      platformName={currentPlatform.name}
                      className="h-6 w-6"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-sm block truncate">
                      {currentPlatform.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {currentPlatform.canonicalDomain}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentOffer.verificationStatus === 'official' && (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      官方活动
                    </span>
                  )}
                  {isWithinDays(currentOffer.discoveredAt, 7) && (
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      NEW
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Tagline */}
              <h4 className="text-base font-bold text-white line-clamp-1 mb-1">
                {currentOffer.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                {currentOffer.claimConditions[0] ?? currentPlatform.description ?? '限时免费体验官方核心权益'}
              </p>

              {/* Tag Chips Row */}
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#131d31] border border-[#1e2a42] px-2 py-0.5 text-[10px] text-slate-300">
                  <User className="h-3 w-3 text-slate-400" />
                  {currentOffer.claimConditions.some((c) => /新注册|新用户/i.test(c)) ? '新用户' : '全员可用'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  {currentOffer.amount !== null && currentOffer.amount !== undefined
                    ? fmtAmount(currentOffer.amount, currentOffer.unit)
                    : currentOffer.amountType === 'daily'
                    ? '每日限免'
                    : '免费体验'}
                </span>
                {currentOffer.billingRequirements === 'none' ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 text-[10px] text-purple-300">
                    <Shield className="h-3 w-3 text-purple-400" />
                    无需信用卡
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300">
                    <CreditCard className="h-3 w-3 text-amber-400" />
                    需绑定支付方式
                  </span>
                )}
              </div>

              {/* Brand Showcase Banner */}
              <div className="mb-3.5">
                <BrandBanner
                  offer={currentOffer}
                  platform={currentPlatform}
                />
              </div>

              {/* Metadata list */}
              <div className="space-y-2 rounded-xl bg-[#0c1220]/70 border border-[#1a243a] p-3 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Globe className="h-3 w-3 text-slate-500" />
                    可用地区
                  </span>
                  <span className="truncate max-w-[200px] font-medium text-right text-[11px]">
                    {currentOffer.regionRestrictions.length === 0 ? '全球可用' : currentOffer.regionRestrictions.join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Zap className="h-3 w-3 text-slate-500" />
                    包含内容
                  </span>
                  <span className="truncate max-w-[200px] font-medium text-right text-[11px]">
                    {currentOffer.models.length ? currentOffer.models.slice(0, 2).join(', ') : '完整高级功能与权益'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    截止时效
                  </span>
                  <span className={cn(
                    'font-medium text-right text-[11px]',
                    currentOffer.endAt && daysUntil(currentOffer.endAt)! <= 3 ? 'text-amber-400 font-bold' : 'text-slate-300'
                  )}>
                    {currentOffer.endAt ? `${fmtDate(currentOffer.endAt)} 截止` : '长期有效'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Hint */}
            <div className="pt-2 border-t border-[#182338] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <ArrowLeft className="h-3 w-3 text-rose-400" />
                左滑忽略
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectOffer({ offer: currentOffer, platform: currentPlatform });
                }}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                查看完整证据与API
                <ChevronRight className="h-3 w-3" />
              </button>
              <span className="flex items-center gap-1 text-slate-400">
                右滑收藏
                <ArrowRight className="h-3 w-3 text-emerald-400" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reigns Arcade Action Controls */}
      <div className="mt-6 flex items-center justify-center gap-4">
        {/* Undo Button */}
        <button
          type="button"
          disabled={history.length === 0}
          onClick={undoLast}
          aria-label="撤销上一张 (Z)"
          title="撤销上一张卡片 (快捷键: Z / Backspace)"
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all cursor-pointer hover:scale-110 active:scale-95',
            history.length > 0
              ? 'border-[#223352] bg-[#111a2e] text-slate-300 hover:text-white hover:border-blue-500'
              : 'border-[#172236] bg-[#0c1220] text-slate-600 cursor-not-allowed opacity-50'
          )}
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        {/* Pass (Swipe Left) Button */}
        <button
          type="button"
          onClick={() => triggerSwipe('left')}
          aria-label="向左滑：暂不考虑 (A / ←)"
          title="向左滑：暂不考虑 (快捷键: A / ←)"
          className="group flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-rose-900/30 text-rose-400 shadow-xl shadow-rose-950/30 hover:border-rose-400 hover:text-rose-200 transition-all cursor-pointer hover:scale-110 active:scale-95"
        >
          <X className="h-7 w-7 transition-transform group-hover:rotate-90" />
        </button>

        {/* Inspect / Detail Drawer Button */}
        <button
          type="button"
          onClick={() => {
            if (currentOffer && currentPlatform) {
              setInspectOffer({ offer: currentOffer, platform: currentPlatform });
            }
          }}
          aria-label="查看活动详情 (空格 / 回车)"
          title="查看完整技术指标与代码示例 (快捷键: 空格 / 回车)"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-[#101b33] text-blue-400 shadow-lg hover:border-blue-400 hover:text-blue-200 transition-all cursor-pointer hover:scale-110 active:scale-95"
        >
          <Info className="h-5 w-5" />
        </button>

        {/* Bookmark / Star (Swipe Right) Button */}
        <button
          type="button"
          onClick={() => triggerSwipe('right')}
          aria-label="向右滑：收藏领取 (D / →)"
          title="向右滑：收藏领取 (快捷键: D / →)"
          className="group flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-emerald-900/30 text-emerald-400 shadow-xl shadow-emerald-950/30 hover:border-emerald-400 hover:text-emerald-200 transition-all cursor-pointer hover:scale-110 active:scale-95"
        >
          <Star className="h-7 w-7 transition-transform group-hover:scale-125" />
        </button>
      </div>

      {/* Keyboard Shortcuts Guide Footnote */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
        <span>键盘快捷键:</span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">←</kbd> 或 <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">A</kbd> 忽略
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">→</kbd> 或 <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">D</kbd> 收藏
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">Space</kbd> 详情
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[10px] text-slate-400">Z</kbd> 撤销
        </span>
      </div>

      {/* Detail Dialog */}
      {inspectOffer && (
        <OfferDetailDialog
          offer={inspectOffer.offer}
          platform={inspectOffer.platform}
          open={!!inspectOffer}
          onOpenChange={(open) => {
            if (!open) setInspectOffer(null);
          }}
        />
      )}
    </div>
  );
}
