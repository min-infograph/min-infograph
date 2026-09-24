# `@min-infograph/ir`

Renderer-independent TypeScript types and strict JSON validation for version `0.1` infographic documents.

```ts
import { validateIR } from '@min-infograph/ir';

const document = validateIR(JSON.parse(source));
```

`validateIR` accepts `unknown`, returns a typed `InfographicIR`, and throws path-specific errors for invalid input. It validates grid and 20-column poster layouts, block fields, stable IDs, image paths, themes, shapes, and Mermaid appearance values. The package does not load browser APIs or Mermaid.

Build with `pnpm --filter @min-infograph/ir build`. See the [root README](../../README.md) for the document model and examples.
