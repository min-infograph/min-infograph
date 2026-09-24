import { expect, test } from '@playwright/test';

test('theme and shape controls update the JSON and rendered infographic', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: /Style study/ }).click();
  const infographic = page.locator('.infographic');
  await expect(infographic).toHaveClass(/infographic--editorial/);
  await expect(infographic).toHaveClass(/infographic--angular/);
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 15_000 });
  await page.screenshot({ path: 'artifacts/style-study-new.png', fullPage: true });

  await page.getByRole('combobox', { name: 'Infographic theme' }).selectOption('technical');
  await page.getByRole('combobox', { name: 'Infographic shape' }).selectOption('rounded');
  await expect(infographic).toHaveClass(/infographic--technical/);
  await expect(infographic).toHaveClass(/infographic--rounded/);
  const source = JSON.parse(await page.getByRole('textbox', { name: 'Infographic JSON' }).inputValue());
  expect(source.style).toBe('technical');
  expect(source.shape).toBe('rounded');
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 15_000 });
  await expect(page.locator('.diagram-error')).toHaveCount(0);
});

test('zoom controls and drag pan make the preview navigable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.zoom-pan-level')).toHaveText('100%');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.locator('.zoom-pan-level')).toHaveText('120%');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile-zoom-new.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const content = page.locator('.zoom-pan-content');
  const before = await content.getAttribute('style');
  const viewport = page.locator('.zoom-pan-viewport');
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 - 100, box!.y + box!.height / 2 - 100, { steps: 5 });
  await page.mouse.up();
  await expect(content).not.toHaveAttribute('style', before!);

  await page.getByRole('button', { name: 'Fit' }).click();
  await expect(page.locator('.zoom-pan-level')).not.toHaveText('120%');
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(page.locator('.zoom-pan-level')).toBeVisible();
});

test('Fit shows the whole infographic on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Fit' }).click();
  const frame = await page.locator('.zoom-pan-viewport').boundingBox();
  const content = await page.locator('.zoom-pan-content').boundingBox();
  expect(frame).not.toBeNull();
  expect(content).not.toBeNull();
  expect(content!.width).toBeLessThanOrEqual(frame!.width + 1);
  expect(content!.height).toBeLessThanOrEqual(frame!.height + 1);
});
