import { describe, expect, it } from 'vitest';
import { applyPatch } from '../../src/lib/data/merge';
import { validateRadar } from '../../src/lib/data/validate';
import { patchSchema, radarSchema } from '../../src/lib/data/schema';
import type { RadarData } from '../../src/lib/data/schema';

const NOW = '2026-02-01T00:00:00Z';

function baseData(): RadarData {
  return {
    schemaVersion: 1,
    lastSuccessfulSync: '2026-01-20T00:00:00Z',
    platforms: [
      {
        id: 'p1',
        name: 'Platform One',
        slug: 'p1',
        canonicalDomain: 'p1.example.com',
        websiteUrl: 'https://p1.example.com',
        description: '',
        category: 'llm-api',
        firstDiscoveredAt: '2026-01-01T00:00:00Z',
        lastCheckedAt: '2026-01-20T00:00:00Z',
        trustStatus: 'official',
      },
    ],
    offers: [],
    events: [],
    runs: [],
  };
}

function patch(over: Partial<Parameters<typeof patchSchema.parse>[0]> = {}) {
  return patchSchema.parse({
    schemaVersion: 1,
    generatedAt: NOW,
    source: 'test',
    platforms: [],
    upserts: [],
    ends: [],
    events: [],
    runs: [],
    ...over,
  });
}

function newOffer(over: Record<string, unknown> = {}) {
  return {
    platformId: 'p1',
    title: '注册赠送 $10',
    models: ['m1'],
    accessType: 'api',
    amount: 10,
    unit: 'USD',
    amountType: 'one-time',
    resetInterval: 'none',
    billingRequirements: 'none',
    identityVerification: 'none',
    regionRestrictions: [],
    apiCompatibility: 'openai',
    status: 'active',
    verificationStatus: 'official',
    sources: [{ url: 'https://p1.example.com/pricing', label: '定价页', kind: 'official' }],
    ...over,
  };
}

describe('merge: 场景 A 发现新平台', () => {
  it('新平台写入后出现在 platforms, 并生成 platform-added 事件', () => {
    const p = patch({
      platforms: [
        {
          id: 'p2',
          name: 'Platform Two',
          slug: 'p2',
          canonicalDomain: 'p2.example.com',
          websiteUrl: 'https://p2.example.com',
          description: '新平台',
          category: 'agent-platform',
          firstDiscoveredAt: NOW,
          lastCheckedAt: NOW,
          trustStatus: 'unverified',
          sources: [{ url: 'https://p2.example.com', label: '官网', kind: 'official' }],
        },
      ] as never,
    });
    const { data, summary } = applyPatch(baseData(), p, NOW);
    expect(summary.platformsAdded).toBe(1);
    expect(data.platforms.some((x) => x.id === 'p2')).toBe(true);
    expect(data.events.some((e) => e.eventType === 'platform-added' && e.platformId === 'p2')).toBe(true);
    expect(validateRadar(data).ok).toBe(true);
  });
});

describe('merge: 场景 B 新增活动', () => {
  it('新活动写入, 生成本 offer-created 事件', () => {
    const p = patch({ upserts: [newOffer()] });
    const { data, summary } = applyPatch(baseData(), p, NOW);
    expect(summary.offersCreated).toBe(1);
    expect(data.offers).toHaveLength(1);
    expect(data.events.some((e) => e.eventType === 'offer-created' && e.offerId === data.offers[0]!.id)).toBe(true);
  });
});

describe('merge: 场景 C 更新已有活动', () => {
  it('同一活动第二次写入不产生重复条目, 只更新并记录事件', () => {
    const first = applyPatch(baseData(), patch({ upserts: [newOffer()] }), NOW);
    const second = applyPatch(first.data, patch({ upserts: [newOffer({ endAt: '2026-02-15T00:00:00Z' })] }), NOW);
    expect(second.data.offers).toHaveLength(1);
    expect(second.summary.offersUpdated).toBe(1);
    expect(second.data.offers[0]!.endAt).toBe('2026-02-15T00:00:00Z');
  });
});

describe('merge: 场景 D 重复输入幂等', () => {
  it('同一补丁应用两次, 活动和事件数量不变', () => {
    const p = patch({ upserts: [newOffer()] });
    const once = applyPatch(baseData(), p, NOW);
    const twice = applyPatch(once.data, p, NOW);
    expect(twice.data.offers).toHaveLength(once.data.offers.length);
    expect(twice.data.events).toHaveLength(once.data.events.length);
    expect(twice.summary.offersCreated).toBe(0);
    expect(twice.summary.offersUpdated).toBe(0);
  });
});

