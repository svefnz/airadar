/**
 * 增量合并引擎: 将 ChatGPT 自动化任务的补丁(patch)幂等应用到现有 radar.json。
 * 幂等性: 同一补丁重复执行两次不会产生重复活动、重复事件或重复运行记录。
 * 冲突处理: patch 以"最新读取的数据"为基线; 若重新读取后基线变化, 重新合并。
 *
 * 原则:
 * - 已有平台: 只补字段, 不覆盖 firstDiscoveredAt / 既有来源
 * - 已有活动: 按字段 diff 生成 ChangeEvent, 不新建重复活动
 * - 新活动: 先用去重指纹匹配, 匹配到则更新, 否则新建
 * - 事件/运行: 相同指纹跳过, 保证幂等
 */
import type { ChangeEvent, MonitorRun, Offer, OfferPatch, Platform, RadarData, RadarPatch, Source } from './schema';
import { SCHEMA_VERSION } from './schema';
import { canonicalDomain, createEventId, createOfferId, offerDedupeKey, slugify } from './ids';
import { validateRadar } from './validate';
import { EVENT_TYPE_LABELS } from './enums';

export interface MergeSummary {
  platformsAdded: number;
  offersCreated: number;
  offersUpdated: number;
  offersEnded: number;
  eventsAdded: number;
  runsAdded: number;
}

const MAX_RUNS = 500;

/** 跟踪变更的字段及其事件类型映射 */
const TRACKED_FIELDS: Record<string, string> = {
  amount: 'amount-changed',
  unit: 'amount-changed',
  amountType: 'amount-changed',
  resetInterval: 'amount-changed',
  status: 'status-changed',
  endAt: 'deadline-extended',
  creditExpiresAt: 'deadline-extended',
  models: 'model-changed',
  accessType: 'conditions-changed',
  billingRequirements: 'conditions-changed',
  identityVerification: 'conditions-changed',
  regionRestrictions: 'conditions-changed',
  apiCompatibility: 'conditions-changed',
  contextWindow: 'conditions-changed',
  toolCalling: 'conditions-changed',
  claimConditions: 'conditions-changed',
  title: 'conditions-changed',
  officialUrl: 'conditions-changed',
};

function val(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map(String).sort().join(', ');
  return String(v);
}

function sourceFingerprint(s: Source): string {
  return `${s.url}|${s.label}|${s.kind}`;
}

function mergeSources(existing: Source[], incoming: Source[]): Source[] {
  const known = new Set(existing.map(sourceFingerprint));
  const merged = [...existing];
  for (const s of incoming) {
    if (!known.has(sourceFingerprint(s))) {
      merged.push(s);
      known.add(sourceFingerprint(s));
    }
  }
  return merged;
}

function upsertPlatform(data: RadarData, patch: Platform, now: string, summary: MergeSummary): void {
  const existing = data.platforms.find((p) => p.id === patch.id);
  if (existing) {
    // 补充字段, 不覆盖关键历史
    if (!existing.launchDate && patch.launchDate) existing.launchDate = patch.launchDate;
    if (patch.description && !existing.description) existing.description = patch.description;
    existing.lastCheckedAt = now;
    if (patch.trustStatus !== 'unverified') existing.trustStatus = patch.trustStatus;
    return;
  }
  const platform: Platform = {
    ...patch,
    firstDiscoveredAt: patch.firstDiscoveredAt || now,
    lastCheckedAt: now,
    id: patch.id || slugify(patch.name),
    slug: patch.slug || slugify(patch.name),
    canonicalDomain: patch.canonicalDomain || canonicalDomain(patch.websiteUrl),
  };
  data.platforms.push(platform);
  data.events.push(makeEvent(data, null, 'platform-added', now, 'platformId', '', platform.id, [], `发现新平台 ${platform.name}`, platform.id));
  summary.platformsAdded++;
}

function eventForField(data: RadarData, offer: Offer, field: string, prev: unknown, cur: unknown, now: string, sources: Source[]): ChangeEvent | null {
  if (val(prev) === val(cur)) return null;
  const kind = TRACKED_FIELDS[field] ?? 'status-changed';
  const desc = `活动「${offer.title}」${field} 由「${val(prev) || '未确认'}」变为「${val(cur) || '未确认'}」`;
  return makeEvent(data, offer.id, kind, now, field, val(prev), val(cur), sources, desc, offer.platformId);
}

