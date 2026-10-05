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
