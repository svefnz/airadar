#!/usr/bin/env node
/**
 * 从 Supabase 数据库拉取最新公共雷达数据并同步到本地 data/radar.json。
 * - 解决静态构建（Astro getStaticPaths）新平台页面无法自动渲染的问题
 * - 将 lastSuccessfulSync 自动与数据库中最新成功的 monitor_runs.completed_at 绑定
 * - 本地没有 Supabase 配置时安全跳过，回退保留本地 radar.json
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RadarData } from '../src/lib/data/schema';
import { radarSchema, SCHEMA_VERSION } from '../src/lib/data/schema';

// 优先读取本地 .env
if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('ℹ️ 未检测到 Supabase 环境变量，跳过远程同步，沿用本地 data/radar.json');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/**
 * 分页拉取数据表全量行，避免受 Supabase / PostgREST 默认 1000 行上限截断
 */
async function fetchAllRows<T = any>(
  client: SupabaseClient,
  table: string,
  orderColumn: string,
  ascending = true,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error, count } = await client
      .from(table)
      .select('*', { count: 'exact' })
      .order(orderColumn, { ascending })
      .range(from, to);

    if (error) {
      throw new Error(`拉取表 ${table} (range ${from}-${to}) 失败: ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }
    allRows.push(...(data as T[]));
    if (count !== null && allRows.length >= count) {
      break;
    }
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }
  return allRows;
}

async function sync() {
  console.log('📡 正在从 Supabase 拉取最新公共雷达数据 (带自动分页)...');

  const [rawPlatforms, rawOffers, rawEvents, rawRuns] = await Promise.all([
    fetchAllRows(supabase, 'platforms', 'name', true),
    fetchAllRows(supabase, 'offers', 'discovered_at', false),
    fetchAllRows(supabase, 'radar_events', 'timestamp', true),
    fetchAllRows(supabase, 'monitor_runs', 'started_at', true),
  ]);

  console.log(
    `✅ 成功拉取：${rawPlatforms.length} 个平台、${rawOffers.length} 项权益、${rawEvents.length} 条事件、${rawRuns.length} 次监控记录`
  );

  const platforms = (rawPlatforms || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    canonicalDomain: p.canonical_domain,
    websiteUrl: p.website_url,
    description: p.description || '',
    category: p.category,
    launchDate: p.launch_date || undefined,
    firstDiscoveredAt: p.first_discovered_at,
    lastCheckedAt: p.last_checked_at,
    trustStatus: p.trust_status,
    logoUrl: p.logo_url || undefined,
    demo: p.demo || undefined,
  }));

  const offers = (rawOffers || []).map((o) => ({
    id: o.id,
    platformId: o.platform_id,
    title: o.title,
    models: o.models || [],
    accessType: o.access_type,
    amount: o.amount !== null ? Number(o.amount) : null,
    unit: o.unit,
    amountType: o.amount_type,
    resetInterval: o.reset_interval,
    claimConditions: o.claim_conditions || [],
    billingRequirements: o.billing_requirements,
    identityVerification: o.identity_verification,
    regionRestrictions: o.region_restrictions || [],
    rateLimits: o.rate_limits || '',
    contextWindow: o.context_window !== null ? Number(o.context_window) : null,
    toolCalling: o.tool_calling !== null ? Boolean(o.tool_calling) : null,
    apiCompatibility: o.api_compatibility,
    startAt: o.start_at || undefined,
    endAt: o.end_at || undefined,
    creditExpiresAt: o.credit_expires_at || undefined,
    status: o.status,
    verificationStatus: o.verification_status,
    discoveredAt: o.discovered_at,
    lastVerifiedAt: o.last_verified_at,
    officialUrl: o.official_url || undefined,
    sources: o.sources || [],
    demo: o.demo || undefined,
  }));

  const events = (rawEvents || []).map((e) => ({
    id: e.id,
    offerId: e.offer_id || null,
    platformId: e.platform_id || undefined,
    eventType: e.event_type,
    timestamp: e.timestamp,
    field: e.field || undefined,
    previousValue: e.previous_value || null,
    currentValue: e.current_value || null,
    sources: e.sources || [],
    description: e.description || '',
  }));

  const runs = (rawRuns || []).map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    completedAt: r.completed_at || undefined,
    status: r.status,
    searchACompleted: !!r.search_a_completed,
    searchBCompleted: !!r.search_b_completed,
    sourcesChecked: Number(r.sources_checked || 0),
    candidatesFound: Number(r.candidates_found || 0),
    offersCreated: Number(r.offers_created || 0),
    offersUpdated: Number(r.offers_updated || 0),
    offersExpired: Number(r.offers_expired || 0),
    errors: r.errors || [],
    repositoryCommit: r.repository_commit || undefined,
    note: r.note || undefined,
  }));

  // 可靠派生 lastSuccessfulSync：从最新成功的监控运行中取 completedAt (按 completedAt 降序排，选取最新完成时间)
  const successRuns = runs
    .filter((r) => r.status === 'success' && r.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
  const lastSuccessfulSync = successRuns[0]?.completedAt || null;

  const radarData: RadarData = {
    schemaVersion: SCHEMA_VERSION,
    lastSuccessfulSync,
    platforms,
    offers,
    events,
    runs,
  };

  // 严格 Schema 校验
  const parsed = radarSchema.parse(radarData);

  // 原子性写回
  const outPath = 'data/radar.json';
  const tmp = `${outPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n');
  renameSync(tmp, outPath);

  console.log(
    `✅ 成功从 Supabase 同步: ${platforms.length} 平台, ${offers.length} 活动, ${events.length} 事件, ${runs.length} 监控记录`
  );
  if (lastSuccessfulSync) {
    console.log(`⏱️ 最新有效同步时间: ${lastSuccessfulSync}`);
  }
}

sync().catch((err) => {
  console.error(`❌ 同步异常终止: ${err.message}`);
  process.exit(1);
});
