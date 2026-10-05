import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { readFile } from 'node:fs/promises';
import type { InfographicProps } from '@min-infograph/renderer';

let server: ViteDevServer;
let renderer: typeof import('@min-infograph/renderer');
const grid: InfographicProps['ir'] = { version: '0.1', title: 'SSR grid', style: 'technical', shape: 'rounded', layout: { type: 'grid', columns: 2 }, blocks: [
  { id: 'diagram', type: 'mermaid', title: 'Diagram title', diagram: 'flowchart LR\n A[Alpha] --> B[Beta]' },
  { id: 'text', type: 'text', title: 'Text title', text: 'Body copy' },
  { id: 'callout', type: 'callout', title: 'Callout title', text: 'Callout copy' },
] };
const ssr = (props: InfographicProps) => renderToString(createElement(renderer.Infographic, props));

test.beforeAll(async () => {
  server = await createServer({ server: { middlewareMode: true } });
  renderer = await server.ssrLoadModule('../../packages/renderer/src/index.ts') as typeof import('@min-infograph/renderer');
});
test.afterAll(async () => { await server?.close(); });

test('SSR has stable placeholders and relative headings; no-DOM Mermaid fails clearly', async () => {
  expect(typeof window).toBe('undefined');
  for (const headingLevel of [1, 2, 3, 4, 5, 6] as const) {
    const markup = ssr({ ir: grid, headingLevel });
    expect(markup).toContain(`<h${headingLevel} `);
    expect(markup.match(new RegExp(`<h${Math.min(6, headingLevel + 1)} `, 'g'))).toHaveLength(headingLevel === 6 ? 4 : 3);
    expect(markup).not.toContain('<h7');
  }
  const html = ssr({ ir: grid });
  expect(html).toContain('<h1');
  expect(html.match(/<h2/g)).toHaveLength(3);
  expect(html).toContain('Rendering diagram…');
  expect(html).not.toContain('<svg');
  await expect(renderer.renderMermaid('flowchart LR\n A-->B')).rejects.toThrow('requires a browser DOM');
  for (const file of ['emotion-decisions', 'opportunity-ai']) {
    const ir = JSON.parse(await readFile(new URL(`../src/examples/${file}.json`, import.meta.url), 'utf8'));
    const markup = ssr({ ir, headingLevel: 5 });
    expect(markup).toContain('<h5');
    expect(markup).toContain('<h6');
    expect(markup).not.toMatch(/<h[1-4]|<h7/);
    const defaults = ssr({ ir });
    expect(defaults).toContain('<h1');
    expect(defaults).toContain('<h2');
    if (file === 'emotion-decisions') expect(defaults).toContain('<h3');
  }
});

for (const width of [390, 1440]) test(`SSR hydrates without mismatch at ${width}px and updates responsive Mermaid`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/fixtures/integration.html');
  await page.waitForFunction(() => window.integration);
  const props = { ir: grid, headingLevel: 5 as const };
  await page.evaluate(({ html, props }) => window.integration.hydrate(html, props), { html: ssr(props), props });
  await expect(page.locator('#mount h5')).toHaveText('SSR grid');
  await expect(page.locator('#mount h6')).toHaveCount(3);
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(1, { timeout: 20000 });
  const direction = await page.locator('.mermaid-svg svg').getAttribute('viewBox');
  await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 });
  await expect(page.locator('.mermaid-svg svg')).not.toHaveAttribute('viewBox', direction!);
  expect(await page.evaluate(() => window.integration.errors)).toEqual([]);
  expect(errors).toEqual([]);
});

