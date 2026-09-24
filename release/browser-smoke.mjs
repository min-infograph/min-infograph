import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(releaseDir, '..');
const requireWorkbench = createRequire(resolve(repoDir, 'apps/workbench/package.json'));
const { chromium } = requireWorkbench('@playwright/test');
const sample = JSON.parse(await readFile(resolve(repoDir, 'apps/workbench/src/examples/ai-agent.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('about:blank');
  await page.addScriptTag({ path: resolve(releaseDir, 'out/assets/min-infograph-core-0.2.1.browser.js') });
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
  if (result !== 'Inside an AI Agent' || errors.length) {
    throw new Error(`Browser bundle failed: ${errors.join('; ')}`);
  }
  console.log('Static browser bundle validated and rendered a document');
} finally {
  await browser.close();
}
