// Preflight both registry artifacts before publishing either validated tarball.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkVersion } from './policy.mjs';
import { registry } from './registry.mjs';
import { publishArtifacts } from './publish-artifacts.mjs';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const cli = JSON.parse(await readFile(new URL('../packages/cli/package.json', import.meta.url)));
const tag = checkVersion(version, cli.version, process.env.RELEASE_TAG, process.env.RELEASE_PRERELEASE);
const dryRun = process.env.DRY_RUN !== 'false';
const artifacts = [];
for (const name of ['core', 'cli']) {
  const tarball = resolve(`release/out/assets/min-infograph-${name}-${version}.tgz`);
  const integrity = 'sha512-' + createHash('sha512').update(await readFile(tarball)).digest('base64');
  artifacts.push({ name, tarball, integrity });
}
function npm(args) {
  const result = spawnSync('npm', [...args, '--registry', registry], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`npm ${args[0]} failed: ${result.error ?? result.status}`);
}
await publishArtifacts({ artifacts, version, tag, dryRun, npm });
