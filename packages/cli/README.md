# Min Infograph CLI

The current CLI is a repository-local tool. It validates source JSON and exports PNG images using the workbench, Vite, and Playwright Chromium.

```sh
pnpm build
pnpm --filter @min-infograph/workbench exec playwright install chromium
pnpm infograph validate apps/workbench/src/examples/ai-agent.json
pnpm infograph render apps/workbench/src/examples/ai-agent.json /tmp/agent.png
```

`render` waits for Mermaid SVG, local images, and document fonts, then captures the infographic. It currently supports PNG export only. The CLI package depends on the monorepo workbench and is not ready for standalone npm distribution.
