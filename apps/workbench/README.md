# Composable Mermaid Infographics

A client-side proof of concept for compiling an infographic JSON document into a styled HTML composition. The JSON is the durable source. Mermaid SVG is generated in the browser and discarded when the source changes.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Select **AI Agent**, **Temporal**, **Style study**, **Emotion & decisions**, **AI opportunity**, or **Mermaid shapes**, then edit the JSON in the workbench. Open an example directly with `/?example=emotion`, `/?example=opportunity`, or `/?example=mermaid`. The Theme and Shape controls update the JSON source and preview together. The Mermaid shapes example also exposes per-diagram font size and node shape controls. Invalid JSON or IR shows a path-specific error. The built-in experiment measures 1, 5, and 10 sequential Mermaid renders when the selected example has a diagram.

The preview has **Zoom in**, **Zoom out**, and **Fit** controls. Drag the canvas to pan; when zoomed, use the mouse wheel for pointer-centered zoom or pinch on touch screens. The zoom level appears beside the controls.

```sh
npm run build
npx playwright install chromium
npm run check:browser
```

The browser check covers Mermaid rendering, IR edits, image loading and validation, zoom controls, and document width on desktop and phone viewports. It saves review screenshots in the ignored `artifacts/` directory.

## IR

Version `0.1` supports a two-column `grid` layout with `mermaid`, `text`, `callout`, `metric`, and `image` blocks. The 20-column `poster` layout adds editable card, flow, comparison, step, takeaway, visual story, feature strip, quote, heading, and image widgets. Each poster block has a `span`. The `style` field selects `technical`, `editorial`, `mindful`, or `opportunity`; `shape` selects `rounded` or `angular` corners. Poster icons are bundled from Phosphor.

```json
{
  "version": "0.1",
  "title": "How AI Agents Work",
  "style": "technical",
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

The [type definitions](src/types/infographic.ts) and [validator](src/renderer/validateIR.ts) define the full schema. Validation rejects duplicate IDs, unknown fields, invalid spans, missing text, unsupported values, and Mermaid strings without a declaration. Mermaid itself reports syntax errors in the affected diagram card.

### Mermaid appearance

A `mermaid` block can set its own label size, flowchart node shapes, and static lighting effects without changing the authored links or editing Mermaid's generated SVG:

```json
{
  "id": "flow",
  "type": "mermaid",
  "title": "A shaped flow",
  "diagram": "flowchart LR\n  Idea[New idea] --> Build[Build a draft]",
  "appearance": {
    "fontSize": 22,
    "nodeShapes": { "Idea": "stadium", "Build": "hex" },
    "nodeEffects": { "Build": "soft-shadow", "Idea": "blue-glow" }
  }
}
```

`fontSize` accepts whole pixel values from 12 to 28 and applies to this diagram only. `nodeShapes` accepts flowchart node IDs and the Mermaid-native shapes `rect`, `rounded`, `stadium`, `diam`, `hex`, `cyl`, `circle`, and `cloud`. `nodeEffects` accepts the same node IDs and the presets `none`, `soft-shadow`, `blue-glow`, and `coral-glow`. The node IDs must match IDs in `diagram`; shape and effect declarations are appended before rendering. Other Mermaid diagram types can use `fontSize`, but node shapes and effects are flowchart-only. The document-level **Shape** control changes rectangle corners across the infographic; the Mermaid controls change the first diagram's selected node geometry and effect. Open [the example](http://localhost:5180/?example=mermaid) to compare styled and plain versions.

### Images in the IR

Place a PNG, JPG, or WebP file under `public/assets/`, then reference it from a grid `image` block, a poster `poster-image` block, or an image-backed poster card or story:

```json
{
  "type": "image",
  "id": "illustration",
  "span": 2,
  "image": {
    "src": "/assets/my-illustration.png",
    "alt": "A person building a game with AI",
    "fit": "contain"
  },
  "caption": "An editable image block"
}
```

`src` accepts app-local raster assets under `/assets/`; `alt` is required, and `fit` can be `contain` or `cover`. The JSON stores a path rather than image bytes. Remote URLs, data URLs, SVG files, query strings, and traversal paths are rejected. A missing file shows an “Image unavailable” placeholder. Rebuild the app after adding a file to the LAN service's `public/assets/` directory.

Examples: [AI Agent](src/examples/ai-agent.json), [Temporal](src/examples/temporal.json), [Style study](src/examples/style-study.json), [Emotion & decisions](src/examples/emotion-decisions.json), [AI opportunity](src/examples/opportunity-ai.json), and [Mermaid shapes](src/examples/mermaid-appearance.json).

## Rendering findings

| Question | Finding |
| --- | --- |
| Shared visual style | Mermaid `base` theme variables align node fills, borders, text, signals, and notes with the surrounding cards. `themeCSS` rounds flowchart nodes and adjusts stroke weight. Flowchart spacing and sequence actor margins are configured separately. The card system carries the stronger visual hierarchy. |
| Multiple diagrams | Both examples render a flowchart and sequence diagram independently. Each `mermaid.render()` call receives a unique generated ID; the browser check found no duplicate SVG IDs. Calls are serialized because Mermaid temporarily uses the DOM during rendering. |
| Responsive layout | CSS Grid uses two columns on wide screens and one at 800px or below. At 390px, left-to-right flowcharts compile top-to-bottom from the same IR so labels stay readable. Browser checks at 1440px, 800px, and 390px found no page-level horizontal overflow. Sequence diagrams remain visually dense on mobile. |
| Render cost | Local headless Chromium runs measured roughly **40–58 ms** for one Temporal flowchart render, **174–302 ms** for five, and **328–556 ms** for ten. These are rough warm-render measurements, not a controlled benchmark. Mermaid loads on demand; the workbench button repeats the experiment on another machine. |

**Assessment:** The examples read as composed infographics: title, explanatory content, metric, callout, and diagrams share a palette and grid rhythm. Mermaid styling is sufficient for this PoC. Dense sequence diagrams and long horizontal flowcharts are the clearest limits; future designs should keep each diagram focused or give it more room. No generated SVG is edited or stored as source.
