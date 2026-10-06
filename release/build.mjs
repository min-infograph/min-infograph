import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const releaseDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(releaseDir, '..');
const outDir = resolve(releaseDir, 'out');
const distDir = resolve(outDir, 'package');
const sourceManifest = JSON.parse(await readFile(resolve(releaseDir, 'package.json'), 'utf8'));
const { version } = JSON.parse(await readFile(resolve(repoDir, 'package.json'), 'utf8'));
if (process.env.RELEASE_VERSION) throw new Error('RELEASE_VERSION overrides are forbidden; edit the root version before tagging');
const cliManifest = JSON.parse(await readFile(resolve(repoDir, 'packages/cli/package.json'), 'utf8'));
if (cliManifest.version !== version) throw new Error('CLI version must match root version');
await rm(resolve(releaseDir, 'dist'), { recursive: true, force: true });

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
await cp(resolve(repoDir, 'packages/ir/dist'), resolve(distDir, 'ir'), { recursive: true, filter: path => !/\.[^/]+$/.test(path) || path.endsWith('.d.ts') });
await cp(resolve(repoDir, 'packages/renderer/dist'), resolve(distDir, 'renderer'), { recursive: true, filter: path => !/\.[^/]+$/.test(path) || path.endsWith('.d.ts') });

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
      const content = (await readFile(path, 'utf8')).replace(/^import ['"][^'"]+\.css['"];?\s*$/gm, '').replaceAll("'@min-infograph/ir'", `'${specifier}'`).replaceAll('"@min-infograph/ir"', `"${specifier}"`);
      await writeFile(path, content);
    }
  }
}
await rewriteDeclarations(distDir);

const rootDts = `export * from './ir/index.js';\nexport * from './renderer/index.js';\nexport { render } from './render.js';\nexport type { RenderOptions } from './render.js';\n`;
await writeFile(resolve(distDir, 'index.d.ts'), rootDts);
await writeFile(resolve(distDir, 'styles.d.ts'), 'export {};\n');
await writeFile(resolve(distDir, 'render.d.ts'), `import type { BlockRendererRegistry, ThemeOverrides, HeadingLevel } from './renderer/index.js';\nexport interface RenderOptions { assetBase?: string; renderers?: BlockRendererRegistry; theme?: ThemeOverrides; headingLevel?: HeadingLevel; }\nexport declare function render(container: Element, document: unknown, options?: RenderOptions): { unmount: () => void };\n`);
const manifest = { ...sourceManifest, version };
await writeFile(resolve(distDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(resolve(repoDir, 'packages/renderer/dist/styles.css'), resolve(distDir, 'styles.css'));
await cp(resolve(repoDir, 'LICENSE'), resolve(distDir, 'LICENSE'));
await cp(resolve(releaseDir, 'README.md'), resolve(distDir, 'README.md'));

const assetDir = resolve(outDir, 'assets');
await mkdir(assetDir, { recursive: true });
await cp(resolve(distDir, 'browser.js'), resolve(assetDir, `min-infograph-core-${version}.browser.js`));
await cp(resolve(distDir, 'styles.css'), resolve(assetDir, `min-infograph-core-${version}.styles.css`));
const packed = spawnSync('npm', ['pack', '--pack-destination', assetDir], { cwd: distDir, encoding: 'utf8' });
if (packed.status !== 0) throw new Error('npm pack failed');
const cliDir = resolve(outDir, 'cli');
await mkdir(resolve(cliDir, 'dist'), { recursive: true });
await cp(resolve(repoDir, 'packages/cli/src'), resolve(cliDir, 'src'), { recursive: true });
await cp(resolve(repoDir, 'packages/ir/dist'), resolve(cliDir, 'dist/ir'), { recursive: true });
for (const file of ['browser.js', 'styles.css']) await cp(resolve(distDir, file), resolve(cliDir, 'dist', file));
await writeFile(resolve(cliDir, 'package.json'), JSON.stringify(cliManifest, null, 2) + '\n');
for (const file of ['LICENSE', 'packages/cli/README.md']) await cp(resolve(repoDir, file), resolve(cliDir, file.split('/').at(-1)));
const cliPack = spawnSync('npm', ['pack', '--pack-destination', assetDir], { cwd: cliDir, stdio: 'inherit' });
if (cliPack.status !== 0) throw new Error('CLI pack failed');
const assets = [`min-infograph-cli-${version}.tgz`, `min-infograph-core-${version}.tgz`, `min-infograph-core-${version}.browser.js`, `min-infograph-core-${version}.styles.css`];
const checksums = [];
for (const asset of assets) {
  const data = await readFile(resolve(assetDir, asset));
  checksums.push(`${createHash('sha256').update(data).digest('hex')}  ${asset}`);
}
await writeFile(resolve(assetDir, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
console.log(`Built @min-infograph/core@${version} in ${distDir}`);
