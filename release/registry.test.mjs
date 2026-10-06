import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metadata, RegistryError, waitForRegistry } from './registry.mjs';
import { publishArtifacts } from './publish-artifacts.mjs';

const version = '0.3.0';
const integrity = 'sha512-exact';
const ready = (tag = version, bytes = integrity) => ({
  versions: { [version]: { dist: { integrity: bytes } } },
  'dist-tags': { latest: tag },
});
function fakeClock() {
  let time = 0;
  const sleeps = [];
  const logs = [];
  return { now: () => time, advance: ms => { time += ms; }, sleeps, logs,
    sleepImpl: async ms => { sleeps.push(ms); time += ms; },
    log: message => logs.push(message) };
}
function sequence(values) {
  let index = 0;
  const calls = [];
  const lookup = async (...args) => {
    calls.push(args);
    const value = values[Math.min(index++, values.length - 1)];
    if (value instanceof Error) throw value;
    return value;
  };
  return { lookup, calls };
}
const target = { name: 'core', version, integrity, tag: 'latest' };

test('pending package and missing version become ready beyond the old 30-second window', async () => {
  const clock = fakeClock();
  const registry = sequence([{}, { versions: {} }, {}, {}, ready()]);
  assert.deepEqual(await waitForRegistry({ ...target, ...clock, ...registry }), ready());
  assert.equal(clock.now(), 40_000);
  assert.deepEqual(clock.sleeps, [10_000, 10_000, 10_000, 10_000]);
  assert.equal(registry.calls.length, 5);
  assert.match(clock.logs[0], /core@0\.3\.0.*check 1.*not visible.*600s remaining/);
  assert.match(clock.logs.at(-1), /Registry ready.*5 checks/);
});

test('default ten-minute deadline reports the target, last state and safe retry', async () => {
  const clock = fakeClock();
  const registry = sequence([{}]);
  await assert.rejects(waitForRegistry({ ...target, ...clock, ...registry }), error => {
    assert.match(error.message, /core@0\.3\.0.*600s \(60 checks\)/);
    assert.match(error.message, /Last state: version 0\.3\.0 is not visible/);
    assert.match(error.message, /acceptance can precede visibility/);
    assert.match(error.message, /same immutable release tag with identical tarballs/);
    return true;
  });
  assert.equal(clock.now(), 600_000);
  assert.equal(registry.calls.length, 60);
});

test('requests and sleeps are capped to remaining deadline including lookup time', async () => {
  const clock = fakeClock();
  const timeouts = [];
  const lookup = async (_, { timeoutMs }) => {
    timeouts.push(timeoutMs);
    clock.advance(timeoutMs);
    throw new RegistryError('request timeout', true);
  };
  await assert.rejects(waitForRegistry({ ...target, ...clock, lookup,
    deadlineMs: 45_000 }), /Last state: request timeout/);
  assert.deepEqual(timeouts, [30_000, 5_000]);
  assert.deepEqual(clock.sleeps, [10_000]);
  assert.equal(clock.now(), 45_000);
});

test('conflicting or incomplete integrity fails immediately even during tag polling', async () => {
  for (const info of [ready(version, 'sha512-other'), { versions: { [version]: { dist: {} } } }]) {
    const clock = fakeClock();
    const registry = sequence([info, ready()]);
    await assert.rejects(waitForRegistry({ ...target, ...clock, ...registry, requireTag: true }), /Conflicting/);
    assert.equal(registry.calls.length, 1);
    assert.deepEqual(clock.sleeps, []);
  }
});

test('transient registry errors retry; permanent and unexpected errors fail immediately', async () => {
  const clock = fakeClock();
  const registry = sequence([new RegistryError('HTTP 503', true), new RegistryError('network reset', true), ready()]);
  await waitForRegistry({ ...target, ...clock, ...registry });
  assert.equal(registry.calls.length, 3);
  assert.match(clock.logs[0], /HTTP 503/);
  assert.match(clock.logs[1], /network reset/);
  for (const error of [new RegistryError('HTTP 403', false), new Error('invalid metadata')]) {
    const clock = fakeClock();
    const registry = sequence([error, ready()]);
    await assert.rejects(waitForRegistry({ ...target, ...clock, ...registry }), error);
    assert.equal(registry.calls.length, 1);
    assert.deepEqual(clock.sleeps, []);
  }
});

