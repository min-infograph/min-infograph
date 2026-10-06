import { cp, mkdir, readFile, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const { version } = JSON.parse(await readFile(resolve(root, 'release/out/package/package.json'), 'utf8'));
const source = resolve(root, 'release/out/assets');
const destination = resolve(root, `apps/workbench/public/core/v${version}`);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log(`Copied static embed assets to apps/workbench/public/core/v${version}`);

// Preserve deployed immutable embed URLs using the original npm artifact,
// rather than relabeling the current renderer as an older version.
const history = JSON.parse(await readFile(new URL('./pages-history.json', import.meta.url)));
for (const entry of history) {
  if (entry.version === version) continue;
  const temporary = await mkdtemp(resolve(tmpdir(), 'min-infograph-pages-'));
  try {
    const response = await fetch(entry.tarball, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Historical Pages artifact download failed: ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if ('sha512-' + createHash('sha512').update(data).digest('base64') !== entry.integrity) throw new Error('Historical npm artifact integrity mismatch');
    const tarball = resolve(temporary, 'core.tgz');
    await writeFile(tarball, data);
    const target = resolve(root, `apps/workbench/public/core/v${entry.version}`);
    await mkdir(target, { recursive: true });
    const checksums = [];
    for (const [file, extension] of [['browser.js', 'browser.js'], ['styles.css', 'styles.css']]) {
      // Read only the two expected members; never extract untrusted paths.
      const asset = execFileSync('tar', ['-xOzf', tarball, `package/${file}`], { maxBuffer: 16 * 1024 * 1024 });
      const name = `min-infograph-core-${entry.version}.${extension}`;
      await writeFile(resolve(target, name), asset);
      checksums.push(`${createHash('sha256').update(asset).digest('hex')}  ${name}`);
    }
    await writeFile(resolve(target, 'SHA256SUMS'), checksums.join('\n') + '\n');
    console.log(`Preserved npm core ${entry.version} at core/v${entry.version}`);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
