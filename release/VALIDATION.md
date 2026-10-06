# 0.3.0 candidate validation

## Registry readiness follow-up (2026-10-07)

Publishing-only candidate based on merged main `2c481f4`, with source/package versions and existing tags unchanged. Node 24.12.0 and pnpm 12.6.0 were used. Locked dependencies were installed with lifecycle scripts disabled; no live publish or registry readiness probe was performed.

- `pnpm release:policy-test`: all 21 policy and registry tests passed. Injected metadata, clocks and sleep functions cover pending-to-ready beyond 30 seconds, the ten-minute deadline and actionable timeout, request budgets and aborts during fetch/body reads, transient/permanent HTTP and network failures, immediate integrity conflicts, delayed dist-tags, channel rollback prevention, both-package preflight, identical-artifact retries, dry-run behavior, and absence of repeated publish/tag mutations during polling. No real polling waits or registry requests occur in these tests.
- `node --check` for every `release/*.mjs`: passed.
- Whole-candidate diff review and `git diff --check`: passed, including new modules and tests. Changes are limited to release publishing, release test wiring and documentation; renderer checks were unnecessary for this scope.

The exact-tag checkout in the hosted workflow still uses the script committed at `v0.3.0`; this candidate cannot retrofit that immutable tag. Recovery guidance in `release/README.md` distinguishes acceptance from visibility and documents the need for separately reviewed tooling if recovering that release with patched polling. No integration, push, publish or tag changes were performed.

## Original release candidate validation

Validated in the isolated worktree on 2026-10-07 with Node 24.12.0, npm 11.21.0 and pnpm 12.6.0. The host default npm was 11.6.2; release checks used npm 11.21.0 installed in `/tmp/min-infograph-release-tools`, with its bin directory prepended to PATH. No credentials were read or printed, and no npm publish, tag creation, push or integration was performed.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed with the updated lockfile. |
| `pnpm release:package` | Passed full workspace build; generated and packed core and CLI 0.3.0, versioned browser JS/CSS and SHA256SUMS. |
| `pnpm typecheck` | Passed for all workspace packages. |
| `pnpm test` | All 19 existing browser tests passed, including SSR/hydration, responsive layouts, themes, Mermaid and image-backed posters. Repeated after public theme types were separated. |
| `pnpm release:policy-test` | All 4 tests passed: stable/prerelease channels, strict version/tag/flag matching, artifact integrity retries and prevention of channel rollback. |
| `pnpm release:smoke` | Both tarballs installed into clean temporary npm and pnpm consumers. Installed binary help, explicit browser installer, valid/invalid JSON, actual PNG containing Mermaid and a nested local PNG, missing/corrupt image failures, escaped asset symlink rejection, public core imports and strict TypeScript consumer checks passed. No skipLibCheck; invalid heading/theme types are asserted. |
| `pnpm release:browser-smoke` | Self-contained classic browser bundle rendered the sample and all expected Mermaid SVGs, without page errors. |
| `node release/copy-pages.mjs` and `pnpm --filter @min-infograph/workbench build:pages` | Passed; generated versioned 0.3.0 assets, restored the original integrity-pinned 0.2.2 browser/CSS URLs from npm and built the existing Pages workbench. |
| `pnpm infograph --help`, `pnpm infograph validate ...` and `pnpm infograph render ... /tmp/min-infograph-project.png` | Passed using the generated CLI in the source checkout. Root development dependencies include the matching Playwright runtime for this invocation. |
| `PLAYWRIGHT_BROWSERS_PATH=<empty path> node release/out/cli/src/index.js ...` | Help and validation passed without a browser; render exited 1, printed `min-infograph install-browser`, and closed its server. |
| Workflow YAML parsing | CI, npm-publish and Pages parsed successfully with a temporary YAML parser. |
| `git diff --check` | Passed. |

The negative asset smoke initially exposed successful exports with missing images because the renderer replaces broken images with placeholders. The CLI now checks failed asset responses, fallback elements and rendered image count. Strict declaration compilation exposed an internal Mermaid type dependency; public theme interfaces now live in their own dependency-free module, and packed stylesheet declarations support strict side-effect import checking.

Build output retains Vite's existing large-chunk advisory; it did not fail validation. Generated output, screenshots and browser reports remain ignored. Tarballs are in `release/out/assets/` and can be recreated from the committed candidate.

Live GitHub OIDC publishing and registry installs of 0.3.0 cannot be exercised locally before publication. The workflow performs those checks on the hosted runner after publishing. An authorized npm owner must bootstrap the nonexistent CLI package and configure its per-package publisher, verify core's existing publisher identity and enable direct publish/dist-tag permissions. New npm publisher configurations require their first successful publish within two days; a skipped locally bootstrapped version does not validate CLI OIDC. These setup steps are documented in `release/README.md` using the official npm trusted-publishers documentation.
