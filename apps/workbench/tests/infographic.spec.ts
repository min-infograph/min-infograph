import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 800, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: examples render without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 15_000 });
    await expect(page.locator('.diagram-error')).toHaveCount(0);
    await page.screenshot({ path: `artifacts/${viewport.name}-agent.png`, fullPage: true });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);

    if (viewport.name !== 'mobile') {
      const ids = await page.locator('.mermaid-svg [id]').evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(new Set(ids).size).toBe(ids.length);
    }

    if (viewport.name === 'desktop') {
      await page.getByRole('button', { name: /Temporal/ }).click();
      await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 15_000 });
      await expect(page.locator('.diagram-error')).toHaveCount(0);
      await page.screenshot({ path: 'artifacts/desktop-temporal.png', fullPage: true });
      const editor = page.getByRole('textbox', { name: 'Infographic JSON' });
      await editor.fill((await editor.inputValue()).replace('Temporal: Durable Execution', 'Temporal: Edited IR'));
      await expect(page.locator('.infographic-hero h1')).toHaveText('Temporal: Edited IR');
      await page.getByRole('button', { name: /Measure 1 \/ 5 \/ 10/ }).click();
      await expect(page.locator('.benchmark-results > div')).toHaveCount(3, { timeout: 30_000 });
      console.log('Render benchmark:', await page.locator('.benchmark-results').innerText());
    }
  });
}