function makeEvent(
  data: RadarData,
  offerId: string | null,
  eventType: string,
  now: string,
  field: string,
  prev: string,
  cur: string,
  sources: Source[],
  description: string,
  platformId?: string,
): ChangeEvent {
  const e: ChangeEvent = {
    id: createEventId(`${now}|${eventType}|${offerId ?? ''}|${field}|${prev}|${cur}`),
    offerId,
    platformId,
    eventType: eventType as ChangeEvent['eventType'],
    timestamp: now,
    field,
    previousValue: prev,
    currentValue: cur,
    sources,
    description,
  };
  return e;
}

function dedupeOffer(data: RadarData, patch: OfferPatch): Offer | undefined {
  const platform = data.platforms.find((p) => p.id === patch.platformId);
  if (!platform) return undefined;
  const key = offerDedupeKey({
    platformDomain: platform.canonicalDomain,
    title: (patch.title as string) ?? '',
    models: patch.models,
    accessType: (patch.accessType as string) ?? 'unknown',
    unit: patch.unit,
    channel: patch.claimConditions?.[0],
  });
  return data.offers.find((o) => o.platformId === patch.platformId && offerDedupeKey({
    platformDomain: platform.canonicalDomain,
    title: o.title,
    models: o.models,
    accessType: o.accessType,
    unit: o.unit,
    channel: o.claimConditions?.[0],
  }) === key);
}

function applyOfferPatch(data: RadarData, patch: OfferPatch, now: string, summary: MergeSummary): void {
  const platform = data.platforms.find((p) => p.id === patch.platformId);
  if (!platform) throw new Error(`patch 引用了不存在的平台: ${patch.platformId}`);

  let existing = patch.id ? data.offers.find((o) => o.id === patch.id) : undefined;
  if (!existing) existing = dedupeOffer(data, patch);
  const sources = patch.sources ?? [];

  if (existing) {
    let changed = false;
    for (const field of Object.keys(TRACKED_FIELDS) as (keyof Offer)[]) {
      if (!(field in patch) || patch[field] === undefined) continue;
      if (field === 'status') {
        const prev = existing.status;
        const cur = patch.status as Offer['status'];
        if (prev !== cur) {
          const kind = prev === 'ended' && cur === 'active' ? 'offer-resumed' : prev === 'active' && cur === 'ended' ? 'offer-ended' : 'status-changed';
          data.events.push(makeEvent(data, existing.id, kind, now, 'status', prev, cur, sources, `活动「${existing.title}」状态 ${prev} → ${cur}`, existing.platformId));
          existing.status = cur;
          changed = true;
        }
        continue;
      }
      const prev = existing[field] as unknown;
      const cur = patch[field] as unknown;
      if (val(prev) !== val(cur)) {
        const ev = eventForField(data, existing, field, prev, cur, now, sources);
        if (ev) data.events.push(ev);
        (existing as Record<string, unknown>)[field] = cur;
        changed = true;
      }
    }
    const hadSources = existing.sources.length;
    existing.sources = mergeSources(existing.sources, sources);
    const sourcesAdded = existing.sources.length > hadSources;
    if (changed || sourcesAdded) {
      existing.lastVerifiedAt = now;
      summary.offersUpdated++;
    }
    return;
  }

  // 新建
  if (!patch.title) throw new Error(`创建活动缺少 title (platformId=${patch.platformId})`);
  const key = offerDedupeKey({
    platformDomain: platform.canonicalDomain,
    title: (patch.title as string) ?? '',
    models: patch.models,
    accessType: (patch.accessType as string) ?? 'unknown',
    unit: patch.unit,
    channel: patch.claimConditions?.[0],
  });
  const offer: Offer = {
    id: createOfferId(platform.slug, key),
    platformId: patch.platformId,
    title: patch.title as string,
    models: patch.models ?? [],
    accessType: (patch.accessType as Offer['accessType']) ?? 'unknown',
    amount: patch.amount ?? null,
    unit: (patch.unit as Offer['unit']) ?? 'Unknown',
    amountType: (patch.amountType as Offer['amountType']) ?? 'unknown',
    resetInterval: (patch.resetInterval as Offer['resetInterval']) ?? 'unknown',
    claimConditions: patch.claimConditions ?? [],
    billingRequirements: (patch.billingRequirements as Offer['billingRequirements']) ?? 'unknown',
    identityVerification: (patch.identityVerification as Offer['identityVerification']) ?? 'unknown',
    regionRestrictions: patch.regionRestrictions ?? [],
    rateLimits: patch.rateLimits ?? '',
    contextWindow: patch.contextWindow,
    toolCalling: patch.toolCalling,
    apiCompatibility: (patch.apiCompatibility as Offer['apiCompatibility']) ?? 'unknown',
    startAt: patch.startAt,
    endAt: patch.endAt,
    creditExpiresAt: patch.creditExpiresAt,
    status: (patch.status as Offer['status']) ?? 'active',
    verificationStatus: (patch.verificationStatus as Offer['verificationStatus']) ?? 'unverified',
    discoveredAt: patch.discoveredAt ?? now,
    lastVerifiedAt: now,
    officialUrl: patch.officialUrl,
    sources: mergeSources([], sources),
    demo: patch.demo,
  };
  data.offers.push(offer);
  data.events.push(makeEvent(data, offer.id, 'offer-created', now, 'status', '', 'active', sources, `新增活动「${offer.title}」(${EVENT_TYPE_LABELS['offer-created']})`, platform.id));
  summary.offersCreated++;
}

