/**
 * 业务约束校验(在 Zod Schema 之上)。
 * 返回 errors(阻塞发布)与 warnings(提示但允许发布)。
 */
import type { RadarData } from './schema';
import { canonicalDomain } from './ids';
import { isPast } from '../utils/format';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const AMOUNT_TYPE_TO_RESET: Record<string, string> = {
  'one-time': 'none',
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  'fixed-period': 'periodic',
  'limited-unlimited': 'unlimited',
  unknown: 'unknown',
};

export function validateRadar(data: RadarData, now = Date.now()): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const platformIds = new Set(data.platforms.map((p) => p.id));
  const offerIds = new Set(data.offers.map((o) => o.id));
  const seenIds = (kind: string, ids: Iterable<string>) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${kind} ID 重复: ${id}`);
      seen.add(id);
    }
  };
  seenIds('platform', data.platforms.map((p) => p.id));
  seenIds('offer', data.offers.map((o) => o.id));
  seenIds('event', data.events.map((e) => e.id));
  seenIds('run', data.runs.map((r) => r.id));

  for (const p of data.platforms) {
    if (canonicalDomain(p.websiteUrl) !== p.canonicalDomain) {
      errors.push(`平台 ${p.id}: canonicalDomain (${p.canonicalDomain}) 与 websiteUrl 主机不一致`);
    }
    if (Date.parse(p.firstDiscoveredAt) > Date.parse(p.lastCheckedAt)) {
      errors.push(`平台 ${p.id}: firstDiscoveredAt 晚于 lastCheckedAt`);
    }
    if (p.demo && p.trustStatus === 'official') {
      errors.push(`平台 ${p.id}: demo 数据不得标记为官方确认`);
    }
    if (isPast(p.lastCheckedAt)) warnings.push(`平台 ${p.id}: lastCheckedAt (${p.lastCheckedAt}) 早于当前时间, 数据可能已过期`);
  }

  for (const o of data.offers) {
    if (!platformIds.has(o.platformId)) {
      errors.push(`活动 ${o.id}: 引用了不存在的平台 ${o.platformId}`);
    }
    if (o.unit === 'Unlimited' && o.amount !== null) {
      errors.push(`活动 ${o.id}: 单位 Unlimited 时 amount 必须为 null`);
    }
    if (o.unit === 'Unknown' && o.amount !== null) {
      errors.push(`活动 ${o.id}: 单位 Unknown 时 amount 必须为 null(不能断言额度)`);
    }
    if (o.unit !== 'Unknown' && o.unit !== 'Unlimited' && o.amount === null && o.amountType !== 'unknown') {
      errors.push(`活动 ${o.id}: 有确定单位但无额度数字(amount=null)`);
    }
    const expectedReset = AMOUNT_TYPE_TO_RESET[o.amountType];
    if (expectedReset && o.resetInterval !== expectedReset) {
      errors.push(`活动 ${o.id}: amountType=${o.amountType} 与 resetInterval=${o.resetInterval} 不一致`);
    }
    if (o.startAt && o.endAt && Date.parse(o.startAt) > Date.parse(o.endAt)) {
      errors.push(`活动 ${o.id}: startAt 晚于 endAt`);
    }
    if (o.creditExpiresAt && o.startAt && Date.parse(o.creditExpiresAt) < Date.parse(o.startAt)) {
      errors.push(`活动 ${o.id}: creditExpiresAt 早于 startAt`);
    }
    if (o.status === 'active' && o.endAt && isPast(o.endAt)) {
      warnings.push(`活动 ${o.id}: 状态为 active 但 endAt (${o.endAt}) 已过期, 需核验状态`);
    }
    if (o.demo && o.verificationStatus === 'official') {
      errors.push(`活动 ${o.id}: demo 数据不得标记为官方确认`);
    }
    if (Date.parse(o.discoveredAt) > Date.parse(o.lastVerifiedAt)) {
      errors.push(`活动 ${o.id}: discoveredAt 晚于 lastVerifiedAt`);
    }
    for (const s of o.sources) {
      if (s.kind === 'official' && o.verificationStatus === 'unverified') {
        warnings.push(`活动 ${o.id}: verificationStatus=待核实 但包含官方来源, 建议核实后更新状态`);
      }
    }
  }

  for (const e of data.events) {
    if (e.offerId && !offerIds.has(e.offerId)) {
      errors.push(`事件 ${e.id}: 引用了不存在的活动 ${e.offerId}`);
    }
    if (e.platformId && !platformIds.has(e.platformId)) {
      errors.push(`事件 ${e.id}: 引用了不存在的平台 ${e.platformId}`);
    }
  }

  for (const r of data.runs) {
    if (r.status === 'success' && !r.completedAt) {
      errors.push(`运行 ${r.id}: status=success 但缺少 completedAt(真实完成时间)`);
    }
    if (r.status === 'success' && (!r.searchACompleted || !r.searchBCompleted)) {
      errors.push(`运行 ${r.id}: success 必须同时完成 A/B 两类搜索`);
    }
    if (r.completedAt && Date.parse(r.completedAt) < Date.parse(r.startedAt)) {
      errors.push(`运行 ${r.id}: completedAt 早于 startedAt`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