test('instance tokens affect grid/poster and Mermaid palettes without leaking into siblings or the host', async ({ page }) => {
  await page.goto('/tests/fixtures/integration.html');
  await page.waitForFunction(() => window.integration);
  const hostBefore = await page.locator('#host-title, #host-button, #host-tone, #host-heading').evaluateAll(els => els.map(el => { const s = getComputedStyle(el); return [s.fontFamily, s.backgroundColor, s.color, s.boxSizing]; }));
  const poster = JSON.parse(await readFile(new URL('../src/examples/emotion-decisions.json', import.meta.url), 'utf8'));
  const theme = { colors: { background: '#123456', ink: '#abcdef', accent: '#ff00aa' }, typography: { fontFamily: 'Georgia', headingFontFamily: 'Georgia', titleSize: '33px' }, spacing: { blockGap: '27px', padding: '31px' }, mermaid: { primaryColor: '#aabbcc', primaryBorderColor: '#cc00cc' } };
  await page.evaluate(props => window.integration.mount(props), [{ ir: grid, theme }, { ir: grid }, { ir: poster, theme }, { ir: poster }]);
  await expect(page.locator('.infographic')).toHaveCount(4);
  const articles = page.locator('.infographic');
  for (const index of [0, 2]) {
    await expect(articles.nth(index)).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await expect(articles.nth(index).locator('.min-infograph-heading--0')).toHaveCSS('font-size', '33px');
    await expect(articles.nth(index).locator('.infographic-body, .poster-grid')).toHaveCSS('gap', '27px');
    await expect(articles.nth(index).locator('.min-infograph-heading--1').first()).toHaveCSS('font-family', 'Georgia');
  }
  await expect(articles.nth(1)).toHaveCSS('background-color', 'rgb(246, 247, 243)');
  await expect(articles.nth(3).locator('.poster-grid')).toHaveCSS('gap', '9px');
  await expect(articles.nth(3).locator('.poster-header .min-infograph-heading--0')).toHaveCSS('font-size', '42px');
  await expect(articles.nth(3).locator('.poster-card .poster-section-head p').first()).toHaveCSS('font-size', '20px');
  await expect(articles.nth(0).locator('.infographic-body')).toHaveCSS('padding', '31px');
  await expect(articles.nth(2)).toHaveCSS('padding', '31px');
  await expect(articles.nth(1).locator('.callout-content p')).toHaveCSS('font-size', '20px');
  await expect(articles.nth(0).locator('.poster-icon')).toHaveCount(0);
  await expect(page.locator('.mermaid-svg svg')).toHaveCount(2, { timeout: 20000 });
  await expect(articles.nth(0).locator('.node rect').first()).toHaveCSS('fill', 'rgb(170, 187, 204)');
  await expect(articles.nth(1).locator('.node rect').first()).toHaveCSS('fill', 'rgb(226, 240, 238)');
  const hostAfter = await page.locator('#host-title, #host-button, #host-tone, #host-heading').evaluateAll(els => els.map(el => { const s = getComputedStyle(el); return [s.fontFamily, s.backgroundColor, s.color, s.boxSizing]; }));
  expect(hostAfter).toEqual(hostBefore);
  await expect(page.locator('#host-tone')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('#host-tone')).toHaveCSS('box-sizing', 'content-box');
  await expect(page.locator('body')).toHaveCSS('margin', '8px');
  await expect(page.locator('#host-heading')).toHaveCSS('font-family', '"Times New Roman"');
  const css = await readFile(new URL('../../../packages/renderer/dist/styles.css', import.meta.url), 'utf8');
  expect(css).not.toMatch(/@import|fonts.googleapis|:root|\.app-shell|\.editor-panel|\.workspace\{/);
});

test('concurrent Mermaid renders keep strict security and independent per-render palettes', async ({ page }) => {
  await page.goto('/tests/fixtures/integration.html');
  await page.waitForFunction(() => window.integration);
  const result = await page.evaluate(async () => {
    const render = window.integration.renderMermaid;
    const diagram = 'flowchart LR\n A[Alpha] --> B[Beta]';
    const svgs = await Promise.all([
      render(diagram, 'technical', 'rounded', undefined, { mermaid: { primaryColor: '#112233' } }),
      render(diagram, 'technical', 'rounded', undefined, { mermaid: { primaryColor: '#445566' } }),
      render(diagram),
    ]);
    const colors = svgs.map(svg => { const div = document.createElement('div'); div.innerHTML = svg; return div.querySelector('style')!.textContent; });
    // Strict Mermaid removes executable label markup, including when diagram configuration tries to loosen security.
    const unsafe = await render('---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\n A["<img src=x onerror=alert(1) />"]');
    const container = document.createElement('div'); container.innerHTML = unsafe;
    return { colors, executable: container.querySelectorAll('script, [onerror], [onclick]').length };
  });
  expect(result.colors[0]).toContain('#112233');
  expect(result.colors[1]).toContain('#445566');
  expect(result.colors[2]).toContain('#e2f0ee');
  expect(result.executable).toBe(0);
});
