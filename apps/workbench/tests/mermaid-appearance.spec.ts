import { expect, test } from '@playwright/test';

const url = '/?example=mermaid';

test('font and node shape controls change the first Mermaid SVG and its IR', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1100 });
  await page.goto(url);
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 20_000 });
  const first = page.locator('.mermaid-svg svg').first();
  const second = page.locator('.mermaid-svg svg').nth(1);
  await expect(first.locator('.node[id*="-Build-"] .label-container')).toHaveJSProperty('tagName', 'polygon');
  await expect(second.locator('.node[id*="-Build-"] .label-container')).toHaveJSProperty('tagName', 'rect');
  expect(await first.locator('style').textContent()).toContain('font-size:22px');
  expect(await second.locator('style').textContent()).toContain('font-size:13px');
  await expect.poll(() => first.locator('.node[id*="-Build-"] .label-container').evaluate((node) => getComputedStyle(node).filter)).toContain('drop-shadow');
  await expect.poll(() => first.locator('.node[id*="-Choice-"] .label-container').evaluate((node) => getComputedStyle(node).filter)).toContain('drop-shadow');
  expect(await second.locator('.node[id*="-Build-"] .label-container').evaluate((node) => getComputedStyle(node).filter)).toBe('none');

  await page.getByRole('slider', { name: 'Mermaid font size' }).focus();
  await page.getByRole('slider', { name: 'Mermaid font size' }).press('End');
  await expect.poll(async () => first.locator('style').textContent()).toContain('font-size:28px');
  expect(await second.locator('style').textContent()).toContain('font-size:13px');

  await page.getByRole('combobox', { name: 'Mermaid node shape for Build' }).selectOption('rect');
  await expect(first.locator('.node[id*="-Build-"] .label-container')).toHaveJSProperty('tagName', 'rect');
  await page.getByRole('combobox', { name: 'Mermaid node effect for Build' }).selectOption('coral-glow');
  await expect.poll(() => first.locator('.node[id*="-Build-"] .label-container').evaluate((node) => getComputedStyle(node).filter)).toContain('232, 100, 78');
  const source = JSON.parse(await page.getByRole('textbox', { name: 'Infographic JSON' }).inputValue());
  expect(source.blocks[0].appearance.fontSize).toBe(28);
  expect(source.blocks[0].appearance.nodeShapes.Build).toBe('rect');
  expect(source.blocks[0].appearance.nodeEffects.Build).toBe('coral-glow');
  expect(source.blocks[1].appearance.fontSize).toBe(13);
});

test('appearance fields receive path-specific validation errors', async ({ page }) => {
  await page.goto(url);
  const editor = page.getByRole('textbox', { name: 'Infographic JSON' });
  const source = JSON.parse(await editor.inputValue());
  source.blocks[0].appearance.fontSize = 80;
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.validation-status')).toContainText('$.blocks[0].appearance.fontSize');
  source.blocks[0].appearance.fontSize = 20;
  source.blocks[0].appearance.nodeShapes.Build = 'spaceship';
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.validation-status')).toContainText('$.blocks[0].appearance.nodeShapes.Build');
  source.blocks[0].appearance.nodeShapes.Build = 'hex';
  source.blocks[0].appearance.nodeEffects.Build = 'laser';
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.validation-status')).toContainText('$.blocks[0].appearance.nodeEffects.Build');
});
