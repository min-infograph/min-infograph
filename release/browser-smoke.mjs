import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(releaseDir, '..');
const { version } = JSON.parse(await readFile(resolve(releaseDir, 'out/package/package.json'), 'utf8'));
const requireWorkbench = createRequire(resolve(repoDir, 'apps/workbench/package.json'));
const { chromium } = requireWorkbench('@playwright/test');
const sample = JSON.parse(await readFile(resolve(repoDir, 'apps/workbench/src/examples/ai-agent.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('about:blank');
  await page.addStyleTag({ path: resolve(releaseDir, 'out/package/styles.css') });
  await page.addScriptTag({ path: resolve(releaseDir, `out/assets/min-infograph-core-${version}.browser.js`) });
  const result = await page.evaluate((documentJson) => {
    const api = window.MinInfograph;
    if (!api || typeof api.render !== 'function' || typeof api.validateIR !== 'function') {
      throw new Error('Browser bundle did not expose MinInfograph.render and validateIR');
    }
    const mount = document.createElement('div');
    document.body.append(mount);
    api.render(mount, documentJson);
    return api.validateIR(documentJson).title;
  }, sample);
  await page.getByText('Inside an AI Agent').first().waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.diagram-stage')].every(stage => stage.querySelector('.mermaid-svg svg, .diagram-error')), null, { timeout: 60000 });
  const expectedDiagrams = sample.blocks.filter(block => block.type === 'mermaid').length;
  if (await page.locator('.mermaid-svg svg').count() !== expectedDiagrams || await page.locator('.diagram-error').count()) throw new Error('Browser bundle diagrams failed');
  if (result !== 'Inside an AI Agent' || errors.length) {
    throw new Error(`Browser bundle failed: ${errors.join('; ')}`);
  }
  console.log('Static browser bundle validated and rendered a document');
} finally {
  await browser.close();
}
