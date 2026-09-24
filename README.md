# Min Infograph

Min Infograph turns a small JSON document into a composed infographic. Documents stay portable and editable; the renderer builds HTML and Mermaid SVG from the source each time. The current source monorepo carries the original workbench forward, with reusable IR, React widgets, a local CLI, and an authoring skill.

> **Project status:** early open-source foundation. The renderer is installable from the [v0.2.1 GitHub Release](https://github.com/min-infograph/min-infograph/releases/tag/v0.2.1). The CLI currently depends on the monorepo workbench and is a repo-local executable. The package is not yet in the npm registry; a stable `1.0` schema is still planned.

For app and static website integration, start with the [official documentation](https://min-infograph.github.io/docs/) and [release guide](release/README.md). The release tarball installs with npm or pnpm, and a versioned browser bundle supports sites without a build step.

## Start here

Requirements: Node.js 22.14+ and pnpm 12.6.0. Install, build, and start the workbench:

```sh
pnpm install
pnpm build
pnpm dev
```

Choose an example, edit its JSON, switch themes and shapes, and inspect the live result. You can also open a sample directly with `/?example=emotion`, `/?example=opportunity`, or `/?example=mermaid`.

### Validate and export an image

The CLI validates JSON and can render a PNG through the local workbench and Chromium:

```sh
pnpm infograph validate apps/workbench/src/examples/ai-agent.json
pnpm infograph render apps/workbench/src/examples/ai-agent.json /tmp/agent.png
```

The first build is needed so the shared packages are available. Install the Playwright browser once before PNG export:

```sh
pnpm --filter @min-infograph/workbench exec playwright install chromium
```

`render` waits for Mermaid diagrams and images, then captures the infographic itself. The CLI does not currently export PDF or raw SVG.

## Workspace

| Path | Purpose |
| --- | --- |
| `packages/ir` | TypeScript IR types and strict JSON validation for grid and poster documents. |
| `packages/renderer` | React renderer, Mermaid styling, zoom and pan, and poster widgets. |
| `packages/cli` | Local `validate` and Chromium-backed `render` commands. |
| `apps/workbench` | Migrated editor, preview, examples, assets, and the original browser checks. |
| `skills/min-infograph-authoring` | Agent skill for writing and validating infographic documents. |

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

`@min-infograph/renderer` exports `Infographic`, `PosterInfographic`, `ZoomPanCanvas`, Mermaid helpers, block types, and the stylesheet at `@min-infograph/renderer/styles.css`. The application passes a validated `InfographicIR`:

```tsx
import '@min-infograph/renderer/styles.css';
import { Infographic } from '@min-infograph/renderer';
import { validateIR } from '@min-infograph/ir';

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