test('dist-tag visibility waits through absent and older tags and metadata lag', async () => {
  const clock = fakeClock();
  const absent = ready();
  absent['dist-tags'] = {};
  const absentRegistry = sequence([absent, ready('0.2.2'), {}, ready()]);
  await waitForRegistry({ ...target, ...clock, ...absentRegistry, requireTag: true });
  assert.equal(absentRegistry.calls.length, 4);
  assert.match(clock.logs[0], /dist-tag latest is missing/);
  assert.match(clock.logs[1], /dist-tag latest is 0\.2\.2/);
});

test('tag polling refuses newer and malformed channel values immediately', async () => {
  for (const tag of ['0.4.0', 'broken']) {
    const clock = fakeClock();
    const registry = sequence([ready(tag), ready()]);
    await assert.rejects(waitForRegistry({ ...target, ...clock, ...registry, requireTag: true }));
    assert.equal(registry.calls.length, 1);
    assert.deepEqual(clock.sleeps, []);
  }
});

test('tag timeout identifies the expected and observed channel', async () => {
  const clock = fakeClock();
  await assert.rejects(waitForRegistry({ ...target, ...clock, lookup: async () => ready('0.2.2'),
    requireTag: true, deadlineMs: 20_000 }), /dist-tag latest.*Last state: dist-tag latest is 0\.2\.2; expected 0\.3\.0/);
});

test('metadata classifies HTTP responses and supplies a request timeout signal', async () => {
  for (const status of [200, 404, 408, 429, 500, 502, 503, 504, 400, 401, 403, 410]) {
    let jsonRead = false;
    const fetchImpl = async (url, options) => {
      assert.equal(url, 'https://registry.npmjs.org/@min-infograph%2fcore');
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.signal.aborted, false);
      assert.equal(options.cache, 'no-store');
      return { status, ok: status === 200, json: async () => { jsonRead = true; return ready(); } };
    };
    const request = metadata('core', { fetchImpl, timeoutMs: 1000 });
    if (status === 200) assert.deepEqual(await request, ready());
    else if (status === 404) assert.deepEqual(await request, {});
    else await assert.rejects(request, error => {
      assert.ok(error instanceof RegistryError);
      assert.equal(error.retryable, [408, 429].includes(status) || status >= 500);
      assert.match(error.message, new RegExp(`core.*HTTP ${status}`));
      return true;
    });
    assert.equal(jsonRead, status === 200);
  }
});

test('request timeout aborts both fetch and body reads without real timers', async t => {
  let controller;
  const timeouts = [];
  t.mock.method(AbortSignal, 'timeout', ms => {
    timeouts.push(ms);
    return controller.signal;
  });
  for (const body of [false, true]) {
    controller = new AbortController();
    let started;
    const reading = new Promise(resolve => { started = resolve; });
    const fetchImpl = async (_, { signal }) => {
      const aborted = () => new Promise((_, reject) => {
        started();
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
      if (!body) return aborted();
      return { status: 200, ok: true, json: aborted };
    };
    const request = metadata('core', { fetchImpl, timeoutMs: 1234 });
    await reading;
    controller.abort(new DOMException('request timed out', 'TimeoutError'));
    await assert.rejects(request, error => {
      assert.equal(error.retryable, true);
      assert.equal(error.cause.name, 'TimeoutError');
      return true;
    });
  }
  assert.deepEqual(timeouts, [1234, 1234]);
});

test('metadata classifies network and body errors, including permanent TLS and malformed JSON', async () => {
  const failures = [
    [new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }), true],
    [new TypeError('fetch failed', { cause: { code: 'EAI_AGAIN' } }), true],
    [new TypeError('fetch failed'), true],
    [new DOMException('request timed out', 'TimeoutError'), true],
    [new TypeError('terminated', { cause: { code: 'UND_ERR_SOCKET' } }), true],
    [new TypeError('fetch failed', { cause: { code: 'CERT_HAS_EXPIRED' } }), false],
    [new SyntaxError('invalid JSON'), false],
  ];
  for (const [failure, retryable] of failures) {
    for (const body of [false, true]) {
      const fetchImpl = async () => {
        if (!body) throw failure;
        return { ok: true, status: 200, json: async () => { throw failure; } };
      };
      await assert.rejects(metadata('core', { fetchImpl }), error => {
        assert.equal(error.retryable, retryable);
        assert.equal(error.cause, failure);
        return true;
      });
    }
  }
});

