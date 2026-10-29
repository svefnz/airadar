import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const radar = JSON.parse(readFileSync('data/radar.json', 'utf8'));
const radarMd5 = createHash('md5').update(readFileSync('data/radar.json')).digest('hex');
const platform = radar.platforms[0];
const offer = radar.offers.find((o: { platformId: string }) => o.platformId === platform.id);

test('个人状态: 收藏与已领取在刷新后保留', async ({ page }) => {
  await page.goto('/resources/');
  const firstCard = page.locator('article').first();

  await firstCard.getByRole('button', { name: '收藏' }).click();
  await firstCard.getByRole('button', { name: '领取' }).click();
  await expect(firstCard.getByRole('button', { name: '已领取' })).toBeVisible();

  await page.reload();
  const card = page.locator('article').first();
  await expect(card.getByRole('button', { name: '已领取' })).toBeVisible();
  await expect(card.getByRole('button', { name: '取消收藏' })).toBeVisible();

  // 个人状态只写 localStorage, 公共数据文件必须保持原样
  const now = createHash('md5').update(readFileSync('data/radar.json')).digest('hex');
  expect(now).toBe(radarMd5);
  const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(localStorageKeys).toContain('ai-radar:personal:v1');
});

test('资源库: 平台详情页可打开并展示活动细节', async ({ page }) => {
  await page.goto('/resources/');
  await page.getByRole('link', { name: platform.name }).first().click();
  await expect(page).toHaveURL(new RegExp(`/platforms/${platform.slug}/`));
  await expect(page.getByRole('heading', { name: platform.name, exact: true })).toBeVisible();
  // 详情页应展示该平台真实权益标题
  await expect(page.getByText(offer.title)).toBeVisible();
});
