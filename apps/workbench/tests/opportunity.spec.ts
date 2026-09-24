import { expect, test } from '@playwright/test';

const exampleUrl = '/?example=opportunity';

test('image-backed opportunity poster loads local assets and remains editable', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto(exampleUrl);
  await expect(page.locator('.poster-header h1')).toHaveText('From Doing the Same to Unlocking the New');
  await expect(page.locator('.poster-visual-card')).toHaveCount(3);
  await expect(page.locator('.poster-visual-story')).toHaveCount(3);
  const images = await page.locator('.poster-image-frame img').evaluateAll(nodes => nodes.map(node => {
    const image = node as HTMLImageElement;
    return { src: image.getAttribute('src'), alt: image.alt, loaded: image.complete && image.naturalWidth > 0 };
  }));
  expect(images).toHaveLength(6);
  expect(images.every(image => image.loaded && image.alt && image.src?.startsWith('/assets/'))).toBe(true);
  await page.getByRole('combobox', { name: 'Infographic shape' }).selectOption('angular');
  await expect(page.locator('.poster-infographic')).toHaveClass(/infographic--angular/);
  const source = JSON.parse(await page.getByRole('textbox', { name: 'Infographic JSON' }).inputValue());
  expect(source.blocks[0].image.src).toBe('/assets/automation.png');
});

test('image paths are validated and missing files show a fallback', async ({ page }) => {
  await page.goto(exampleUrl);
  const editor = page.getByRole('textbox', { name: 'Infographic JSON' });
  const source = JSON.parse(await editor.inputValue());
  source.blocks[0].image.src = 'javascript:alert(1)';
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.validation-status')).toContainText('$.blocks[0].image.src');
  source.blocks[0].image.src = '/assets/missing.png';
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.poster-image-error').first()).toHaveText('Image unavailable');
  await expect(page.locator('.validation-status')).toContainText('Valid IR');
});

test('the regular grid can include an image block', async ({ page }) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Infographic JSON' });
  const source = JSON.parse(await editor.inputValue());
  source.blocks.push({ id: 'illustration', type: 'image', span: 2, image: { src: '/assets/automation.png', alt: 'Person and robot at a laptop', fit: 'contain' }, caption: 'Reusable illustration' });
  await editor.fill(JSON.stringify(source));
  await expect(page.locator('.grid-image-block img')).toBeVisible();
  await expect(page.locator('.grid-image-block figcaption')).toHaveText('Reusable illustration');
});

test('the opportunity poster fits the phone preview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(exampleUrl);
  await page.getByRole('button', { name: 'Fit' }).click();
  const frame = await page.locator('.zoom-pan-viewport').boundingBox();
  const content = await page.locator('.zoom-pan-content').boundingBox();
  expect(frame).not.toBeNull();
  expect(content).not.toBeNull();
  expect(content!.width).toBeLessThanOrEqual(frame!.width + 1);
  expect(content!.height).toBeLessThanOrEqual(frame!.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
