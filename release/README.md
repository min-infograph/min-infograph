# `@min-infograph/core` release artifacts

The `@min-infograph/core` package contains the IR validator, React infographic components, and a `render()` convenience function. It does not include the workbench CLI. Future non-prerelease GitHub Releases publish the package to npm using GitHub Actions OIDC trusted publishing; no npm token is stored in GitHub. The GitHub Release tarball and browser assets remain available as alternate distribution options.

The package release is version `0.2.2`; the `version: "0.1"` field in infographic JSON identifies the current document format and is independent of the package version.

### Test npm trusted publishing

The **Publish npm package** GitHub Actions workflow can be started manually to exercise OIDC trusted publishing. A manual run checks out the repository's current default branch, builds a unique `0.2.2-oidc-test.<run>.<attempt>` prerelease, runs the release smoke check, and stages it with `npm stage publish`. Manual staging creates a test version for review and leaves the live `latest` version unchanged; first-time staging can create a public placeholder for the package. Published non-prerelease GitHub Releases continue to publish the version from their release tag directly to the public npm registry.

## Install in an app

Install React and React DOM if the app does not already have them, then install the npm package:

```sh
npm install react react-dom
npm install @min-infograph/core
```

With pnpm:

```sh
pnpm add react react-dom
pnpm add @min-infograph/core
```

To install a specific version, use for example `npm install @min-infograph/core@0.2.2`.

### GitHub Release alternatives

Each GitHub Release also carries an installable tarball and browser assets. To install the v0.2.2 tarball directly:

```sh
npm install https://github.com/min-infograph/min-infograph/releases/download/v0.2.2/min-infograph-core-0.2.2.tgz
```

The browser bundle and stylesheet can be downloaded from the release for self-hosting, or used from the GitHub Pages URL below.

Import the library styles once. `render()` validates the JSON document, mounts the infographic, and returns an `unmount()` handle. `assetBase` is useful when local `/assets/...` paths are hosted below a site subpath.

```tsx
import { render } from '@min-infograph/core';
import '@min-infograph/core/styles.css';
import documentJson from './infographic.json';

const mount = document.getElementById('infographic');
if (!mount) throw new Error('Missing infographic mount element');
const infographic = render(mount, documentJson, { assetBase: import.meta.env.BASE_URL });
// Call infographic.unmount() when this view is removed.
```

Apps that already manage React can instead use `Infographic` and `validateIR`:

```tsx
import { Infographic, validateIR } from '@min-infograph/core';
import '@min-infograph/core/styles.css';

const ir = validateIR(documentJson);
export function Page() { return <Infographic ir={ir} assetBase="/" />; }
```

## Use from a static website

The Pages deployment serves same-origin, correctly typed assets at `https://min-infograph.github.io/min-infograph/core/v0.2.2/`. It provides `browser.js` (a self-contained classic script) and `styles.css`.

```html
<link rel="stylesheet" href="https://min-infograph.github.io/min-infograph/core/v0.2.2/min-infograph-core-0.2.2.styles.css">
<div id="infographic"></div>
<script src="https://min-infograph.github.io/min-infograph/core/v0.2.2/min-infograph-core-0.2.2.browser.js"></script>
<script type="module">
  const response = await fetch('/data/infographic.json');
  const documentJson = await response.json();
  MinInfograph.render(document.getElementById('infographic'), documentJson, {
    assetBase: '/',
  });
</script>
```

`window.MinInfograph` exposes `render(container, documentJson, options?)`, `validateIR(documentJson)`, and the renderer exports. `render()` returns an object with `unmount()`. The Pages URL is suitable for module-free static sites; release assets also include the browser bundle for downloading or self-hosting.

## Build and verify release artifacts

```sh
pnpm install --frozen-lockfile
pnpm release:package
pnpm release:smoke
```

The build writes the npm tarball, browser JavaScript, stylesheet, and `SHA256SUMS` to `release/out/assets/`. A GitHub Release workflow attaches those files when a release is published, and a separate workflow publishes the package to npm using OIDC trusted publishing. The `infograph` CLI remains available from a source checkout.
