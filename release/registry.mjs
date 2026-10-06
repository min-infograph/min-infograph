import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { checkIntegrity, checkChannel } from './policy.mjs';

export const registry = 'https://registry.npmjs.org';
export const readinessDefaults = { deadlineMs: 600_000, intervalMs: 10_000, requestTimeoutMs: 30_000 };

export class RegistryError extends Error {
  constructor(message, retryable, options) {
    super(message, options);
    this.retryable = retryable;
  }
}

function transientNetworkError(error) {
  const code = error.cause?.code ?? error.code;
  return ['AbortError', 'TimeoutError'].includes(error.name)
    || ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND',
      'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'].includes(code)
    || (!code && error instanceof TypeError && error.message === 'fetch failed');
}

export async function metadata(name, { timeoutMs = readinessDefaults.requestTimeoutMs, fetchImpl = fetch } = {}) {
  const packageName = `@min-infograph/${name}`;
  try {
    const response = await fetchImpl(`${registry}/@min-infograph%2f${name}`, {
      signal: AbortSignal.timeout(Math.max(1, Math.ceil(timeoutMs))),
      cache: 'no-store',
    });
    if (response.status === 404) return {};
    if (!response.ok) {
      throw new RegistryError(`Registry lookup for ${packageName} failed: HTTP ${response.status}`,
        [408, 429].includes(response.status) || response.status >= 500);
    }
    // Await the body inside the try: request timeouts also cover reading metadata.
    const info = await response.json();
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!object(info) || ['versions', 'dist-tags'].some(key => info[key] !== undefined && !object(info[key]))) {
      throw new RegistryError(`Registry lookup for ${packageName} returned malformed metadata`, false);
    }
    return info;
  } catch (error) {
    if (error instanceof RegistryError) throw error;
    throw new RegistryError(`Registry lookup for ${packageName} failed: ${error.message}`,
      transientNetworkError(error), { cause: error });
  }
}

// This loop only reads metadata. Publishing and dist-tag mutations stay outside it.
export async function waitForRegistry({ name, version, integrity, tag, requireTag = false,
  lookup = metadata, now = () => performance.now(), sleepImpl = sleep, log = console.log,
  deadlineMs = readinessDefaults.deadlineMs, intervalMs = readinessDefaults.intervalMs,
  requestTimeoutMs = readinessDefaults.requestTimeoutMs }) {
  const target = `@min-infograph/${name}@${version}${requireTag ? ` (dist-tag ${tag})` : ''}`;
  const started = now();
  const deadline = started + deadlineMs;
  let attempts = 0;
  let lastState = 'metadata not checked';
  while (now() < deadline) {
    attempts++;
    let info;
    try {
      info = await lookup(name, { timeoutMs: Math.min(requestTimeoutMs, deadline - now()) });
    } catch (error) {
      if (!(error instanceof RegistryError) || !error.retryable) throw error;
      lastState = error.message;
    }
    if (info) {
      // Conflicting bytes and a newer/invalid channel must fail immediately.
      const exists = checkIntegrity(info.versions?.[version], integrity);
      checkChannel(info['dist-tags']?.[tag], version, tag);
      if (exists && (!requireTag || info['dist-tags']?.[tag] === version)) {
        log(`Registry ready: ${target} after ${attempts} checks (${Math.round(now() - started)}ms)`);
        return info;
      }
      lastState = exists
        ? `dist-tag ${tag} is ${info['dist-tags']?.[tag] ?? 'missing'}; expected ${version}`
        : `version ${version} is not visible yet`;
    }
    const remaining = Math.max(0, deadline - now());
    log(`Waiting for registry: ${target}; check ${attempts}; ${lastState}; ${Math.ceil(remaining / 1000)}s remaining`);
    if (remaining > 0) await sleepImpl(Math.min(intervalMs, remaining));
  }
  throw new Error(`Registry readiness timed out for ${target} after ${deadlineMs / 1000}s (${attempts} checks). Last state: ${lastState}. npm acceptance can precede visibility; do not assume publication failed. Retry the same immutable release tag with identical tarballs after checking registry visibility; never change source/version or move the tag.`);
}