describe('merge: 场景 E 活动延期', () => {
  it('endAt 延长产生 deadline-extended 事件, 保留新旧值', () => {
    const first = applyPatch(baseData(), patch({ upserts: [newOffer({ endAt: '2026-02-10T00:00:00Z' })] }), NOW);
    const second = applyPatch(first.data, patch({ upserts: [newOffer({ endAt: '2026-03-01T00:00:00Z' })] }), NOW);
    const ev = second.data.events.find((e) => e.field === 'endAt');
    expect(ev?.eventType).toBe('deadline-extended');
    expect(ev?.previousValue).toBe('2026-02-10T00:00:00Z');
    expect(ev?.currentValue).toBe('2026-03-01T00:00:00Z');
  });
});

describe('merge: 场景 F 活动结束/恢复', () => {
  it('ends 操作标记 ended 并生成 offer-ended 事件', () => {
    const first = applyPatch(baseData(), patch({ upserts: [newOffer()] }), NOW);
    const offerId = first.data.offers[0]!.id;
    const second = applyPatch(first.data, patch({ ends: [{ offerId, reason: '官方下线', timestamp: NOW, sources: [] }] }), NOW);
    expect(second.data.offers[0]!.status).toBe('ended');
    expect(second.summary.offersEnded).toBe(1);
    expect(second.data.events.some((e) => e.eventType === 'offer-ended')).toBe(true);
  });

  it('结束的活动可通过 upsert 恢复为 active', () => {
    const first = applyPatch(baseData(), patch({ upserts: [newOffer()] }), NOW);
    const offerId = first.data.offers[0]!.id;
    const ended = applyPatch(first.data, patch({ ends: [{ offerId, reason: '', timestamp: NOW, sources: [] }] }), NOW);
    const resumed = applyPatch(ended.data, patch({ upserts: [newOffer({ status: 'active' })] }), NOW);
    expect(resumed.data.offers[0]!.status).toBe('active');
    expect(resumed.data.events.some((e) => e.eventType === 'offer-resumed' && e.currentValue === 'active')).toBe(true);
  });
});

describe('merge: 场景 G 无法确认/缺失字段', () => {
  it('单位 Unknown 且额度为空可通过校验; 缺字段时补丁解析失败', () => {
    const p = patch({
      upserts: [
        newOffer({ unit: 'Unknown', amount: null, amountType: 'unknown', resetInterval: 'unknown', verificationStatus: 'unverified' }),
      ],
    });
    const { data } = applyPatch(baseData(), p, NOW);
    expect(validateRadar(data).ok).toBe(true);
    expect(() => applyPatch(baseData(), patch({ upserts: [{ platformId: 'p1' }] }), NOW)).toThrow(/title/);
  });
});

describe('merge: 场景 H 错误 URL', () => {
  it('非法网站 URL 在 Schema 层被拒绝', () => {
    expect(() =>
      radarSchema.parse({
        ...baseData(),
        platforms: [{ ...baseData().platforms[0]!, websiteUrl: 'not-a-url' }],
      }),
    ).toThrow();
  });
});

describe('merge: 场景 I Schema 版本不匹配', () => {
  it('版本不一致时拒绝合并', () => {
    expect(() =>
      applyPatch(baseData(), { schemaVersion: 2, generatedAt: NOW, platforms: [], upserts: [], ends: [], events: [], runs: [] } as never, NOW),
    ).toThrow(/schemaVersion/);
  });
});

describe('merge: 场景 J GitHub 冲突合并', () => {
  it('并发补丁重放后无重复、无丢失', () => {
    const pA = patch({ upserts: [newOffer({ id: 'p1:A', title: '活动A' })] });
    const pB = patch({ upserts: [newOffer({ id: 'p1:B', title: '活动B' })] });
    const m1 = applyPatch(baseData(), pA, NOW).data;
    const m2 = applyPatch(m1, pB, NOW).data; // 并发写入 B
    // A 基于旧基线重放(冲突后重新读取最新数据再合并)
    const replay = applyPatch(m2, pA, NOW);
    expect(replay.data.offers).toHaveLength(2);
    expect(replay.data.offers).toHaveLength(2);
    expect(new Set(replay.data.offers.map((o) => o.id)).size).toBe(2);
    expect(replay.data.offers.map((o) => o.title).sort()).toEqual(['活动A', '活动B']);
    expect(replay.summary.offersCreated).toBe(0);
  });
});

