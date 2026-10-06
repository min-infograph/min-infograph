#!/usr/bin/env node
import { readFile, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { validateIR } from '../dist/ir/index.js';

const [command, ...args] = process.argv.slice(2);
const help = `min-infograph validate <file.json>
min-infograph render <file.json> [output.png]
min-infograph install-browser [--with-deps]

Install Chromium explicitly before rendering: min-infograph install-browser
Local /assets/... images resolve below <JSON directory>/assets/.
Only PNG export is supported. Node.js 22.14+ is required.`;
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
let server;
let browser;
try {
  if (!command || ['help', '--help', '-h'].includes(command)) console.log(help);
  else if (command === 'install-browser') {
    if (args.some(arg => arg !== '--with-deps')) throw new Error(help);
    const executable = fileURLToPath(new URL('./cli.js', import.meta.resolve('playwright/package.json')));
    const result = spawnSync(process.execPath, [executable, 'install', 'chromium', ...args], { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } else {
    if (!['validate', 'render'].includes(command) || !args[0] || args.length > (command === 'render' ? 2 : 1)) throw new Error(help);
    const inputPath = resolve(args[0]);
    const ir = validateIR(JSON.parse(await readFile(inputPath, 'utf8')));
    if (command === 'validate') console.log(`Valid infographic: ${ir.title} (${ir.blocks.length} blocks)`);
    else {
      const outputPath = resolve(args[1] ?? `${inputPath.replace(/\.json$/i, '')}.png`);
      if (!outputPath.toLowerCase().endsWith('.png')) throw new Error('Choose an output path ending in .png.');
      const assetsRoot = resolve(dirname(inputPath), 'assets');
      const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><style>body{margin:0;padding:24px;background:#fff}</style><div id="mount"></div><script src="/browser.js"></script><script>fetch('/document.json').then(r=>r.json()).then(ir=>MinInfograph.render(document.getElementById('mount'),ir));</script>`;
      server = createServer(async (req, res) => {
        try {
          const path = new URL(req.url, 'http://localhost').pathname;
          let body;
          let type;
          if (path === '/') { body = html; type = 'text/html'; }
          else if (path === '/document.json') { body = JSON.stringify(ir); type = 'application/json'; }
          else if (['/browser.js', '/styles.css'].includes(path)) {
            body = await readFile(resolve(packageRoot, 'dist', path.slice(1)));
            type = path.endsWith('.js') ? 'text/javascript' : 'text/css';
          } else if (/^\/assets\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(png|jpe?g|webp)$/i.test(path)) {
            const root = await realpath(assetsRoot);
            const target = await realpath(resolve(assetsRoot, path.slice('/assets/'.length)));
            if (!target.startsWith(root + sep)) throw new Error('Asset outside assets directory');
            body = await readFile(target);
            type = /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg';
          } else { res.writeHead(404).end(); return; }
          res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
        } catch { res.writeHead(404).end(); }
      });
      await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('response', response => {
        if (new URL(response.url()).pathname.startsWith('/assets/') && !response.ok()) errors.push(`Failed to load image: ${new URL(response.url()).pathname}`);
      });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
      await page.locator('.infographic').waitFor({ state: 'visible' });
      await page.waitForFunction(() => [...document.querySelectorAll('.diagram-stage')].every(stage => stage.querySelector('.mermaid-svg svg, .diagram-error')), null, { timeout: 60000 });
      await page.waitForFunction(() => [...document.images].every(image => image.complete), null, { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      const broken = await page.evaluate(() => [...document.images].filter(image => !image.naturalWidth).map(image => image.getAttribute('src')));
      const diagramErrors = await page.locator('.diagram-error').allTextContents();
      if (await page.locator('.poster-image-error').count()) errors.push('Failed to load image: renderer reported an unavailable asset');
      const expectedImages = ir.blocks.filter(block => 'image' in block).length;
      if (await page.locator('.poster-image-frame img').count() !== expectedImages) errors.push('Missing rendered images');
      if (broken.length || diagramErrors.length || errors.length) throw new Error([...broken.map(src => `Failed to load image: ${src}`), ...diagramErrors, ...errors].join('\n'));
      if (await page.locator('.mermaid-svg svg').count() !== ir.blocks.filter(block => block.type === 'mermaid').length) throw new Error('Missing rendered diagrams');
      await page.locator('.infographic').screenshot({ path: outputPath, animations: 'disabled' });
      console.log(`Rendered ${basename(inputPath)} to ${outputPath}`);
    }
  }
} catch (error) {
  console.error(error.message ?? String(error));
  if (/Executable doesn.t exist/.test(String(error))) console.error('Install Chromium with: min-infograph install-browser');
  process.exitCode = 1;
} finally {
  try { await browser?.close(); }
  finally { if (server) await new Promise((done, reject) => server.close(error => error ? reject(error) : done())); }
}
