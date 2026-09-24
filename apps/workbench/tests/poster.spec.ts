import { expect, test } from '@playwright/test';

test('poster example renders reusable widgets and editable appearance', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto('/?example=emotion');
  await expect(page.locator('.poster-header h1')).toHaveText('From Emotion to Better Decisions');
  await expect(page.locator('.poster-grid [data-block-id]')).toHaveCount(8);
  await expect(page.locator('.poster-flow-lane')).toHaveCount(2);
  await expect(page.locator('.poster-stage')).toHaveCount(11);
  expect(await page.locator('.poster-icon').count()).toBeGreaterThan(0);
  await expect(page.locator('.poster-brain').first()).not.toContainText('brain');
  await expect(page.locator('.validation-status')).toContainText('Valid IR');

  await page.getByRole('combobox', { name: 'Infographic shape' }).selectOption('angular');
  await expect(page.locator('.poster-infographic')).toHaveClass(/infographic--angular/);
  await page.getByRole('combobox', { name: 'Infographic theme' }).selectOption('editorial');
  await expect(page.locator('.poster-infographic')).toHaveClass(/infographic--editorial/);
  const source = JSON.parse(await page.getByRole('textbox', { name: 'Infographic JSON' }).inputValue());
  expect(source.shape).toBe('angular');
  expect(source.style).toBe('editorial');
  expect(source.blocks[0].type).toBe('poster-card');
});

test('poster fields get path-specific validation errors', async ({ page }) => {
  await page.goto('/?example=emotion');
  const editor = page.getByRole('textbox', { name: 'Infographic JSON' });
  const source = JSON.parse(await editor.inputValue());
  source.blocks[0].points[0].text = '';
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.validation-status')).toContainText('$.blocks[0].points[0].text');
  await expect(page.locator('.invalid-preview')).toBeVisible();
});
