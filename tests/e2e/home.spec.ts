import { expect, test } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { appUrl } from './helpers/url';

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('首页: 可视化大屏与顶栏导航', async ({ page }) => {
  await page.goto(appUrl('/'));
  await expect(page).toHaveTitle(/AI Free Radar/);
  await expect(page.getByText('当前有效免费资源')).toBeVisible();
  await expect(page.getByText('最近 24 小时新发现')).toBeVisible();
  await expect(page.getByText('近 30 天新发现趋势')).toBeVisible();

  // 验证主行动入口（CTA）直接引导至资源库
  const ctaBtn = page.getByRole('button', { name: /进入资源库/ });
  await expect(ctaBtn).toBeVisible();

  // 测试顶栏弹窗触发（例如：新平台发现）
  const discoveriesBtn = page.getByRole('button', { name: /新平台发现/ });
  if (await discoveriesBtn.isVisible()) {
    await discoveriesBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading', { name: '新平台发现' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }

  // 点击 Header 中的资源库链接
  await page.getByRole('link', { name: /资源库/ }).first().click();
  await expect(page).toHaveURL(/resources/);
  await expect(page.locator('article').first()).toBeVisible();
});

test('首页: 辅助路由直接访问兼顾弹窗与独立展示', async ({ page }) => {
  await page.goto(appUrl('/monitor/'));
  // 等待辅助路由自动唤起的监控运行状态弹窗
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /监控/ })).toBeVisible();

  // 关闭弹窗
  await page.keyboard.press('Escape');
  if (await dialog.isVisible()) {
    await page.getByRole('button', { name: 'Close' }).click({ force: true });
  }
  await expect(dialog).not.toBeVisible();

  // 关闭弹窗后验证底层的独立监控页面依然完整可用
  await expect(page.getByRole('heading', { name: '监控状态' })).toBeVisible();
  await expect(page.getByText('计划监控间隔')).toBeVisible();
});
