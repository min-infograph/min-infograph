# Contributing

Thanks for helping improve Min Infograph. Issues and pull requests are welcome.

## Local development

1. Install Node.js 22.14+ and pnpm 12.6.0.
2. Run `pnpm install` and `pnpm build`.
3. Start the editor with `pnpm dev`.
4. Run `pnpm --filter @min-infograph/workbench check:browser` for browser coverage. Install Chromium first with `pnpm --filter @min-infograph/workbench exec playwright install chromium`.

## Changing the document model

Keep JSON as the durable input. When adding or changing a built-in block, update its type, validator, React renderer, example, and README documentation together. Preserve path-specific validation errors and reject unknown fields. Keep browser-specific APIs out of the IR package.

For a new built-in grid widget, update `InfographicBlock.tsx` and its renderer styles. Existing host applications can customize current grid block rendering with the `renderers` registry. Entirely new block types require an explicit schema extension design and should not be smuggled into the existing JSON format.

## Pull requests

Keep changes focused, describe visible behavior and compatibility impact, and include relevant validation evidence. Run `pnpm build` and the browser check for renderer or workbench changes. Do not commit generated `dist`, `node_modules`, test results, or local screenshots.
