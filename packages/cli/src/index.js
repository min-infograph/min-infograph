#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { validateIR } from '@min-infograph/ir';

const [command, ...args] = process.argv.slice(2);
if (!command || command === 'help' || command === '--help') {
  console.log('min-infograph validate <file.json>\nmin-infograph render <file.json> [output.png]');
  process.exit(0);
}
if (!['validate', 'render'].includes(command)) {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
if (!args[0]) {
  console.error(`Usage: min-infograph ${command} <file.json>${command === 'render' ? ' [output.png]' : ''}`);
  process.exit(2);
}
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
let inputPath = resolve(args[0]);
let ir;
try {
  let raw;
  try { raw = await readFile(inputPath, 'utf8'); }
  catch { inputPath = resolve(repoRoot, args[0]); raw = await readFile(inputPath, 'utf8'); }
  ir = validateIR(JSON.parse(raw));
}
catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
if (command === 'validate') {
  console.log(`Valid infographic: ${ir.title} (${ir.blocks.length} blocks)`);
  process.exit(0);
}
const outputPath = resolve(args[1] ?? `${inputPath.replace(/\.json$/i, '')}.png`);
if (!outputPath.toLowerCase().endsWith('.png')) {
  console.error('The current renderer exports PNG images; choose an output path ending in .png.');
  process.exit(2);
}
const appRoot = resolve(repoRoot, 'apps/workbench');
let server;
let browser;
try {
  server = await createServer({ root: appRoot, configFile: resolve(appRoot, 'vite.config.ts'), server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine the local preview address.');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const payload = Buffer.from(JSON.stringify(ir)).toString('base64url');
  await page.goto(`http://127.0.0.1:${address.port}/?render=${payload}`, { waitUntil: 'networkidle' });
  await page.locator('.infographic').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => {
    const diagrams = [...document.querySelectorAll('.diagram-stage')];
    return diagrams.every((stage) => stage.querySelector('.mermaid-svg svg, .diagram-error'));
  }, null, { timeout: 60000 });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const expectedImages = ir.blocks.filter((block) => block.type === 'image' || ['poster-image', 'poster-visual-card', 'poster-visual-story'].includes(block.type)).length;
  const renderedImages = await page.locator('.poster-image-frame img').count();
  if (renderedImages !== expectedImages) throw new Error(`Expected ${expectedImages} loaded images, found ${renderedImages}.`);
  const renderedDiagrams = await page.locator('.mermaid-svg svg').count();
  const expectedDiagrams = ir.blocks.filter((block) => block.type === 'mermaid').length;
  if (renderedDiagrams !== expectedDiagrams) throw new Error(`Expected ${expectedDiagrams} rendered diagrams, found ${renderedDiagrams}.`);
  const diagramErrors = await page.locator('.diagram-error').allTextContents();
  if (diagramErrors.length) throw new Error(diagramErrors.join('\n'));
  await page.locator('.infographic').screenshot({ path: outputPath, animations: 'disabled' });
  console.log(`Rendered ${basename(inputPath)} to ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (String(error).includes('Executable doesn’t exist') || String(error).includes('Executable doesn\'t exist')) {
    console.error('Install Chromium with: pnpm exec playwright install chromium');
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
