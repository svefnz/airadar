import { expect, test } from '@playwright/test';

/**
 * 视觉回归辅助: 关键页截图(浅色/深色), 供人工比对语义色与排版。
 * 不自动断言像素, 仅产出图像。
 */
test('截图: 首页/资源库/平台详情(浅色+深色)', async ({ page }, testInfo) => {
  const shots: Array<[string, boolean]> = [
    ['/', false],
    ['/', true],
    ['/resources/', false],
    ['/resources/', true],
  ];
  for (const [path, dark] of shots) {
    await page.goto(path);
    if (dark) {
      await page.evaluate(() => document.documentElement.classList.add('dark'));
    }
    await page.waitForTimeout(600);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: `${testInfo.outputDir}/${dark ? 'dark' : 'light'}${path.replaceAll('/', '_')}.png`, fullPage: true });
  }
});
