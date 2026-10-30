import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loginAsTestUser, waitForHydration } from './helpers/auth';

const radar = JSON.parse(readFileSync('data/radar.json', 'utf8'));
const firstPlatform = radar.platforms[0];
const firstOffer = radar.offers.find((o: { platformId: string }) => o.platformId === firstPlatform.id);

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test('资源库: 搜索过滤并同步 URL', async ({ page }) => {
  await page.goto('/resources/');
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();

  const total = await page.locator('article').count();
  expect(total).toBeGreaterThan(0);

  // 搜索真实存在的平台名
  await page.getByPlaceholder(/搜索平台/).fill(firstPlatform.name);
  await expect(page).toHaveURL(/q=/);
  const searched = await page.locator('article').count();
  expect(searched).toBeGreaterThan(0);
  expect(searched).toBeLessThanOrEqual(total);

  // 再叠加“原生 API”筛选：结果不应多于搜索结果
  const beforeFilter = searched;
  const apiChip = page.getByRole('button', { name: '原生 API' });
  if (await apiChip.count()) {
    await apiChip.first().click();
    await expect(page).toHaveURL(/access=api/);
    const afterFilter = await page.locator('article').count();
    expect(afterFilter).toBeLessThanOrEqual(beforeFilter);
  }
});

test('资源库: 筛选芯片可组合、可清除', async ({ page }) => {
  await page.goto('/resources/');
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();
  const before = await page.locator('article').count();

  const clientChip = page.getByRole('button', { name: '客户端专用' });
  if (await clientChip.count()) {
    await clientChip.first().click();
    const after = await page.locator('article').count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  }

  await page.getByRole('button', { name: /重置全部筛选/ }).click();
  await expect(page.locator('article').first()).toBeVisible();
  // 清除后恢复全量(URL 参数清空)
  await expect(page).not.toHaveURL(/\?/);
});

test('资源库: 视图切换与排序', async ({ page }) => {
  await page.goto('/resources/');
  await waitForHydration(page);
  await expect(page.locator('article').first()).toBeVisible();
  await page.getByRole('button', { name: /紧凑列表表格视图/ }).click();
  await page.getByLabel('排序方式').click();
  await page.getByRole('option', { name: '平台名称' }).click();
});
