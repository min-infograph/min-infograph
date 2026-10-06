# npm packages and releases

Core and CLI share the source-controlled root `package.json` version, currently `0.3.0`. CLI manifest must match; core manifest is generated. No environment version override is accepted. Schema version `0.1` is independent. npm is the primary distributor; GitHub Actions artifacts are diagnostics, not installation promises.

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

After release, pin with `npm install @min-infograph/core@0.3.0`. Core 0.2.2 is the current published stable version until then.

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

`window.MinInfograph` exposes `render(container, documentJson, options?)`, `validateIR(documentJson)`, and the renderer exports. `render()` returns an object with `unmount()`. The Pages URL is suitable for module-free static sites; the npm core package also includes `browser.js` and `styles.css` for self-hosting. The Pages build preserves the original 0.2.2 endpoint from its integrity-pinned npm artifact (`release/pages-history.json`). The example uses that existing endpoint; the 0.3.0 endpoint becomes available after the next Pages deployment.

## CLI

```sh
npm install --global @min-infograph/cli
min-infograph --help
min-infograph install-browser
min-infograph validate ./document.json
min-infograph render ./document.json ./output.png
```

CLI runs independently of repository files. Local `/assets/...` paths map below `assets/` beside the JSON file. Nested PNG/JPEG/WebP assets work; symlinks escaping that directory are rejected. Missing assets and diagram failures produce a nonzero exit. Rendering uses an ephemeral loopback HTTP port and closes Chromium and the server on success and failure. `install-browser --with-deps` is available for Linux browser dependencies. No browser is installed implicitly.

## Maintain and release

1. Update the root `package.json` version and `packages/cli/package.json` together. Stable tags are exactly `vX.Y.Z`; prerelease tags are canonical SemVer such as `v0.3.1-rc.1`. Leading zeroes and build metadata are rejected. Commit source and lockfile before tagging.
2. Run the checks below. Both tarballs are packed into `release/out/assets/`; core output remains `release/out/package/`. Browser assets and checksums are derived from the same version. The workbench, IR and renderer remain private, unpublished workspace packages.
3. Complete per-package npm trusted publisher setup below. Create the matching tag and GitHub Release only after review. Its prerelease flag must agree with the version. Publishing a release triggers `.github/workflows/npm-publish.yml`; prereleases use `next`, stable versions use `latest`.
4. To rehearse, manually dispatch **Publish npm packages** with an existing tag and leave `dry_run` enabled (the default). The exact tag commit is checked out and verified. To retry a partial release, dispatch that tag with dry-run disabled. Never move tags or rebuild changed source under an existing npm version.

```sh
pnpm install --frozen-lockfile
pnpm release:package
pnpm typecheck
pnpm --filter @min-infograph/workbench exec playwright install --with-deps chromium
pnpm test
pnpm release:smoke
pnpm release:browser-smoke
pnpm release:policy-test
```

The one publish workflow serializes releases and runs build, typechecks, tests, clean npm/pnpm tarball installs, CLI PNG export (diagram and local asset), declarations checks and the browser bundle check before publishing anything. It preflights both packages before any mutation, publishes the exact checked tarballs, core first, CLI second, then verifies registry installs with the same consumer checks. A retry skips only byte-identical already-published artifacts (SHA-512 integrity). Conflicting integrity, permanent registry errors and newer or invalid channel values stop the run immediately. It restores the appropriate dist-tag if necessary but refuses to roll back a newer version. Publication is not atomic across packages; an interrupted run can leave core published and CLI pending. Diagnostics are uploaded even on failure. There is no separate release-assets workflow or ad hoc OIDC staging.

### npm acceptance, registry visibility and timeout recovery

A successful `npm publish` means npm accepted the tarball; metadata and dist-tags can still be processing. Hosted run `37536471464` accepted core 0.3.0 with signed provenance and reported that processing could take a few minutes, but the old publisher exhausted six 5-second visibility checks. That visibility failure does not undo the accepted publication.

