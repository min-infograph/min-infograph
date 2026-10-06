# Min Infograph

Min Infograph turns a small JSON document into a composed infographic. Documents stay portable and editable; the renderer builds HTML and Mermaid SVG from the source each time. The current source monorepo carries the original workbench forward, with reusable IR, React widgets, a local CLI, and an authoring skill.

The next coordinated release is `@min-infograph/core@0.3.0` and `@min-infograph/cli@0.3.0`. Core `0.2.2` is already on npm; CLI `0.3.0` requires its initial owner bootstrap before automated releases. npm is the primary distribution platform. The JSON schema remains version `0.1`.

For app and static website integration, see the [official documentation](https://min-infograph.github.io/docs/) and [package and release guide](release/README.md).

## Install and render

After 0.3.0 is published, install from npm (Node.js 22.14+):

```sh
npm install @min-infograph/core react react-dom
npm install --global @min-infograph/cli
min-infograph --help
min-infograph validate ./document.json
min-infograph install-browser
min-infograph render ./document.json ./document.png
```

With pnpm, use `pnpm add @min-infograph/core react react-dom` and `pnpm add -g @min-infograph/cli`. Chromium installation is explicit; on Linux, `min-infograph install-browser --with-deps` can install required OS libraries. Help and validation do not require a browser. PNG rendering waits for Mermaid SVG, images and fonts. `/assets/name.png` resolves to `assets/name.png` beside the input JSON, including nested folders. Missing or broken images fail the render.

## Develop locally

Use Node.js 24, npm 11.21.0 and pnpm 12.6.0:

```sh
pnpm install --frozen-lockfile
pnpm release:package
pnpm dev
pnpm infograph validate apps/workbench/src/examples/ai-agent.json
pnpm infograph install-browser
pnpm infograph render apps/workbench/src/examples/ai-agent.json /tmp/agent.png
```

`pnpm infograph` runs the generated CLI artifact; rebuild it with `pnpm release:package` after changes.

## Workspace

| Path | Purpose |
| --- | --- |
| `packages/ir` | TypeScript IR types and strict JSON validation for grid and poster documents. |
| `packages/renderer` | React renderer, Mermaid styling, zoom and pan, and poster widgets. |
| `packages/cli` | Public npm CLI, built into `release/out/cli` with standalone assets. |
| `release` | Generated public core package and two-package release tooling. |
| `apps/workbench` | Migrated editor, preview, examples, assets, and the original browser checks. |
| `skills/min-infograph-authoring` | Agent skill for writing and validating infographic documents. |

IR, renderer and workbench are private workspace packages; consumers import core, never these unpublished packages. Core bundles their code and rewrites declarations to relative package paths. CLI bundles validation and a self-contained browser renderer, with Playwright as its only runtime dependency.

The site source is deployed from this repository to [min-infograph.github.io/min-infograph](https://min-infograph.github.io/min-infograph/). GitHub Pages builds use the `/min-infograph/` base path; `pnpm pages` reproduces that build locally.

## How documents work

The JSON document is the durable source. Version `0.1` supports a two-column `grid` layout with Mermaid, text, callout, metric, and image blocks. The 20-column `poster` layout adds card, insight, flow, comparison, steps, takeaways, banner, visual story, feature strip, quote, heading, and image widgets.

```json
{
  "version": "0.1",
  "title": "How AI Agents Work",
  "style": "technical",
  "shape": "rounded",
  "layout": { "type": "grid", "columns": 2 },
  "blocks": [
    {
      "id": "architecture",
      "type": "mermaid",
      "title": "Architecture",
      "span": 2,
      "diagram": "flowchart LR\nUser --> Agent\nAgent --> Tools"
    },
    {
      "id": "key-idea",
      "type": "callout",
      "title": "Key idea",
      "text": "The agent observes the result and decides what to do next."
    }
  ]
}
```

Set `style` to `technical`, `editorial`, `mindful`, or `opportunity`; set `shape` to `rounded` or `angular`. Every block needs a unique `id`. Grid blocks can set `span` to occupy more columns. Poster blocks have a `span` from 1–20.

Mermaid blocks support per-diagram font size, native flowchart node shapes, and static effects. Image paths are authored as local `/assets/name.png`, `/assets/name.jpg`, or `/assets/name.webp` paths with descriptive alt text. The renderer accepts `assetBase`; the workbench supplies Vite's base path so images also work under GitHub Pages.

The complete schema and path-specific validation rules live in [`packages/ir/src`](packages/ir/src). Existing examples are in [`apps/workbench/src/examples`](apps/workbench/src/examples).

## Build with the renderer

The public `@min-infograph/core` package exports `Infographic`, `PosterInfographic`, `ZoomPanCanvas`, Mermaid helpers, block types, and the stylesheet at `@min-infograph/renderer/styles.css`. The application passes a validated `InfographicIR`:

```tsx
import '@min-infograph/core/styles.css';
import { Infographic } from '@min-infograph/core';
import { validateIR } from '@min-infograph/core';

const ir = validateIR(documentJson);
export function Preview() {
  return <Infographic ir={ir} assetBase={import.meta.env.BASE_URL} />;
}
```

Grid documents also accept a renderer registry keyed by built-in block type. This supports app-specific treatments while keeping the source document valid for other renderers. Return `null` to use the built-in widget:

```tsx
<Infographic ir={ir} renderers={{
  metric: ({ block, index }) => block.type === 'metric'
    ? <MyMetric key={block.id} value={block.value} label={block.label} position={index} />
    : null,
}} />
```

Callbacks receive `block`, `style`, `shape`, `columns`, `index`, and `assetBase`. The current extension registry customizes built-in grid block types; registering entirely new IR block types is planned with a future schema extension API.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for local checks and changes to the schema and renderer. Bug reports and feature proposals are welcome. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

Astro hosts can use a React wrapper with `client:visible`: server-rendered diagrams begin as placeholders and become SVG after hydration. See the [Astro, headings, and per-instance theme guide](release/README.md#astro-and-react-server-rendering). Renderer CSS is scoped and does not load fonts or reset the host page.
