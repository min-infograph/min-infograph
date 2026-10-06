// Preflight both registry artifacts before publishing either validated tarball.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkIntegrity, checkVersion, checkChannel } from './policy.mjs';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const cli = JSON.parse(await readFile(new URL('../packages/cli/package.json', import.meta.url)));
const tag = checkVersion(version, cli.version, process.env.RELEASE_TAG, process.env.RELEASE_PRERELEASE);
const dryRun = process.env.DRY_RUN !== 'false';
const registry = 'https://registry.npmjs.org';
async function metadata(name) {
  const response = await fetch(`${registry}/@min-infograph%2f${name}`, { signal: AbortSignal.timeout(30000) });
  if (response.ok) return response.json();
  if (response.status === 404) return {};
  throw new Error(`Registry lookup failed: ${response.status}`);
}
const artifacts = [];
for (const name of ['core', 'cli']) {
  const tarball = resolve(`release/out/assets/min-infograph-${name}-${version}.tgz`);
  const integrity = 'sha512-' + createHash('sha512').update(await readFile(tarball)).digest('base64');
  const info = await metadata(name);
  const exists = checkIntegrity(info.versions?.[version], integrity);
  checkChannel(info['dist-tags']?.[tag], version, tag);
  artifacts.push({ name, tarball, integrity, exists });
}
function npm(args) {
  const result = spawnSync('npm', [...args, '--registry', registry], { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`npm ${args[0]} failed: ${result.error ?? result.status}`);
}
for (const { name, tarball, integrity, exists } of artifacts) {
  if (exists) console.log(`Matching artifact already published: @min-infograph/${name}@${version}`);
  else npm(['publish', tarball, '--access', 'public', '--provenance', '--tag', tag, ...(dryRun ? ['--dry-run'] : [])]);
  if (!dryRun) {
    // Registry propagation can lag the successful publish response briefly.
    let info;
    for (let attempt = 0; attempt < 6; attempt++) {
      info = await metadata(name);
      if (info.versions?.[version]) break;
      await new Promise(done => setTimeout(done, 5000));
    }
    if (!checkIntegrity(info.versions?.[version], integrity)) throw new Error('Published version not visible in registry');
    if (info['dist-tags']?.[tag] !== version) {
      checkChannel(info['dist-tags']?.[tag], version, tag);
      npm(['dist-tag', 'add', `@min-infograph/${name}@${version}`, tag]);
      const verified = await metadata(name);
      if (verified['dist-tags']?.[tag] !== version) throw new Error('Dist-tag verification failed');
    }
  }
}