function applyEnd(data: RadarData, patch: { offerId: string; reason: string; timestamp: string; sources: Source[] }, summary: MergeSummary): void {
  const offer = data.offers.find((o) => o.id === patch.offerId);
  if (!offer) throw new Error(`end 引用了不存在的活动: ${patch.offerId}`);
  if (offer.status === 'ended' && offer.endAt && Date.parse(offer.endAt) <= Date.parse(patch.timestamp)) return; // 幂等
  const prev = offer.status;
  offer.status = 'ended';
  if (!offer.endAt) offer.endAt = patch.timestamp;
  offer.lastVerifiedAt = patch.timestamp;
  offer.sources = mergeSources(offer.sources, patch.sources);
  data.events.push(makeEvent(data, offer.id, 'offer-ended', patch.timestamp, 'status', prev, 'ended', patch.sources, `活动「${offer.title}」已结束${patch.reason ? `: ${patch.reason}` : ''}`, offer.platformId));
  summary.offersEnded++;
}

function applyRun(data: RadarData, run: MonitorRun, summary: MergeSummary): void {
  const idx = data.runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) data.runs[idx] = run;
  else {
    data.runs.push(run);
    summary.runsAdded++;
  }
  if (run.status === 'success' && run.completedAt) {
    data.lastSuccessfulSync = run.completedAt;
  }
  // 限制运行日志增长, 保留最近 MAX_RUNS 条
  if (data.runs.length > MAX_RUNS) data.runs.splice(0, data.runs.length - MAX_RUNS);
}

function dedupeEvents(events: ChangeEvent[]): ChangeEvent[] {
  const seen = new Set<string>();
  const out: ChangeEvent[] = [];
  for (const e of events) {
    const fp = `${e.timestamp}|${e.eventType}|${e.offerId ?? ''}|${e.field ?? ''}|${e.previousValue ?? ''}|${e.currentValue ?? ''}`;
    if (!seen.has(fp)) {
      seen.add(fp);
      out.push(e);
    }
  }
  return out;
}

/**
 * 应用补丁。返回合并后的完整数据和统计。
 * @throws 任何输入/结果校验失败时抛出, 不写入任何文件。
 */
export function applyPatch(current: RadarData, patch: RadarPatch, now?: string): { data: RadarData; summary: MergeSummary } {
  const at = now ?? patch.generatedAt;
  const baseline = validateRadar(current);
  if (!baseline.ok) {
    throw new Error(`基线数据非法, 拒绝合并:\n  ${baseline.errors.join('\n  ')}`);
  }
  if (patch.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`补丁 schemaVersion=${patch.schemaVersion} 与当前 ${SCHEMA_VERSION} 不匹配`);
  }

  const data: RadarData = {
    schemaVersion: SCHEMA_VERSION,
    lastSuccessfulSync: current.lastSuccessfulSync,
    platforms: current.platforms.map((p) => ({ ...p })),
    offers: current.offers.map((o) => ({ ...o, sources: [...o.sources] })),
    events: current.events.map((e) => ({ ...e, sources: [...e.sources] })),
    runs: current.runs.map((r) => ({ ...r })),
  };
  const summary: MergeSummary = { platformsAdded: 0, offersCreated: 0, offersUpdated: 0, offersEnded: 0, eventsAdded: 0, runsAdded: 0 };

  for (const p of patch.platforms) upsertPlatform(data, p, at, summary);
  for (const o of patch.upserts) applyOfferPatch(data, o, at, summary);
  for (const end of patch.ends) applyEnd(data, end, summary);
  for (const e of patch.events) {
    if (!data.events.some((x) => x.id === e.id)) {
      data.events.push({ ...e, sources: [...e.sources] });
      summary.eventsAdded++;
    }
  }
  for (const r of patch.runs) applyRun(data, r, summary);

  data.events = dedupeEvents(data.events);

  const result = validateRadar(data);
  if (!result.ok) {
    throw new Error(`合并结果校验失败, 已回滚(未写入):\n  ${result.errors.join('\n  ')}`);
  }
  return { data, summary };
}
