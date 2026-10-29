import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { OfferSwipeDeck } from '../../src/features/OfferSwipeDeck';
import type { Offer, Platform } from '../../src/lib/data/schema';

const mockPlatform: Platform = {
  id: 'openai',
  name: 'OpenAI',
  canonicalDomain: 'openai.com',
  websiteUrl: 'https://openai.com',
  category: 'llm-api',
  description: 'AI platform',
  firstDiscoveredAt: '2026-01-01T00:00:00Z',
  lastCheckedAt: '2026-10-28T00:00:00Z',
  availability: 'public',
  regions: ['global'],
  tags: ['api'],
};

const mockOffer1: Offer = {
  id: 'off_1',
  platformId: 'openai',
  title: 'ChatGPT Plus 体验',
  description: '限时免费体验',
  status: 'active',
  accessType: 'web',
  amountType: 'one-time',
  billingRequirements: 'none',
  identityVerification: 'none',
  regionRestrictions: [],
  discoveredAt: '2026-10-28T00:00:00Z',
  lastVerifiedAt: '2026-10-28T00:00:00Z',
  verificationStatus: 'official',
  confidenceScore: 0.95,
  claimConditions: ['新用户注册'],
  models: ['gpt-4o'],
};

describe('OfferSwipeDeck (王权堆叠滑动卡片)', () => {
  it('正确静态渲染王权滑动卡片界面及控制元素', () => {
    const platformMap = new Map([['openai', mockPlatform]]);
    const html = renderToStaticMarkup(
      React.createElement(OfferSwipeDeck, {
        offers: [mockOffer1],
        platformById: platformMap,
      })
    );

    expect(html).toContain('王权探索模式');
    expect(html).toContain('ChatGPT Plus 体验');
    expect(html).toContain('左滑忽略');
    expect(html).toContain('右滑收藏');
    expect(html).toContain('键盘快捷键');
  });

  it('列表为空时显示完成结算台', () => {
    const platformMap = new Map([['openai', mockPlatform]]);
    const html = renderToStaticMarkup(
      React.createElement(OfferSwipeDeck, {
        offers: [],
        platformById: platformMap,
      })
    );

    expect(html).toContain('本轮雷达卡片已全部探索完毕');
    expect(html).toContain('重新洗牌探索');
  });
});
