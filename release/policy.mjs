import { createRequire } from 'node:module';
export function checkVersion(version, cliVersion, tag, prereleaseFlag = '') {
  const number = '(0|[1-9][0-9]*)';
  const identifier = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
  const semver = new RegExp(`^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?$`);
  if (!semver.test(version) || tag !== `v${version}` || cliVersion !== version) throw new Error('Tag must be v<root version>; CLI must match; canonical stable/prerelease SemVer required (no build metadata)');
  const prerelease = version.includes('-');
  if (prereleaseFlag && prereleaseFlag !== String(prerelease)) throw new Error('GitHub release prerelease flag must match version');
  return prerelease ? 'next' : 'latest';
}
export function checkIntegrity(existing, integrity) {
  if (!existing) return false;
  if (existing.dist?.integrity !== integrity) throw new Error('Conflicting published artifact integrity');
  return true;
}

export function checkChannel(current, version, tag) {
  const semver = createRequire(import.meta.url)('semver');
  if (current && semver.gt(current, version)) throw new Error(`Refusing to roll ${tag} back from ${current} to ${version}`);
}
