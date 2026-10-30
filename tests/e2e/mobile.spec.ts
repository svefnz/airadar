import { expect, test } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('无横向溢出(桌面与移动端)', async ({ page }) => {
  await page.goto('/resources/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('移动端: 汉堡导航可打开并跳转', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动端');
  await page.goto('/');
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('link', { name: '监控状态' }).click();
  await expect(page).toHaveURL(/\/monitor\//);
  await expect(page.getByRole('heading', { name: '监控状态' })).toBeVisible();
});

test('移动端: 资源卡片可用', async ({ page, isMobile }) => {
  test.skip(!isMobile, '仅移动端');
  await page.goto('/resources/');
  await expect(page.locator('article').first()).toBeVisible();
  await page.locator('article').first().getByRole('button', { name: '收藏' }).click();
});