The publisher now polls version visibility for up to ten minutes, every ten seconds. Each metadata request (including its body) has a 30-second timeout, capped to the remaining deadline. Progress logs identify the package/version, check count, pending state or transient error, and remaining time. Missing packages/versions, HTTP 408/429/5xx, request timeouts and transient network failures are retried. Authentication/authorization errors, other permanent HTTP/network errors, malformed metadata and conflicting artifact integrity fail immediately. Polling only reads metadata; it never republishes. If a matching artifact needs a dist-tag repair, the publisher issues that mutation once and polls tag visibility under a separate ten-minute deadline, continuing to verify integrity and prevent channel rollback.

After a readiness timeout, check registry visibility before retrying. Keep the exact immutable release tag and source commit and the identical validated tarballs; never change source under that npm version, bump the version to work around pending processing, or move an existing tag. Once accepted artifacts are visible, retrying the same release with dry-run disabled skips matching artifacts, repairs missing tags if needed, and publishes only the still-missing package. A timeout while checking a tag likewise permits an identical-artifact retry; it does not justify another publish. If a previously accepted version is still missing, allow processing to settle before retrying rather than repeatedly submitting it.

Manual workflow dispatch checks out the exact existing tag commit. This polling fix on main therefore does not change the script stored at existing `v0.3.0`: dispatching that tag still uses its original short wait. `v0.3.0` must remain immutable. Applying patched polling to its recovery requires separately reviewed recovery tooling using the original tag/source checks and exact artifacts; this change does not publish or alter that release.

### npm owner setup and CLI bootstrap

