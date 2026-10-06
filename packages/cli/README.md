# Min Infograph CLI

Install from npm with Node.js 22.14+:

```sh
npm install --global @min-infograph/cli
# or: pnpm add -g @min-infograph/cli
min-infograph --help
min-infograph validate ./document.json
min-infograph install-browser
min-infograph render ./document.json ./document.png
```

Chromium must be installed explicitly. On Linux, use `min-infograph install-browser --with-deps` for OS libraries. Help and validation work without a browser.

The package contains its validator and browser renderer. It needs no workbench, Vite server or repository files. Local `/assets/...` image paths resolve below `assets/` beside the input JSON; nested PNG/JPEG/WebP paths work. Missing/broken images, escaped asset symlinks and failed diagrams stop rendering. The CLI waits for Mermaid, images and fonts before capturing the infographic as PNG. It closes the ephemeral loopback HTTP server and browser on success and failure.

For source development, build both packages with `pnpm release:package`, then use `pnpm infograph`. Public core and CLI share a release version; IR and renderer are private implementation packages.
