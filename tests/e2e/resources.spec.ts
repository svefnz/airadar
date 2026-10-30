import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loginAsTestUser, waitForHydration } from './helpers/auth';
import { appUrl } from './helpers/url';

const radar = JSON.parse(readFileSync('data/radar.json', 'utf8'));
const firstPlatform = radar.platforms[0];

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('资源库: 搜索过滤并同步 URL', async ({ page }) => {
  await page.goto(appUrl('/resources/'));
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();

  // 搜索真实存在的平台名
  await page.getByPlaceholder(/搜索平台/).fill(firstPlatform.name);
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator('article').first()).toBeVisible();

  // 叠加“原生 API”筛选
  const apiChip = page.getByRole('button', { name: '原生 API' });
  if (await apiChip.count()) {
    await apiChip.first().click();
    await expect(page).toHaveURL(/access=api/);
  }
});

test('资源库: 筛选芯片可组合、可清除', async ({ page }) => {
  await page.goto(appUrl('/resources/'));
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();

  const noCardChip = page.getByRole('button', { name: '无需绑卡' });
  if (await noCardChip.count()) {
    await noCardChip.first().click();
    await expect(page).toHaveURL(/billing=none/);
  }

  await page.getByRole('button', { name: /重置/ }).click();
  await expect(page.locator('article').first()).toBeVisible();
  // 清除后恢复全量(URL 参数清空)
  await expect(page).not.toHaveURL(/billing=none/);
});

test('资源库: 收件箱处理状态过滤（未处理 / 已收藏 / 已跳过 / 全部）', async ({ page }) => {
  await page.goto(appUrl('/resources/'));
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();

  // 默认处于“未处理”状态
  const unprocessedBtn = page.getByRole('button', { name: /未处理/ });
  await expect(unprocessedBtn).toBeVisible();

  // 切换到“已收藏”
  await page.getByRole('button', { name: /已收藏/ }).click();
  await expect(page).toHaveURL(/disposition=favorited/);

  // 切换到“已跳过”
  await page.getByRole('button', { name: /已跳过/ }).click();
  await expect(page).toHaveURL(/disposition=passed/);

  // 切换到“全部”
  await page.getByRole('button', { name: '全部' }).click();
  await expect(page).toHaveURL(/disposition=all/);
});