Follow [official npm trusted publisher documentation](https://docs.npmjs.com/trusted-publishers/). Configure each package independently on npmjs.com, with GitHub Actions organization/user `min-infograph`, repository `min-infograph`, workflow filename `npm-publish.yml` (filename only), and no environment unless the existing core identity requires one. Preserve the existing core trusted publisher identity; the workflow keeps that filename and adds no job environment. Confirm its existing settings before release. Allow direct `npm publish` and dist-tag management so retries can repair tags. The workflow uses GitHub-hosted Ubuntu, Node 24, npm 11.21.0 and `id-token: write`; it contains no npm credentials.

`@min-infograph/cli` does not exist yet. An authorized npm scope/account owner must first establish it: after reviewing and validating these exact artifacts, publish the CLI tarball from their own authenticated machine using `npm publish ./release/out/assets/min-infograph-cli-0.3.0.tgz --access public --tag latest`, then configure its trusted publisher in npm package settings. Account login/2FA and scope permissions are owner actions, not tasks for this checkout. Do not put credentials into workflow files or logs. Keep that exact reviewed artifact and tag: the automated release must reproduce the same integrity to skip the bootstrap artifact safely. The initial workflow can then publish core and verify/skip CLI. Alternatively the owner can bootstrap an independently reviewed earlier CLI version before the coordinated 0.3.0 release. Do not use staged placeholder versions as a bootstrap mechanism.

Trusted publishing automatically supplies provenance on supported public repositories. Dist-tag management needs npm 11.21.0 and the trusted publisher's corresponding allowed action. A new publisher configuration must complete its first successful OIDC publish within two days, per npm documentation. Bootstrapping the same version locally and skipping it in CI does not exercise CLI OIDC; configure or refresh that connection when the next actual CLI publish is ready. An absent CLI package/publisher, incorrect core identity, missing scope permissions or disabled direct publishing blocks a live release; local validation and manual dry-run remain available.

## Astro and React server rendering

Enable Astro's React integration (`@astrojs/react`). Use a local React wrapper so Astro can identify the framework at the island boundary. See [Astro framework components](https://docs.astro.build/en/guides/framework-components/) and [client directives](https://docs.astro.build/en/reference/directives-reference/#clientvisible).

```tsx
// src/components/InfographicIsland.tsx
import { Infographic, type InfographicProps } from '@min-infograph/core';

export default function InfographicIsland(props: InfographicProps) {
  return <Infographic {...props} />;
}
```

```astro
---
// src/pages/guide.astro
import InfographicIsland from '../components/InfographicIsland';
import { validateIR } from '@min-infograph/core';
import '@min-infograph/core/styles.css';
import documentJson from '../data/guide.json';
const ir = validateIR(documentJson);
---
<h1>Field guides</h1>
<InfographicIsland ir={ir} headingLevel={2} client:visible />
```

SSR emits the article, text, images, headings, and a `Rendering diagram…` placeholder for each Mermaid block. With `client:visible`, the React island hydrates when it enters the viewport; Mermaid then replaces its placeholders with SVG. Without a client directive, the placeholders remain. The first browser render matches the server markup; responsive diagram direction is read in an effect after hydration. Calling `renderMermaid` directly requires a browser DOM and rejects with an explanatory error on the server. Custom `renderers` callbacks belong inside the React wrapper; functions cannot be serialized as Astro island props.

`headingLevel` accepts `1 | 2 | 3 | 4 | 5 | 6` and defaults to `1`. Widget headings use the next level and nested example-column headings use the level after that, capped at `6`. Use `.min-infograph-heading` and `.min-infograph-heading--0`, `--1`, or `--2` (relative depth), plus existing classes such as `.block-heading`, for styling independent of semantic heading rank.

## Per-instance theme overrides

`Infographic`, `PosterInfographic`, and the browser `render(container, documentJson, options)` API accept `theme: ThemeOverrides` and `headingLevel`. These are rendering options; the durable IR stays unchanged. Omitted options preserve the built-in style's defaults.

```tsx
import { Infographic, type ThemeOverrides } from '@min-infograph/core';

const theme: ThemeOverrides = {
  colors: {
    background: '#faf7ef', ink: '#252b35', muted: '#586174',
    accent: '#8659b8', surface: '#fffaf1', border: '#d8c9b6',
    heroBackground: '#342449', heroInk: '#fffaf1',
  },
  typography: {
    fontFamily: 'system-ui, sans-serif',
    headingFontFamily: 'Georgia, serif', monoFontFamily: 'monospace',
    titleSize: '2.5rem', bodySize: '1rem',
  },
  spacing: { blockGap: '1.25rem', padding: '2rem' },
  mermaid: {
    primaryColor: '#eee3fa', primaryBorderColor: '#8659b8',
    primaryTextColor: '#252b35', lineColor: '#586174',
    actorBkg: '#eee3fa', noteBkgColor: '#fff3d8',
  },
};

<Infographic ir={ir} theme={theme} headingLevel={2} />;
```

Theme overrides are scoped to each article and work in grid and poster layouts. `fontFamily` applies to native text and Mermaid labels; heading and mono fonts can be set separately. `background`, `ink`, and `accent` also derive Mermaid background, label, border, and line colors; explicit `mermaid` palette fields take precedence. Per-block Mermaid `appearance.fontSize` takes precedence over the default diagram label size. Palettes do not expose Mermaid configuration or security settings: rendering remains strict and configuration/render calls remain serialized.

The stylesheet uses `--min-infograph-*` tokens, including `background`, `ink`, `muted`, `accent`, `surface`, `border`, `hero-background`, `hero-ink`, `font-family`, `heading-font-family`, `mono-font-family`, `title-size`, `body-size`, `block-gap`, and `sheet-padding`. Set tokens on an individual article. Color and font tokens can also inherit from a containing host element; built-in sizing supplies article-level defaults. A typed theme sets inline tokens on its article and therefore takes precedence over inherited values. Mermaid SVG palettes are configured through `theme.mermaid` (or the fifth argument to `renderMermaid`); CSS tokens alone do not reconfigure Mermaid.

```css
.guide .infographic {
  --min-infograph-accent: #8659b8;
  --min-infograph-heading-font-family: Georgia, serif;
  --min-infograph-block-gap: 1.25rem;
}
```

Renderer CSS contains component-scoped styles only. It does not reset the host page, style the workbench editor, or fetch fonts. Load preferred fonts in your host application; the named built-in fonts retain their sans-serif/monospace fallbacks. The workbench owns its own resets, editor styles, and optional Google Fonts import.