describe('merge: 场景 K 旧事件不被覆盖', () => {
  it('多轮更新保留各自事件与历史值', () => {
    const m1 = applyPatch(baseData(), patch({ upserts: [newOffer({ id: 'p1:x' })] }), NOW).data;
    const m2 = applyPatch(m1, patch({ upserts: [newOffer({ amount: 20 })] }), '2026-02-02T00:00:00Z').data;
    const m3 = applyPatch(m2, patch({ upserts: [newOffer({ amount: 20, endAt: '2026-03-01T00:00:00Z' })] }), '2026-02-03T00:00:00Z').data;
    const amountEv = m3.events.filter((e) => e.field === 'amount');
    const endEv = m3.events.filter((e) => e.field === 'endAt');
    expect(amountEv).toHaveLength(1);
    expect(amountEv[0]!.previousValue).toBe('10');
    expect(amountEv[0]!.currentValue).toBe('20');
    expect(endEv).toHaveLength(1);
    expect(endEv[0]!.previousValue).toBe('');
  });
});

describe('validate: 业务约束', () => {
  it('拒绝 demo 数据标记官方确认', () => {
    const data = baseData();
    data.platforms[0]!.demo = true;
    data.platforms[0]!.trustStatus = 'official';
    const r = validateRadar(data);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('demo'))).toBe(true);
  });

  it('拒绝活动引用不存在的平台', () => {
    const data = baseData();
    data.offers.push(newOffer({ id: 'x', platformId: 'ghost' }) as never);
    expect(validateRadar(data).ok).toBe(false);
  });

  it('拒绝 startAt 晚于 endAt', () => {
    const data = baseData();
    data.offers.push(
      newOffer({ id: 'x', startAt: '2026-03-01T00:00:00Z', endAt: '2026-02-01T00:00:00Z' }) as never,
    );
    expect(validateRadar(data).ok).toBe(false);
  });

  it('拒绝 amountType/resetInterval 不一致', () => {
    const data = baseData();
    data.offers.push(newOffer({ id: 'x', amountType: 'daily', resetInterval: 'none' }) as never);
    expect(validateRadar(data).ok).toBe(false);
  });

  it('拒绝单位与额度矛盾', () => {
    const data = baseData();
    data.offers.push(newOffer({ id: 'x', unit: 'Unlimited', amount: 10 }) as never);
    expect(validateRadar(data).ok).toBe(false);
  });
});

describe('merge: 监控运行记录', () => {
  it('成功运行写入 lastSuccessfulSync, 失败运行不更新', () => {
    const run = {
      id: 'run_1',
      startedAt: '2026-02-01T00:00:00Z',
      completedAt: '2026-02-01T01:00:00Z',
      status: 'success',
      searchACompleted: true,
      searchBCompleted: true,
      sourcesChecked: 5,
      candidatesFound: 0,
      offersCreated: 0,
      offersUpdated: 0,
      offersExpired: 0,
      errors: [],
    };
    const { data } = applyPatch(baseData(), patch({ runs: [run] }), NOW);
    expect(data.runs).toHaveLength(1);
    expect(data.lastSuccessfulSync).toBe('2026-02-01T01:00:00Z');

    const failedRun = { ...run, id: 'run_2', status: 'failed', completedAt: '2026-02-01T02:00:00Z', searchBCompleted: false, errors: [{ code: 'X', message: 'boom' }] };
    const after = applyPatch(data, patch({ runs: [failedRun] }), NOW);
    expect(after.data.lastSuccessfulSync).toBe('2026-02-01T01:00:00Z');
    expect(after.data.runs).toHaveLength(2);
  });

  it('success 运行缺少 completedAt 时校验失败', () => {
    const data = baseData();
    data.runs.push({ id: 'r', startedAt: NOW, status: 'success', searchACompleted: true, searchBCompleted: true, sourcesChecked: 0, candidatesFound: 0, offersCreated: 0, offersUpdated: 0, offersExpired: 0, errors: [] } as never);
    expect(validateRadar(data).ok).toBe(false);
  });
});
