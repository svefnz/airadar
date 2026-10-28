/**
 * 稳定 ID 与去重。
 * 平台 ID = slug(stable), 活动 ID = `${platformSlug}:${base36(fnv1a(key))}`。
 * key 由"平台域名 + 活动名 + 模型 + 权益类型 + 单位 + 渠道 + 地区 + 周期"规范化拼接,
 * 同一活动任何时刻生成相同 ID; 不同首发促销与长期免费套餐因权益类型/渠道不同而不同。
 */

/** FNV-1a 32bit, 确定性散列 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function toBase36(n: number): string {
  return n.toString(36);
}

/** slug 化:小写、去重字符、连字符 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function canonicalDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export interface OfferIdentityInput {
  platformDomain: string;
  title: string;
  models?: string[];
  accessType: string;
  unit?: string;
  channel?: string; // 领取渠道: 如 "注册", "签到", "客户端"
  region?: string;
  period?: string; // 活动周期: 如 "2025-Q3", "monthly"
}

/** 规范化令牌:字母序、去空白、小写, 保证稳定 */
function normalizeTokens(items: string[]): string {
  return [...new Set(items.map((s) => s.toLowerCase().replace(/\s+/g, '').trim()).filter(Boolean))]
    .sort()
    .join(',');
}

export function offerDedupeKey(input: OfferIdentityInput): string {
  return [
    canonicalDomain(input.platformDomain),
    normalizeTokens([input.title]),
    normalizeTokens(input.models ?? []),
    input.accessType,
    input.unit ?? 'unknown',
    normalizeTokens([input.channel ?? 'unknown']),
    normalizeTokens([input.region ?? '']),
    normalizeTokens([input.period ?? '']),
  ].join('|');
}

/** 生成稳定活动 ID */
export function createOfferId(platformSlug: string, key: string): string {
  return `${platformSlug}:${toBase36(fnv1a(key))}`;
}

export function createEventId(salt: string): string {
  return `ev_${toBase36(fnv1a(salt))}`;
}

export function createRunId(timestamp: string): string {
  return `run_${toBase36(fnv1a(timestamp))}`;
}
