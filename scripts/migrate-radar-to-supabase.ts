#!/usr/bin/env node
/**
 * 一次性将 data/radar.json 中的历史全量数据迁移/同步至 Supabase 数据库。
 *
 * 用法:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm exec tsx scripts/migrate-radar-to-supabase.ts
 * 或本地配置了 .env 之后直接运行:
 *   pnpm exec tsx scripts/migrate-radar-to-supabase.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { RadarData } from '../src/lib/data/schema';
import { radarSchema } from '../src/lib/data/schema';

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量: 请设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY (或在 .env 文件中提供)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function migrate() {
  console.log('🚀 开始读取 data/radar.json...');
  const raw = readFileSync('data/radar.json', 'utf8');
  const radar: RadarData = radarSchema.parse(JSON.parse(raw));

  console.log(`📊 待导入: ${radar.platforms.length} 平台, ${radar.offers.length} 活动, ${radar.events.length} 事件, ${radar.runs.length} 次监控记录`);

  // 1. 迁移 platforms
  console.log('➡️ 正在导入 platforms...');
  const platformRows = radar.platforms.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    canonical_domain: p.canonicalDomain,
    website_url: p.websiteUrl,
    description: p.description || '',
    category: p.category,
    launch_date: p.launchDate || null,
    first_discovered_at: p.firstDiscoveredAt,
    last_checked_at: p.lastCheckedAt,
    trust_status: p.trustStatus,
    logo_url: p.logoUrl || null,
    demo: !!p.demo,
    updated_at: new Date().toISOString(),
  }));

  const { error: pErr } = await supabase.from('platforms').upsert(platformRows, { onConflict: 'id' });
  if (pErr) {
    console.error('❌ 导入 platforms 失败:', pErr.message);
    process.exit(1);
  }
  console.log(`✅ 成功导入 ${platformRows.length} 个平台`);

  // 2. 迁移 offers (分批50条)
  console.log('➡️ 正在导入 offers...');
  const offerRows = radar.offers.map((o) => ({
    id: o.id,
    platform_id: o.platformId,
    title: o.title,
    models: o.models || [],
    access_type: o.accessType,
    amount: o.amount ?? null,
    unit: o.unit,
    amount_type: o.amountType,
    reset_interval: o.resetInterval,
    claim_conditions: o.claimConditions || [],
    billing_requirements: o.billingRequirements,
    identity_verification: o.identityVerification,
    region_restrictions: o.regionRestrictions || [],
    rate_limits: o.rateLimits || '',
    context_window: o.contextWindow ?? null,
    tool_calling: o.toolCalling ?? null,
    api_compatibility: o.apiCompatibility,
    start_at: o.startAt || null,
    end_at: o.endAt || null,
    credit_expires_at: o.creditExpiresAt || null,
    status: o.status,
    verification_status: o.verificationStatus,
    discovered_at: o.discoveredAt,
    last_verified_at: o.lastVerifiedAt,
    official_url: o.officialUrl || null,
    sources: o.sources || [],
    demo: !!o.demo,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < offerRows.length; i += 50) {
    const chunk = offerRows.slice(i, i + 50);
    const { error: oErr } = await supabase.from('offers').upsert(chunk, { onConflict: 'id' });
    if (oErr) {
      console.error(`❌ 导入 offers 批次 [${i}-${i + chunk.length}] 失败:`, oErr.message);
      process.exit(1);
    }
  }
  console.log(`✅ 成功导入 ${offerRows.length} 个活动`);

  // 3. 迁移 radar_events (分批50条)
  console.log('➡️ 正在导入 radar_events...');
  const eventRows = radar.events.map((e) => ({
    id: e.id,
    offer_id: e.offerId || null,
    platform_id: e.platformId || null,
    event_type: e.eventType,
    timestamp: e.timestamp,
    field: e.field || null,
    previous_value: e.previousValue || null,
    current_value: e.currentValue || null,
    sources: e.sources || [],
    description: e.description || '',
  }));

  for (let i = 0; i < eventRows.length; i += 50) {
    const chunk = eventRows.slice(i, i + 50);
    const { error: eErr } = await supabase.from('radar_events').upsert(chunk, { onConflict: 'id' });
    if (eErr) {
      console.error(`❌ 导入 radar_events 批次 [${i}-${i + chunk.length}] 失败:`, eErr.message);
      process.exit(1);
    }
  }
  console.log(`✅ 成功导入 ${eventRows.length} 条变更事件`);

  // 4. 迁移 monitor_runs
  console.log('➡️ 正在导入 monitor_runs...');
  const runRows = radar.runs.map((r) => ({
    id: r.id,
    started_at: r.startedAt,
    completed_at: r.completedAt || null,
    status: r.status,
    search_a_completed: !!r.searchACompleted,
    search_b_completed: !!r.searchBCompleted,
    sources_checked: r.sourcesChecked || 0,
    candidates_found: r.candidatesFound || 0,
    offers_created: r.offersCreated || 0,
    offers_updated: r.offersUpdated || 0,
    offers_expired: r.offersExpired || 0,
    errors: r.errors || [],
    repository_commit: r.repositoryCommit || null,
    note: r.note || null,
  }));

  const { error: rErr } = await supabase.from('monitor_runs').upsert(runRows, { onConflict: 'id' });
  if (rErr) {
    console.error('❌ 导入 monitor_runs 失败:', rErr.message);
    process.exit(1);
  }
  console.log(`✅ 成功导入 ${runRows.length} 次监控记录`);

  console.log('\n🎉 全量信源历史数据已全部无损迁移到 Supabase！');
}

migrate().catch((err) => {
  console.error('❌ 迁移异常终止:', err);
  process.exit(1);
});
