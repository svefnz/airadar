#!/usr/bin/env node
/**
 * 生成演示数据 data/radar.json。
 * - 所有条目均标记 demo: true, 界面会显示"演示数据"横幅
 * - 所有日期相对当前时间生成, 保证演示效果永远鲜活
 * - 不使用官方确认状态(demo 数据禁止标 official)
 * 用法: pnpm generate-demo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createOfferId, offerDedupeKey } from '../src/lib/data/ids';

const day = 86_400_000;
const now = Date.now();
const iso = (t: number) => new Date(t).toISOString();
const daysAgo = (n: number) => iso(now - n * day);
const daysAhead = (n: number) => iso(now + n * day);
const hoursAgo = (n: number) => iso(now - n * 3600_000);

/** slug 映射(与 id 一致) */
const P = {
  nebulaforge: 'nebulaforge',
  codepilot: 'codepilot',
  vectorvault: 'vectorvault',
  chatnimbus: 'chatnimbus',
  relayhub: 'relayhub',
} as const;

const platforms = [
  {
    id: P.nebulaforge,
    name: 'NebulaForge',
    slug: P.nebulaforge,
    canonicalDomain: 'nebulaforge.dev',
    websiteUrl: 'https://nebulaforge.dev',
    description: '云原生 LLM API 平台, 提供多模型接入与统一计费(演示数据)。',
    category: 'llm-api',
    firstDiscoveredAt: daysAgo(20),
    lastCheckedAt: hoursAgo(5),
    trustStatus: 'community',
    demo: true,
  },
  {
    id: P.codepilot,
    name: 'CodePilot',
    slug: P.codepilot,
    canonicalDomain: 'codepilot.ai',
    websiteUrl: 'https://codepilot.ai',
    description: 'AI Coding Agent, 自动补全与代码审查(演示数据)。',
    category: 'coding-agent',
    firstDiscoveredAt: daysAgo(12),
    lastCheckedAt: hoursAgo(5),
    trustStatus: 'community',
    demo: true,
  },
  {
    id: P.vectorvault,
    name: 'VectorVault',
    slug: P.vectorvault,
    canonicalDomain: 'vectorvault.io',
    websiteUrl: 'https://vectorvault.io',
    description: '向量数据库与 RAG 服务(演示数据)。',
    category: 'dev-tool',
    firstDiscoveredAt: daysAgo(45),
    lastCheckedAt: daysAgo(2),
    trustStatus: 'community',
    demo: true,
  },
  {
    id: P.chatnimbus,
    name: 'ChatNimbus',
    slug: P.chatnimbus,
    canonicalDomain: 'chatnimbus.com',
    websiteUrl: 'https://chatnimbus.com',
    description: '通用 AI 聊天客户端, 支持多模型切换(演示数据)。',
    category: 'application',
    firstDiscoveredAt: daysAgo(60),
    lastCheckedAt: hoursAgo(6),
    trustStatus: 'community',
    demo: true,
  },
  {
    id: P.relayhub,
    name: 'RelayHub',
    slug: P.relayhub,
    canonicalDomain: 'relayhub.net',
    websiteUrl: 'https://relayhub.net',
    description: '第三方 API 中转服务(演示数据, 注意中转类风险)。',
    category: 'api-relay',
    firstDiscoveredAt: daysAgo(8),
    lastCheckedAt: hoursAgo(24),
    trustStatus: 'unverified',
    demo: true,
  },
];

const o = (p: string, title: string, over: Record<string, unknown> = {}, keyExtra: Record<string, unknown> = {}) => {
  const platform = platforms.find((x) => x.id === p)!;
  const key = offerDedupeKey({
    platformDomain: platform.canonicalDomain,
    title,
    models: (over.models as string[] | undefined) ?? [],
    accessType: (over.accessType as string) ?? 'unknown',
    unit: over.unit as string,
    channel: (keyExtra.channel as string) ?? '注册',
    region: (keyExtra.region as string) ?? '',
    period: (keyExtra.period as string) ?? '',
  });
  return {
    id: createOfferId(platform.slug, key),
    platformId: p,
    title,
    models: [] as string[],
    accessType: 'unknown',
    amount: null as number | null,
    unit: 'Unknown',
    amountType: 'unknown',
    resetInterval: 'unknown',
    claimConditions: [] as string[],
    billingRequirements: 'unknown',
    identityVerification: 'unknown',
    regionRestrictions: [] as string[],
    rateLimits: '',
    apiCompatibility: 'unknown',
    status: 'active',
    verificationStatus: 'community',
    discoveredAt: daysAgo(3),
    lastVerifiedAt: hoursAgo(5),
    sources: [
      { url: 'https://example.com/official-pricing', label: '官方定价页(演示链接)', kind: 'official' },
    ],
    demo: true,
    ...over,
  };
};

