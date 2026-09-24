---
name: min-infograph-authoring
description: Create and edit Min Infograph JSON documents with validated grid or poster layouts, built-in widgets, Mermaid diagrams, themes, shapes, and local images.
---

# Min Infograph authoring

Use this skill when creating or modifying an infographic supported by `@min-infograph/ir` and the Min Infograph renderer.

1. Read the destination project's existing infographic JSON, examples, and installed renderer version before editing.
2. Keep the JSON document as the source of truth. Select `layout.type: "grid"` for flexible content blocks or `layout.type: "poster"` for the 20-column poster widget set.
3. Choose a supported style (`technical`, `editorial`, `mindful`, `opportunity`) and shape (`rounded`, `angular`). Give each block a unique stable `id` and a useful `span`.
4. Prefer specific blocks over long unbroken prose. Use Mermaid for diagrams, callouts for emphasis, metrics for quantified facts, and poster widgets for steps, comparisons, takeaways, stories, and feature strips.
5. For images, place a PNG, JPG, JPEG, or WebP asset in the host application's `/assets/` directory and use an `/assets/...` path with descriptive alt text. Do not embed remote URLs or data URLs.
6. Validate the final JSON with `pnpm infograph validate path/to/file.json` or the workbench validator. Resolve every path-specific error before considering the document complete.
7. Review the rendered output at desktop and mobile widths. Check text wrapping, diagram density, contrast, and image crop; adjust the source JSON rather than hand-editing generated SVG.

For the complete supported shape, inspect the TypeScript types and examples in the source repository. New widget types require a schema update, renderer implementation, and documentation/example update.
