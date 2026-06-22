const { test, expect } = require('@playwright/test');

const html = 'index.html';

test.beforeEach(async ({ page }) => {
  await page.goto(`file://${process.cwd()}/${html}`);
});

test('shows route stats and responds to clear button', async ({ page }) => {
  await expect(page.locator('#distance')).toHaveText('—');
  await expect(page.locator('#elevation')).toHaveText('—');
  await expect(page.locator('#weather')).toHaveText('—');
  await expect(page.locator('#wind')).toHaveText('—');

  await page.fill('#owmKey', 'TEST_KEY');
  await expect(page.locator('#owmKey')).toHaveValue('TEST_KEY');

  await page.click('#btnClear');
  await expect(page.locator('#distance')).toHaveText('—');
});

test('can compute elevation gain helper via window helper', async ({ page }) => {
  const result = await page.evaluate(() => window._rc.computeElevationGain([100, 150, 130, 160]));
  expect(result).toBe(80);
});
