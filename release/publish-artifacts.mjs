import { checkIntegrity, checkChannel } from './policy.mjs';
import { metadata, waitForRegistry } from './registry.mjs';

export async function publishArtifacts({ artifacts, version, tag, dryRun, npm,
  lookup = metadata, log = console.log, readiness = {} }) {
  // Complete both-package preflight before any publish or dist-tag mutation.
  const prepared = [];
  for (const artifact of artifacts) {
    const info = await lookup(artifact.name);
    const exists = checkIntegrity(info.versions?.[version], artifact.integrity);
    checkChannel(info['dist-tags']?.[tag], version, tag);
    prepared.push({ ...artifact, exists });
  }
  for (const { name, tarball, integrity, exists } of prepared) {
    if (exists) log(`Matching artifact already published: @min-infograph/${name}@${version}`);
    else npm(['publish', tarball, '--access', 'public', '--provenance', '--tag', tag, ...(dryRun ? ['--dry-run'] : [])]);
    if (dryRun) continue;
    const options = { ...readiness, name, version, integrity, tag, lookup, log };
    const info = await waitForRegistry(options);
    if (info['dist-tags']?.[tag] !== version) {
      checkChannel(info['dist-tags']?.[tag], version, tag);
      npm(['dist-tag', 'add', `@min-infograph/${name}@${version}`, tag]);
      await waitForRegistry({ ...options, requireTag: true });
    }
  }
}
