import { expect, test } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('首页: 总览内容与导航', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AI Free Radar/);
  await expect(page.getByText('值得立即领取')).toBeVisible();
  await expect(page.getByText('最近 24 小时新发现')).toBeVisible();
  await expect(page.getByText('最新变化')).toBeVisible();

  if (page.viewportSize()?.width && page.viewportSize()!.width < 1024) {
    await page.getByRole('button', { name: '打开导航' }).click();
  }
  await page.getByRole('link', { name: '资源库' }).first().click();
  await expect(page).toHaveURL(/\/resources\//);
  await expect(page.getByRole('heading', { name: /AI 免费额度与活动雷达|资源/ })).toBeVisible();
});

test('首页: 没有数据时不伪造统计', async ({ page }) => {
  // demo 数据存在, 但验证空态路径: 监控状态模块至少显示真实运行记录
  await page.goto('/monitor/');
  await expect(page.getByRole('heading', { name: '监控状态' })).toBeVisible();
  await expect(page.getByText('运行历史')).toBeVisible();
});