const offers = [
  o(P.nebulaforge, '注册赠送 $10 API Credits', {
    models: ['Nebula-2 (128K)'],
    accessType: 'api',
    amount: 10,
    unit: 'USD',
    amountType: 'one-time',
    resetInterval: 'none',
    billingRequirements: 'none',
    claimConditions: ['新用户注册', '邮箱验证'],
    contextWindow: 128_000,
    toolCalling: true,
    apiCompatibility: 'openai',
    creditExpiresAt: daysAhead(60),
  }),
  o(P.nebulaforge, '每天 100 次免费调用', {
    models: ['Nebula-1 (32K)'],
    accessType: 'api',
    amount: 100,
    unit: 'Request',
    amountType: 'daily',
    resetInterval: 'daily',
    billingRequirements: 'card',
    claimConditions: ['注册后默认开启'],
    contextWindow: 32_000,
    apiCompatibility: 'openai',
  }),
  o(P.nebulaforge, 'DeepThink-X2 限时免费', {
    models: ['DeepThink-X2'],
    accessType: 'api',
    amount: null,
    unit: 'Unlimited',
    amountType: 'limited-unlimited',
    resetInterval: 'unlimited',
    billingRequirements: 'none',
    endAt: daysAhead(12),
    claimConditions: ['期间内所有账户'],
    contextWindow: 256_000,
    toolCalling: true,
    apiCompatibility: 'both',
  }),
  o(P.codepilot, 'Pro 版每月赠送 2000 Tokens', {
    models: ['CodePilot-Pro'],
    accessType: 'client',
    amount: 2000,
    unit: 'Token',
    amountType: 'monthly',
    resetInterval: 'monthly',
    billingRequirements: 'none',
    claimConditions: ['免费订阅'],
    contextWindow: 128_000,
    toolCalling: true,
  }),
  o(P.codepilot, '连续签到送 5 积分', {
    models: [],
    accessType: 'client',
    amount: 5,
    unit: 'Point',
    amountType: 'daily',
    resetInterval: 'daily',
    billingRequirements: 'none',
    claimConditions: ['每日签到'],
  }),
  o(P.vectorvault, '注册赠送 500 Credits', {
    models: [],
    accessType: 'api',
    amount: 500,
    unit: 'Credit',
    amountType: 'one-time',
    resetInterval: 'none',
    billingRequirements: 'trial',
    claimConditions: ['新用户注册'],
    creditExpiresAt: daysAhead(30),
  }),
  o(P.chatnimbus, '免费版每月 300 条消息', {
    models: ['ChatNimbus-Small'],
    accessType: 'client',
    amount: 300,
    unit: 'Message',
    amountType: 'monthly',
    resetInterval: 'monthly',
    billingRequirements: 'none',
    identityVerification: 'phone',
    claimConditions: ['手机号注册'],
  }),
  o(P.relayhub, '注册赠送 $1 API Credits(待核实)', {
    models: ['多模型中转'],
    accessType: 'api',
    amount: 1,
    unit: 'USD',
    amountType: 'one-time',
    resetInterval: 'none',
    billingRequirements: 'card',
    identityVerification: 'id',
    claimConditions: ['新用户注册', '实名认证'],
    verificationStatus: 'unverified',
    sources: [
      { url: 'https://example.com/community-thread', label: '社区讨论(演示链接)', kind: 'community' },
    ],
  }),
];

const events = [
  {
    id: 'ev_demo_1',
    offerId: offers[2]!.id,
    platformId: P.nebulaforge,
    eventType: 'deadline-extended',
    timestamp: daysAgo(2),
    field: 'endAt',
    previousValue: daysAhead(5),
    currentValue: daysAhead(12),
    description: '「DeepThink-X2 限时免费」截止日期延期 7 天',
    sources: [{ url: 'https://example.com/official-pricing', label: '官方公告(演示链接)', kind: 'official' }],
  },
  {
    id: 'ev_demo_2',
    offerId: offers[0]!.id,
    platformId: P.nebulaforge,
    eventType: 'amount-changed',
    timestamp: daysAgo(10),
    field: 'amount',
    previousValue: '5',
    currentValue: '10',
    description: '「注册赠送 API Credits」从 $5 提升为 $10',
    sources: [{ url: 'https://example.com/official-pricing', label: '官方定价页(演示链接)', kind: 'official' }],
  },
  {
    id: 'ev_demo_3',
    offerId: null,
    platformId: P.codepilot,
    eventType: 'platform-added',
    timestamp: daysAgo(12),
    field: 'platformId',
    previousValue: '',
    currentValue: P.codepilot,
    description: '发现新平台 CodePilot',
    sources: [{ url: 'https://example.com/community-thread', label: '社区讨论(演示链接)', kind: 'community' }],
  },
];

const runs = [
  {
    id: 'run_demo_1',
    startedAt: hoursAgo(6),
    completedAt: hoursAgo(5),
    status: 'success',
    searchACompleted: true,
    searchBCompleted: true,
    sourcesChecked: 14,
    candidatesFound: 1,
    offersCreated: 0,
    offersUpdated: 2,
    offersExpired: 0,
    errors: [],
    repositoryCommit: 'demo',
    note: '演示运行记录',
  },
  {
    id: 'run_demo_2',
    startedAt: hoursAgo(30),
    completedAt: hoursAgo(29),
    status: 'failed',
    searchACompleted: true,
    searchBCompleted: false,
    sourcesChecked: 6,
    candidatesFound: 0,
    offersCreated: 0,
    offersUpdated: 0,
    offersExpired: 0,
    errors: [{ code: 'SEARCH_B_TIMEOUT', message: '新平台发现搜索超时(演示失败记录)' }],
    note: '演示失败记录',
  },
];

const data = {
  schemaVersion: 1,
  lastSuccessfulSync: runs[0]!.completedAt,
  platforms,
  offers,
  events,
  runs,
};

mkdirSync('data', { recursive: true });
writeFileSync('data/radar.json', JSON.stringify(data, null, 2) + '\n');
console.log(`✓ 已生成演示数据: ${platforms.length} 平台, ${offers.length} 活动, ${events.length} 事件, ${runs.length} 运行`);