test('invalid metadata shapes are permanent errors', async () => {
  for (const info of [null, [], 'invalid', { versions: [] }, { 'dist-tags': null }]) {
    await assert.rejects(metadata('core', { fetchImpl: async () => ({
      ok: true, status: 200, json: async () => info,
    }) }), error => {
      assert.equal(error.retryable, false);
      assert.match(error.message, /malformed metadata/);
      return true;
    });
  }
});

const artifacts = ['core', 'cli'].map(name => ({ name, tarball: `${name}.tgz`, integrity }));
test('both-package preflight prevents any mutation when the second package conflicts or lookup fails', async () => {
  for (const second of [ready(version, 'sha512-other'), new RegistryError('HTTP 403', false), ready('0.4.0')]) {
    const registry = sequence([{}, second]);
    const commands = [];
    await assert.rejects(publishArtifacts({ artifacts, version, tag: 'latest', dryRun: false,
      ...registry, npm: args => commands.push(args) }));
    assert.deepEqual(registry.calls.map(([name]) => name), ['core', 'cli']);
    assert.deepEqual(commands, []);
  }
});

test('publishes each missing artifact once, polls visibility, repairs tag once, skips identical CLI', async () => {
  const registry = sequence([{}, ready(), {}, new RegistryError('HTTP 503', true),
    ready('0.2.2'), ready('0.2.2'), {}, ready(), ready()]);
  const clock = fakeClock();
  const commands = [];
  await publishArtifacts({ artifacts, version, tag: 'latest', dryRun: false,
    ...registry, log: clock.log, readiness: clock, npm: args => commands.push(args) });
  assert.deepEqual(commands, [
    ['publish', 'core.tgz', '--access', 'public', '--provenance', '--tag', 'latest'],
    ['dist-tag', 'add', '@min-infograph/core@0.3.0', 'latest'],
  ]);
  assert.deepEqual(registry.calls.map(([name]) => name), ['core', 'cli', ...Array(6).fill('core'), 'cli']);
  assert.equal(clock.now(), 40_000);
  assert.match(clock.logs.at(-2), /Matching artifact already published.*cli/);
});

test('publication timeout never republishes or proceeds to the second package', async () => {
  const clock = fakeClock();
  const registry = sequence([{}]);
  const commands = [];
  await assert.rejects(publishArtifacts({ artifacts, version, tag: 'latest', dryRun: false,
    ...registry, log: clock.log, readiness: { ...clock, deadlineMs: 20_000 },
    npm: args => commands.push(args) }), /readiness timed out/);
  assert.equal(commands.length, 1);
  assert.equal(commands[0][1], 'core.tgz');
  assert.deepEqual(registry.calls.map(([name]) => name), ['core', 'cli', 'core', 'core']);
});

test('dist-tag timeout never repeats tag mutation or republishes identical artifacts', async () => {
  const clock = fakeClock();
  const registry = sequence([ready('0.2.2')]);
  const commands = [];
  await assert.rejects(publishArtifacts({ artifacts, version, tag: 'latest', dryRun: false,
    ...registry, log: clock.log, readiness: { ...clock, deadlineMs: 20_000 },
    npm: args => commands.push(args) }), /readiness timed out.*dist-tag latest/);
  assert.deepEqual(commands, [['dist-tag', 'add', '@min-infograph/core@0.3.0', 'latest']]);
  assert.deepEqual(registry.calls.map(([name]) => name), ['core', 'cli', 'core', 'core', 'core']);
});

test('dry run preflights both packages without polling or dist-tag mutations', async () => {
  const registry = sequence([{}, ready('0.2.2')]);
  const commands = [];
  await publishArtifacts({ artifacts, version, tag: 'latest', dryRun: true,
    ...registry, log: () => {}, npm: args => commands.push(args) });
  assert.equal(registry.calls.length, 2);
  assert.deepEqual(commands, [['publish', 'core.tgz', '--access', 'public', '--provenance', '--tag', 'latest', '--dry-run']]);
});
