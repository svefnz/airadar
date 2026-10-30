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
});
