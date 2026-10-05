# `@min-infograph/renderer`

React components for rendering validated `InfographicIR` documents. The package includes the original workbench styles, Mermaid SVG rendering and styling, poster widgets, local image handling, and zoom/pan controls.

```tsx
import '@min-infograph/renderer/styles.css';
import { Infographic } from '@min-infograph/renderer';
import { validateIR } from '@min-infograph/ir';

const ir = validateIR(json);
<Infographic ir={ir} assetBase={import.meta.env.BASE_URL} />;
```

`assetBase` is prepended to local `/assets/...` paths. This lets the same portable IR work at a project subpath, such as GitHub Pages. For grid documents, pass a `renderers` registry keyed by a built-in block type to replace selected widgets. Callback context includes the block, style, shape, layout columns, block index, and asset base; return `null` to use the default widget. Poster documents currently use their built-in widgets.

This package exports ESM JavaScript and TypeScript declarations from `dist/`. Build with `pnpm --filter @min-infograph/renderer build`.

## Astro and React server rendering

Enable Astro's React integration (`@astrojs/react`). Use a local React wrapper so Astro can identify the framework at the island boundary. See [Astro framework components](https://docs.astro.build/en/guides/framework-components/) and [client directives](https://docs.astro.build/en/reference/directives-reference/#clientvisible).

```tsx
// src/components/InfographicIsland.tsx
import { Infographic, type InfographicProps } from '@min-infograph/renderer';

export default function InfographicIsland(props: InfographicProps) {
  return <Infographic {...props} />;
}
```

```astro
---
// src/pages/guide.astro
import InfographicIsland from '../components/InfographicIsland';
import { validateIR } from '@min-infograph/renderer';
import '@min-infograph/renderer/styles.css';
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
import { Infographic, type ThemeOverrides } from '@min-infograph/renderer';

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
