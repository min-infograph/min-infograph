import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const releaseDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(releaseDir, '..');
const outDir = resolve(releaseDir, 'out');
const distDir = resolve(outDir, 'package');
const version = '0.2.0';

await rm(outDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const [label, config] of [
  ['ESM', 'release/vite.esm.config.ts'],
  ['browser IIFE', 'release/vite.browser.config.ts'],
]) {
  const result = spawnSync('pnpm', ['--filter', '@min-infograph/workbench', 'exec', 'vite', 'build', '../..', '--config', `../../${config}`], {
    cwd: repoDir, stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`${label} build failed`);
}

for (const name of await readdir(resolve(repoDir, 'release/dist'))) {
  if (name.endsWith('.js') || name.endsWith('.css')) {
    await cp(resolve(repoDir, 'release/dist', name), resolve(distDir, name));
  }
}
await cp(resolve(repoDir, 'packages/ir/dist'), resolve(distDir, 'ir'), { recursive: true });
await cp(resolve(repoDir, 'packages/renderer/dist'), resolve(distDir, 'renderer'), { recursive: true });

// Declaration files in the source workspace refer to its private package name.
// Rewrite those references to the bundled declaration tree in this artifact.
async function rewriteDeclarations(dir) {
  const { readdir, stat } = await import('node:fs/promises');
  for (const name of await readdir(dir)) {
    const path = resolve(dir, name);
    if ((await stat(path)).isDirectory()) await rewriteDeclarations(path);
    else if (name.endsWith('.d.ts')) {
      const relativeIr = relative(dirname(path), resolve(distDir, 'ir/index.js')).replaceAll('\\', '/');
      const specifier = relativeIr.startsWith('.') ? relativeIr : `./${relativeIr}`;
      const content = (await readFile(path, 'utf8')).replaceAll("'@min-infograph/ir'", `'${specifier}'`).replaceAll('"@min-infograph/ir"', `"${specifier}"`);
      await writeFile(path, content);
    }
  }
}
await rewriteDeclarations(distDir);

const rootDts = `export * from './ir/index.js';\nexport * from './renderer/index.js';\nexport { render } from './render.js';\nexport type { RenderOptions } from './render.js';\n`;
await writeFile(resolve(distDir, 'index.d.ts'), rootDts);
await writeFile(resolve(distDir, 'render.d.ts'), `import type { BlockRendererRegistry } from './renderer/index.js';\nexport interface RenderOptions { assetBase?: string; renderers?: BlockRendererRegistry; }\nexport declare function render(container: Element, document: unknown, options?: RenderOptions): { unmount: () => void };\n`);
const manifest = JSON.parse(await readFile(resolve(releaseDir, 'package.json'), 'utf8'));
await writeFile(resolve(distDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(resolve(repoDir, 'packages/renderer/dist/styles.css'), resolve(distDir, 'styles.css'));
await cp(resolve(repoDir, 'LICENSE'), resolve(distDir, 'LICENSE'));

const assetDir = resolve(outDir, 'assets');
await mkdir(assetDir, { recursive: true });
await cp(resolve(distDir, 'browser.js'), resolve(assetDir, `min-infograph-core-${version}.browser.js`));
await cp(resolve(distDir, 'styles.css'), resolve(assetDir, `min-infograph-core-${version}.styles.css`));
const packed = spawnSync('npm', ['pack', '--pack-destination', assetDir], { cwd: distDir, encoding: 'utf8' });
if (packed.status !== 0) throw new Error('npm pack failed');
const assets = ['min-infograph-core-0.2.0.tgz', 'min-infograph-core-0.2.0.browser.js', 'min-infograph-core-0.2.0.styles.css'];
const checksums = [];
for (const asset of assets) {
  const data = await readFile(resolve(assetDir, asset));
  checksums.push(`${createHash('sha256').update(data).digest('hex')}  ${asset}`);
}
await writeFile(resolve(assetDir, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
console.log(`Built @min-infograph/core@${version} in ${distDir}`);
