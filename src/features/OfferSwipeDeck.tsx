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
import { withBase } from '@/lib/utils/url';
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
  const [history, setHistory] = useState<Array<{ index: number; offer: Offer; action: 'pass' | 'bookmark' }>>([]);
  const [inspectOffer, setInspectOffer] = useState<{ offer: Offer; platform: Platform } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Drag State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { isFavorite, toggleFavorite, toggleClaim } = usePersonal();

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
    // If swiped left, mark it as 'ignored' (Pass) and persist to cloud
    if (direction === 'left') {
      toggleClaim(targetOffer.id, 'ignored');
    }

    setTimeout(() => {
      setHistory((prev) => [
        ...prev,
        {
          index: currentIndex,
          offer: targetOffer,
          action: direction === 'right' ? 'bookmark' : 'pass',
        },
      ]);
      setCurrentIndex((prev) => prev + 1);
      setDragOffset({ x: 0, y: 0 });
      setExitDirection(null);
    }, 280);
  }, [currentIndex, offers, soundEnabled, isFavorite, toggleFavorite, toggleClaim]);

  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    if (!last) return;
    if (soundEnabled) playTone('undo');

    // Revert the action
    if (last.action === 'bookmark' && isFavorite(last.offer.id)) {
      toggleFavorite(last.offer.id);
    } else if (last.action === 'pass') {
      toggleClaim(last.offer.id, null);
    }

    setHistory((prev) => prev.slice(0, prev.length - 1));
    setCurrentIndex(last.index);
    setDragOffset({ x: 0, y: 0 });
    setExitDirection(null);
  }, [history, soundEnabled, isFavorite, toggleFavorite, toggleClaim]);

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
      <div className="relative mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border border-border bg-card p-6 sm:p-8 text-center shadow-xs">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted border border-border text-foreground">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>

        <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
          🎉 本轮雷达卡片已全部探索完毕！
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          你已完成全部 <span className="font-medium text-foreground">{offers.length}</span> 个 AI 资源的决策，共收藏加星了 <span className="font-semibold text-ok">{bookmarkedCount}</span> 个限免福利。
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
            className="flex items-center gap-1.5 rounded-md bg-foreground text-background hover:bg-foreground/90 px-4 py-2 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重新洗牌探索
          </button>
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
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center select-none pt-1 pb-4">
      {/* Top Controller Header */}
      <div className="flex w-full items-center justify-between px-2 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-foreground text-xs font-medium">
            <Flame className="h-3 w-3 text-warn" />
            王权探索模式
          </span>
          <span className="text-xs font-mono">
            {currentIndex + 1} / {offers.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block h-1.5 w-20 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / offers.length) * 100}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={soundEnabled ? '音效开启' : '音效关闭'}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* 3D Stack Container: 响应式高度适配移动端 */}
      <div className="relative h-[465px] sm:h-[505px] w-full max-w-[390px] sm:max-w-[420px] perspective-[1000px] flex items-center justify-center">
        {/* Layer 3: Deep Background Card */}
        {nextOffer2 && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl border border-border bg-card/50 p-4 opacity-40 shadow-xs transition-all duration-300"
            style={{
              transform: 'scale(0.9) translateY(24px)',
              zIndex: 10,
            }}
          />
        )}

        {/* Layer 2: Next Card In Line */}
        {nextOffer1 && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl border border-border bg-card/80 p-4 opacity-80 shadow-xs transition-all duration-300"
            style={{
              transform: `scale(${0.95 + Math.min(Math.abs(dragOffset.x) / 1200, 0.04)}) translateY(${14 - Math.min(Math.abs(dragOffset.x) / 30, 10)}px)`,
              zIndex: 20,
            }}
          >
            <div className="flex items-center justify-between opacity-50 mb-2">
              <span className="text-[11px] font-medium text-muted-foreground">下一张预备</span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{nextOffer1.title}</span>
            </div>
          </div>
        )}

        {/* Layer 1: Active Interactive Top Card */}
        {currentOffer && currentPlatform && (
          <article
            ref={cardRef}
            role="article"
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
              'absolute inset-0 flex flex-col justify-between rounded-xl border bg-card p-4 sm:p-5 shadow-xs cursor-grab active:cursor-grabbing select-none transition-colors',
              dragOffset.x > 30 ? 'border-ok/60' : dragOffset.x < -30 ? 'border-bad/60' : 'border-border'
            )}
          >
            {/* Notion Decision Tags Overlays */}
            <div
              className="pointer-events-none absolute left-4 top-4 z-40 rounded-md border border-ok bg-card/95 px-3 py-1 text-xs font-semibold tracking-wide text-ok shadow-sm -rotate-6 transition-opacity"
              style={{ opacity: bookmarkOpacity }}
            >
              ⭐️ 收藏领取 (KEEP)
            </div>

            <div
              className="pointer-events-none absolute right-4 top-4 z-40 rounded-md border border-bad bg-card/95 px-3 py-1 text-xs font-semibold tracking-wide text-bad shadow-sm rotate-6 transition-opacity"
              style={{ opacity: passOpacity }}
            >
              ✕ 暂不考虑 (PASS)
            </div>

            {/* Top Header */}
            <div>
              <div className="flex items-center justify-between gap-2.5 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border">
                    <BrandLogo
                      platformId={currentPlatform.id}
                      platformName={currentPlatform.name}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={withBase(`/platforms/${currentPlatform.slug}/`)}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-foreground hover:underline text-xs sm:text-sm block truncate"
                    >
                      {currentPlatform.name}
                    </a>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {currentPlatform.canonicalDomain}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {currentOffer.verificationStatus === 'official' && (
                    <span className="rounded bg-muted border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      官方
                    </span>
                  )}
                  {isWithinDays(currentOffer.discoveredAt, 7) && (
                    <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      NEW
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(currentOffer.id);
                    }}
                    aria-label={isFavorite(currentOffer.id) ? '取消收藏' : '收藏'}
                    title={isFavorite(currentOffer.id) ? '取消收藏' : '加入收藏'}
                    className="p-1 rounded text-muted-foreground hover:text-warn transition-colors cursor-pointer"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        isFavorite(currentOffer.id)
                          ? 'fill-warn text-warn'
                          : 'text-muted-foreground'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Title & Tagline */}
              <h4 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 mb-1">
                {currentOffer.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2.5">
                {currentOffer.claimConditions[0] ?? currentPlatform.description ?? '限时免费体验官方核心权益'}
              </p>

              {/* Tag Chips Row */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  {currentOffer.claimConditions.some((c) => /新注册|新用户/i.test(c)) ? '新用户' : '全员可用'}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-ok">
                  <Zap className="h-3 w-3" />
                  {currentOffer.amount !== null && currentOffer.amount !== undefined
                    ? fmtAmount(currentOffer.amount, currentOffer.unit)
                    : currentOffer.amountType === 'daily'
                    ? '每日限免'
                    : '免费体验'}
                </span>
                {currentOffer.billingRequirements === 'none' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    无需信用卡
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-warn">
                    <CreditCard className="h-3 w-3" />
                    需绑卡
                  </span>
                )}
              </div>

              {/* Brand Showcase Banner */}
              <div className="mb-2.5">
                <BrandBanner
                  offer={currentOffer}
                  platform={currentPlatform}
                />
              </div>

              {/* Metadata list */}
              <div className="space-y-1.5 rounded-lg bg-muted/40 border border-border p-2.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] flex items-center gap-1">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    可用地区
                  </span>
                  <span className="truncate max-w-[180px] font-medium text-right text-foreground text-[11px]">
                    {currentOffer.regionRestrictions.length === 0 ? '全球可用' : currentOffer.regionRestrictions.join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] flex items-center gap-1">
                    <Zap className="h-3 w-3 text-muted-foreground" />
                    包含内容
                  </span>
                  <span className="truncate max-w-[180px] font-medium text-right text-foreground text-[11px]">
                    {currentOffer.models.length ? currentOffer.models.slice(0, 2).join(', ') : '完整高级功能与权益'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    截止时效
                  </span>
                  <span className={cn(
                    'font-medium text-right text-[11px]',
                    currentOffer.endAt && daysUntil(currentOffer.endAt)! <= 3 ? 'text-warn font-semibold' : 'text-foreground'
                  )}>
                    {currentOffer.endAt ? `${fmtDate(currentOffer.endAt)} 截止` : '长期有效'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Action Hint */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ArrowLeft className="h-3 w-3 text-bad" />
                左滑忽略
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectOffer({ offer: currentOffer, platform: currentPlatform });
                }}
                className="inline-flex items-center gap-1 text-foreground hover:underline font-medium cursor-pointer"
              >
                查看完整信息
                <ChevronRight className="h-3 w-3" />
              </button>
              <span className="flex items-center gap-1">
                右滑收藏
                <ArrowRight className="h-3 w-3 text-ok" />
              </span>
            </div>
          </article>
        )}
      </div>

      {/* Reigns Action Controls (Notion 极简工具栏) */}
      <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
        {/* Undo Button */}
        <button
          type="button"
          disabled={history.length === 0}
          onClick={undoLast}
          aria-label="撤销上一张 (Z)"
          title="撤销上一张卡片 (快捷键: Z / Backspace)"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md border shadow-xs transition-colors cursor-pointer',
            history.length > 0
              ? 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'border-border/60 bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
          )}
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Pass (Swipe Left) Button */}
        <button
          type="button"
          onClick={() => triggerSwipe('left')}
          aria-label="向左滑：暂不考虑 (A / ←)"
          title="向左滑：暂不考虑 (快捷键: A / ←)"
          className="flex h-9 px-3.5 items-center justify-center gap-1.5 rounded-md border border-border bg-card text-bad hover:bg-bad-bg/60 text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span>跳过</span>
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
          className="flex h-9 px-3 items-center justify-center gap-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Info className="h-3.5 w-3.5" />
          <span>详情</span>
        </button>

        {/* Bookmark / Star (Swipe Right) Button */}
        <button
          type="button"
          onClick={() => triggerSwipe('right')}
          aria-label="向右滑：收藏领取 (D / →)"
          title="向右滑：收藏领取 (快捷键: D / →)"
          className="flex h-9 px-3.5 items-center justify-center gap-1.5 rounded-md border border-border bg-card text-ok hover:bg-ok-bg/60 text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Star className="h-4 w-4 fill-ok/20" />
          <span>收藏</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Guide Footnote */}
      <div className="mt-3 hidden sm:flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span>键盘快捷键:</span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">←</kbd> 或 <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">A</kbd> 忽略
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">→</kbd> 或 <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">D</kbd> 收藏
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Space</kbd> 详情
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Z</kbd> 撤销
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
