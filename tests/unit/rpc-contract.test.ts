import { describe, expect, it } from 'vitest';
import { patchSchema, offerSchema } from '../../src/lib/data/schema';
import { RUN_STATUSES, OFFER_STATUSES } from '../../src/lib/data/enums';
import { claimRecordSchema } from '../../src/lib/personal';

describe('rpc-contract: 增量写入协议与安全契约', () => {
  it('patchSchema 能够正确校验 ChatGPT 上报的合法增量补丁', () => {
    const validPatch = {
      schemaVersion: 1,
      generatedAt: '2026-10-30T18:00:00Z',
      source: 'chatgpt-automation',
      platforms: [
        {
          id: 'test-platform',
          name: 'Test Platform',
          slug: 'test-platform',
          canonicalDomain: 'test.com',
          websiteUrl: 'https://test.com',
          category: 'llm-api' as const,
          firstDiscoveredAt: '2026-10-30T18:00:00Z',
          lastCheckedAt: '2026-10-30T18:00:00Z',
          trustStatus: 'official' as const,
        },
      ],
      upserts: [
        {
          id: 'off_test_1',
          platformId: 'test-platform',
          title: '新手赠送 $5',
          accessType: 'api' as const,
          amount: 5,
          unit: 'USD' as const,
          amountType: 'one-time' as const,
          resetInterval: 'none' as const,
          billingRequirements: 'none' as const,
          identityVerification: 'none' as const,
          apiCompatibility: 'openai' as const,
          status: 'active' as const,
          verificationStatus: 'official' as const,
          discoveredAt: '2026-10-30T18:00:00Z',
          lastVerifiedAt: '2026-10-30T18:00:00Z',
          sources: [
            {
              url: 'https://test.com/pricing',
              label: 'Pricing Page',
              kind: 'official' as const,
            },
          ],
        },
      ],
      ends: [
        {
          offerId: 'off_old_1',
          reason: '活动已结束',
          timestamp: '2026-10-30T18:00:00Z',
          sources: [
            {
              url: 'https://test.com/announcement',
              label: 'Announcement',
              kind: 'official' as const,
            },
          ],
        },
      ],
      events: [],
    };

    const parsed = patchSchema.parse(validPatch);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.platforms.length).toBe(1);
    expect(parsed.upserts.length).toBe(1);
    expect(parsed.ends.length).toBe(1);
  });

  it('活动状态枚举严格包含 ended，禁止使用非法状态', () => {
    expect(OFFER_STATUSES).toContain('ended');
    expect(OFFER_STATUSES).toContain('active');
    expect(OFFER_STATUSES).not.toContain('expired'); // expired 不是 offerStatus，ended 才是
  });

  it('监控记录运行状态严格限制为 success / partial / failed', () => {
    expect(RUN_STATUSES).toEqual(['success', 'partial', 'failed']);
  });

  it('ClaimRecord Schema 支持 status: null 的独立备注结构', () => {
    const noteOnly = {
      status: null,
      note: '仅记录自定义备忘，未实际点击领取',
    };
    const parsed = claimRecordSchema.parse(noteOnly);
    expect(parsed.status).toBeNull();
    expect(parsed.note).toBe('仅记录自定义备忘，未实际点击领取');
  });

  it('lastSuccessfulSync 必须选取时间戳最大的最新成功监控记录，而非最早记录', () => {
    const runs = [
      { id: 'run_1', status: 'success', completedAt: '2026-10-28T22:15:00Z' },
      { id: 'run_2', status: 'failed', completedAt: '2026-10-29T10:00:00Z' },
      { id: 'run_3', status: 'success', completedAt: '2026-10-30T08:09:28Z' },
      { id: 'run_4', status: 'partial', completedAt: '2026-10-30T12:00:00Z' },
    ];

    // 正确算法：过滤 success + 降序排序取第 0 项
    const successRuns = runs
      .filter((r) => r.status === 'success' && r.completedAt)
      .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
    const lastSuccessfulSync = successRuns[0]?.completedAt || null;

    expect(lastSuccessfulSync).toBe('2026-10-30T08:09:28Z');
    expect(lastSuccessfulSync).not.toBe('2026-10-28T22:15:00Z');
  });

  it('新权益 Schema 必须强制包含至少一个合法的证据来源 (sources.length >= 1)', () => {
    const invalidOffer = {
      id: 'off_no_sources',
      platformId: 'test-platform',
      title: '缺少来源的权益',
      accessType: 'api' as const,
      amount: 10,
      unit: 'USD' as const,
      amountType: 'one-time' as const,
      resetInterval: 'none' as const,
      billingRequirements: 'none' as const,
      identityVerification: 'none' as const,
      apiCompatibility: 'openai' as const,
      status: 'active' as const,
      verificationStatus: 'unverified' as const,
      discoveredAt: '2026-10-30T18:00:00Z',
      lastVerifiedAt: '2026-10-30T18:00:00Z',
      sources: [], // 空数组应当被拒绝
    };

    expect(() => offerSchema.parse(invalidOffer)).toThrow();
  });

  it('增量补丁支持仅提交需要修改的局部字段 (Partial Updates)', () => {
    const partialPatch = {
      schemaVersion: 1,
      generatedAt: '2026-10-30T18:00:00Z',
      upserts: [
        {
          id: 'off_deepseek_free_tokens',
          status: 'ended' as const,
        },
      ],
    };

    const parsed = patchSchema.parse(partialPatch);
    const item = parsed.upserts[0];
    expect(item?.id).toBe('off_deepseek_free_tokens');
    expect(item?.status).toBe('ended');
    expect(item?.title).toBeUndefined();
    expect(item?.platformId).toBeUndefined();
  });

  it('下线活动 ends 必须提供至少一条证据来源 (sources.length >= 1)', () => {
    const invalidEnd = {
      schemaVersion: 1,
      generatedAt: '2026-10-30T18:00:00Z',
      ends: [
        {
          offerId: 'off_no_sources',
          reason: '缺少证据的下线',
          timestamp: '2026-10-30T18:00:00Z',
          sources: [],
        },
      ],
    };

    expect(() => patchSchema.parse(invalidEnd)).toThrow();
  });
});
