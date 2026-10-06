import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkVersion, checkIntegrity, checkChannel } from './policy.mjs';
test('stable and prerelease release channels', () => {
  assert.equal(checkVersion('0.3.0', '0.3.0', 'v0.3.0', 'false'), 'latest');
  assert.equal(checkVersion('0.3.0-rc.1', '0.3.0-rc.1', 'v0.3.0-rc.1', 'true'), 'next');
  assert.equal(checkVersion('0.3.0-1a', '0.3.0-1a', 'v0.3.0-1a'), 'next');
});
test('reject ambiguous versions, mismatched manifests/tags and release flags', () => {
  for (const version of ['01.3.0', '0.3.0-01', '0.3.0+build', '0.3', '0.3.0-', '0.3.0-rc..1']) assert.throws(() => checkVersion(version, version, `v${version}`));
  assert.throws(() => checkVersion('0.3.0', '0.2.2', 'v0.3.0'));
  assert.throws(() => checkVersion('0.3.0', '0.3.0', 'v0.2.2'));
  assert.throws(() => checkVersion('0.3.0', '0.3.0', '0.3.0'));
  assert.throws(() => checkVersion('0.3.0', '0.3.0', 'v0.3.0', 'true'));
  assert.throws(() => checkVersion('0.3.0-rc.1', '0.3.0-rc.1', 'v0.3.0-rc.1', 'false'));
});
test('retry skips only identical artifacts', () => {
  assert.equal(checkIntegrity(undefined, 'sha512-exact'), false);
  assert.equal(checkIntegrity({ dist: { integrity: 'sha512-exact' } }, 'sha512-exact'), true);
  assert.throws(() => checkIntegrity({ dist: { integrity: 'sha512-other' } }, 'sha512-exact'));
  assert.throws(() => checkIntegrity({ dist: {} }, 'sha512-exact'));
});

test('preflight prevents rolling stable or prerelease channels backward', () => {
  assert.doesNotThrow(() => checkChannel('0.2.2', '0.3.0', 'latest'));
  assert.doesNotThrow(() => checkChannel('0.3.0', '0.3.0', 'latest'));
  assert.throws(() => checkChannel('0.4.0', '0.3.0', 'latest'));
  assert.throws(() => checkChannel('0.3.0-rc.2', '0.3.0-rc.1', 'next'));
  assert.throws(() => checkChannel('broken', '0.3.0', 'latest'));
});
