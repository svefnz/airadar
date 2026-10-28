import { expect, test } from '@playwright/test';

test('资源库: 搜索过滤并同步 URL', async ({ page }) => {
  await page.goto('/resources/');
  await page.getByPlaceholder(/搜索平台/).fill('Nebula');
  await expect(page).toHaveURL(/q=Nebula/);
  await expect(page.locator('article')).toHaveCount(3);
  await expect(page.getByText('CodePilot')).toHaveCount(0);

  await page.getByRole('button', { name: '原生 API' }).click();
  await expect(page).toHaveURL(/access=api/);
  // Nebula 的 3 个活动均为 api, 数量不变
  await expect(page.locator('article')).toHaveCount(3);
});

test('资源库: 筛选芯片可组合、可清除', async ({ page }) => {
  await page.goto('/resources/');
  const before = await page.locator('article').count();
  await page.getByRole('button', { name: '客户端专用' }).click();
  const after = await page.locator('article').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(page.locator('article')).toHaveCount(before);
});

test('资源库: 视图切换与排序', async ({ page }) => {
  await page.goto('/resources/');
  await page.getByRole('button', { name: '紧凑列表视图' }).click();
  await expect(page.locator('article').first()).toBeVisible();
  await page.getByLabel('排序方式').selectOption('name');
  await expect(page.getByLabel('排序方式')).toHaveValue('name');
});
