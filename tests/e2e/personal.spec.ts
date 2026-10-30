import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loginAsTestUser, waitForHydration } from './helpers/auth';

const radar = JSON.parse(readFileSync('data/radar.json', 'utf8'));
const radarMd5 = createHash('md5').update(readFileSync('data/radar.json')).digest('hex');
const platform = radar.platforms[0];
const offer = radar.offers.find((o: { platformId: string }) => o.platformId === platform.id);

test.describe('个人数据与安全认证 E2E', () => {
  test('未登录时触发全站访问守卫 (AuthGuard)', async ({ page }) => {
    await page.goto('/resources/');

    // 未登录时必须呈现登录守卫视图与 GitHub 登录提示
    await expect(page.getByText('私密多端云同步系统')).toBeVisible();
    await expect(page.getByText('本项目已升级为全站云端资产雷达，仅支持 GitHub OAuth 授权登录')).toBeVisible();
    await expect(page.getByRole('button', { name: '使用 GitHub 授权登录' })).toBeVisible();
  });

  test('GitHub 授权登录后可执行收藏操作并同步云端状态', async ({ page }) => {
    // 注入模拟 GitHub 登录会话
    await loginAsTestUser(page, { userName: 'octocat' });

    await page.goto('/resources/');
    await waitForHydration(page);

    // 确认顶部导航栏展示当前登录的 GitHub 用户名与退出按钮
    await expect(page.getByText('octocat')).toBeVisible();
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();

    // 定位首张卡片的收藏按钮 (aria-label 模式)
    const firstCard = page.locator('article').first();
    const favButton = firstCard.locator('button[aria-label="收藏"], button[aria-label="取消收藏"]');
    await expect(favButton).toBeVisible();

    // 点击执行收藏
    await favButton.click();
    // 验证收藏状态响应式切换，且不会破坏公共文件
    await expect(firstCard.locator('button[aria-label="取消收藏"]')).toBeVisible();

    // 再次点击取消收藏
    await firstCard.locator('button[aria-label="取消收藏"]').click();
    await expect(firstCard.locator('button[aria-label="收藏"]')).toBeVisible();

    // 公共数据文件必须保持绝对一致（个人状态完全走云端，不污染静态 radar.json）
    const currentMd5 = createHash('md5').update(readFileSync('data/radar.json')).digest('hex');
    expect(currentMd5).toBe(radarMd5);
  });

  test('退出登录后立即撤销权限并恢复访问守卫', async ({ page }) => {
    await loginAsTestUser(page, { userName: 'octocat' });
    await page.goto('/resources/');
    await expect(page.getByText('octocat')).toBeVisible();

    // 点击退出登录
    await page.getByRole('button', { name: '退出登录' }).click();

    // 应立即回到未登录守卫视图
    await expect(page.getByText('私密多端云同步系统')).toBeVisible();
    await expect(page.getByRole('button', { name: '使用 GitHub 授权登录' })).toBeVisible();
  });

  test('资源库: 平台详情页在登录态下可正常访问并展示活动细节', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/resources/');

    await page.getByRole('link', { name: platform.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/platforms/${platform.slug}/`));
    await expect(page.getByRole('heading', { name: platform.name, exact: true })).toBeVisible();

    // 详情页应展示该平台的权益标题
    if (offer) {
      await expect(page.getByText(offer.title).first()).toBeVisible();
    }
  });
});
