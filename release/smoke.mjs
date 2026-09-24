import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tarball = resolve(root, 'release/out/assets/min-infograph-core-0.2.0.tgz');
const sample = JSON.parse(await readFile(resolve(root, 'apps/workbench/src/examples/ai-agent.json'), 'utf8'));
const source = `import { render, validateIR } from '@min-infograph/core';\nconst ir = validateIR(${JSON.stringify(sample)});\nif (ir.title !== 'Inside an AI Agent' || typeof render !== 'function') throw new Error('Core package smoke check failed');\nconsole.log('Core package imported and validated a document');\n`;

for (const manager of ['npm', 'pnpm']) {
  const consumer = await mkdtemp(resolve(tmpdir(), `min-infograph-${manager}-`));
  try {
    await writeFile(resolve(consumer, 'package.json'), '{"name":"core-smoke","private":true,"type":"module"}\n');
    const args = manager === 'npm'
      ? ['install', '--no-audit', '--no-fund', tarball]
      : ['add', '--ignore-workspace', tarball];
    const install = spawnSync(manager, args, { cwd: consumer, stdio: 'inherit' });
    if (install.status !== 0) throw new Error(`${manager} consumer install failed`);
    await writeFile(resolve(consumer, 'smoke.mjs'), source);
    const run = spawnSync('node', ['smoke.mjs'], { cwd: consumer, stdio: 'inherit' });
    if (run.status !== 0) throw new Error(`${manager} consumer import failed`);
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
}
