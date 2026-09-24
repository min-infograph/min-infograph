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
