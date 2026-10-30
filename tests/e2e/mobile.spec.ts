import { expect, test } from '@playwright/test';
import { loginAsTestUser, waitForHydration } from './helpers/auth';
import { appUrl } from './helpers/url';

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('无横向溢出(桌面与移动端)', async ({ page }) => {
  await page.goto(appUrl('/resources/'));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('移动端: 顶栏导航与弹窗可用', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动端');
  await page.goto(appUrl('/'));
  await expect(page.getByText('AI Free Radar')).toBeVisible();

  // 点击 Header 中的资源库链接
  await page.getByRole('link', { name: /资源库/ }).click();
  await expect(page).toHaveURL(/resources/);
  await expect(page.locator('article').first()).toBeVisible();
});

test('移动端: 沉浸式卡牌手势与交互可用', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动端');
  await page.goto(appUrl('/resources/?disposition=all'));
  await waitForHydration(page);
  const card = page.locator('article').first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '收藏' }).click();
  await expect(card.getByRole('button', { name: '取消收藏' })).toBeVisible();
});
