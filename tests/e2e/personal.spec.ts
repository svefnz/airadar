import { expect, test } from '@playwright/test';

test('个人状态: 收藏与已领取在刷新后保留', async ({ page }) => {
  await page.goto('/resources/');
  const firstCard = page.locator('article').first();

  await firstCard.getByRole('button', { name: '收藏' }).click();
  await firstCard.getByRole('button', { name: '领取' }).click();

  // 按钮状态切换
  await expect(firstCard.getByRole('button', { name: '已领取' })).toBeVisible();

  // 刷新后仍保留(仅当前浏览器)
  await page.reload();
  const card = page.locator('article').first();
  await expect(card.getByRole('button', { name: '已领取' })).toBeVisible();
  await expect(card.getByRole('button', { name: '取消收藏' })).toBeVisible();
});

test('资源库: 平台详情页可打开并展示活动细节', async ({ page }) => {
  await page.goto('/resources/');
  await page.getByRole('link', { name: 'NebulaForge' }).first().click();
  await expect(page).toHaveURL(/\/platforms\/nebulaforge\//);
  await expect(page.getByRole('heading', { name: 'NebulaForge' })).toBeVisible();
  await expect(page.getByText('注册赠送 $10 API Credits')).toBeVisible();
  await expect(page.getByText('未确认').first()).toBeVisible();
});
