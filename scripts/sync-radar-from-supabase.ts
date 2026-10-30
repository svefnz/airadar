#!/usr/bin/env node
/**
 * 从 Supabase 数据库拉取最新公共雷达数据并同步到本地 data/radar.json。
 * - 解决静态构建（Astro getStaticPaths）新平台页面无法自动渲染的问题
 * - 将 lastSuccessfulSync 自动与数据库中最新成功的 monitor_runs.completed_at 绑定
 * - 本地没有 Supabase 配置时安全跳过，回退保留本地 radar.json
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
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

async function sync() {
  console.log('📡 正在从 Supabase 拉取最新公共雷达数据...');

  const [platformsRes, offersRes, eventsRes, runsRes] = await Promise.all([
    supabase.from('platforms').select('*').order('name'),
    supabase.from('offers').select('*').order('discovered_at', { ascending: false }),
    supabase.from('radar_events').select('*').order('timestamp', { ascending: true }),
    supabase.from('monitor_runs').select('*').order('started_at', { ascending: true }),
  ]);

  if (platformsRes.error) {
    throw new Error(`拉取 platforms 失败: ${platformsRes.error.message}`);
  }
  if (offersRes.error) {
    throw new Error(`拉取 offers 失败: ${offersRes.error.message}`);
  }
  if (eventsRes.error) {
    throw new Error(`拉取 radar_events 失败: ${eventsRes.error.message}`);
  }
  if (runsRes.error) {
    throw new Error(`拉取 monitor_runs 失败: ${runsRes.error.message}`);
  }

  const platforms = (platformsRes.data || []).map((p) => ({
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

  const offers = (offersRes.data || []).map((o) => ({
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

  const events = (eventsRes.data || []).map((e) => ({
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

  const runs = (runsRes.data || []).map((r) => ({
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

  // 可靠派生 lastSuccessfulSync：从最新成功的监控运行中取 completedAt
  const latestSuccessRun = runs.find((r) => r.status === 'success' && r.completedAt);
  const lastSuccessfulSync = latestSuccessRun?.completedAt || null;

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
