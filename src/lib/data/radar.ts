/**
 * Radar 数据派生统计与"值得立即领取"排序(纯函数, 浏览器/构建端通用)。
 */
import type { Offer, Platform, RadarData, MonitorRun } from './schema';
import { isPast, isWithinDays } from '../utils/format';

export function platformById(data: RadarData, id: string): Platform | undefined {
  return data.platforms.find((p) => p.id === id);
}

export function offersOfPlatform(data: RadarData, platformId: string): Offer[] {
  return data.offers.filter((o) => o.platformId === platformId);
}

export function activeOffers(data: RadarData): Offer[] {
  return data.offers.filter((o) => o.status === 'active');
}

export function validOffers(data: RadarData): Offer[] {
  return data.offers.filter((o) => o.status === 'active' && o.verificationStatus !== 'unverified' && !o.demo);
}

export interface DashboardStats {
  activeOffers: number;
  discovered24h: number;
  discovered7d: number;
  expiringSoon: number; // 14 天内到期
  apiOffers: number;
  clientOffers: number;
  lastSuccessfulSync: string | null;
  lastRunAt: string | null;
  lastRunStatus: MonitorRun['status'] | null;
  unverifiedCount: number;
  demoCount: number;
}

export function computeDashboard(data: RadarData, now = Date.now()): DashboardStats {
  const offers = data.offers;
  const active = offers.filter((o) => o.status === 'active');
  const discovered24h = offers.filter((o) => now - Date.parse(o.discoveredAt) < 24 * 3600_000).length;
  const discovered7d = offers.filter((o) => now - Date.parse(o.discoveredAt) < 7 * 24 * 3600_000).length;
  const expiringSoon = active.filter((o) => {
    if (!o.endAt) return false;
    const t = Date.parse(o.endAt);
    return t > now && t - now < 14 * 24 * 3600_000;
  }).length;
  const latestRun = data.runs
    .filter((r) => r.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!))[0];
  return {
    activeOffers: active.length,
    discovered24h,
    discovered7d,
    expiringSoon,
    apiOffers: active.filter((o) => o.accessType === 'api').length,
    clientOffers: active.filter((o) => o.accessType === 'client').length,
    lastSuccessfulSync: data.lastSuccessfulSync,
    lastRunAt: latestRun?.completedAt ?? null,
    lastRunStatus: latestRun?.status ?? null,
    unverifiedCount: offers.filter((o) => o.verificationStatus === 'unverified').length,
    demoCount: offers.filter((o) => o.demo).length,
  };
}

/**
 * "值得立即领取"排序。
 * 仅在“同单位/同量纲”内比较额度价值 — 不同单位之间不比较(100 Credits ≠ 100万 Tokens)。
 */
export function priorityScore(o: Offer, now = Date.now()): number {
  let score = 0;
  if (o.endAt) {
    const t = Date.parse(o.endAt);
    if (!Number.isNaN(t)) {
      const days = (t - now) / 86_400_000;
      if (days < 0) return -Infinity; // 已到期不参与
      if (days <= 7) score += 80;
      else if (days <= 14) score += 50;
      else if (days <= 30) score += 25;
    }
  }
  if (o.amountType === 'daily' || o.amountType === 'weekly' || o.amountType === 'monthly') score += 15;
  if (o.amountType === 'limited-unlimited') score += 20;
  if (o.models.some((m) => /gpt|gemini|claude|qwen|deepseek|llama|mistral|grok/i.test(m))) score += 12;
  if ((o.contextWindow ?? 0) >= 256_000) score += 10;
  if (o.billingRequirements === 'none') score += 10;
  if (o.verificationStatus === 'official') score += 8;
  if (o.accessType === 'api') score += 6;
  return score;
}

/** 公开数据集合(给前端完整数据) */
export function publicOffers(data: RadarData): Offer[] {
  return data.offers.filter((o) => !isPast(o.endAt) || o.status === 'ended');
}
