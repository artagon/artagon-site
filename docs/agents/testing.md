# Testing

User-facing test docs are in `docs/AUTOMATED_TESTING.md`. This page holds the contracts agents must keep.

Run `npm run check` (`astro check`) to type-check source, components, configuration, and included tests under `astro/tsconfigs/strictest`; `.github/workflows/design-md-lint.yml` runs it after `npm ci` (USMR 14.7).

## Three runners, disjoint by what they import

| Runner                          | Owns                                                          | Config                                     | Discovery                                                                                             |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Playwright (`@playwright/test`) | `tests/**/*.spec.ts`                                          | `playwright.config.ts`                     | `testMatch: "**/*.spec.ts"` (overrides the default)                                                   |
| vitest                          | `tests/**/*.test.mts`                                         | `vitest.config.ts`                         | `include: ["tests/**/*.test.mts"]`, with an explicit `exclude` for the legacy `tweaks-state.test.mts` |
| node:test                       | `tests/**/*.test.mjs` plus the legacy `tweaks-state.test.mts` | `package.json` `test:node` / `test:tweaks` | No glob; each file is listed by name                                                                  |

The globs must stay disjoint. Playwright's default glob (`**/*.@(spec|test).?(c|m)[jt]s?(x)`) overlaps both other runners. Loading `vitest` and `@playwright/test` in one process fails with a `Symbol($$jest-matchers-object)` collision (PR #46; fixed in `7b51428` / `9a3981b`).

Adding a third kind of runner means every runner config gets an explicit `include` / `exclude`.

## Agent browser verification

The browser tools have three distinct lanes:

- Use `playwright-cli` for agent verification of a rendered page and for generating new Playwright spec code. `.playwright/cli.config.json` uses an isolated in-memory Chromium profile through the installed Chrome channel and writes output under `.build/reports/playwright-cli/`. Run it from the repo root: relative `--filename`, `state-save`, and video paths resolve against the repo root, and every explicit path must sit under `.build/reports/playwright-cli/`.
- Use the `playwright` MCP server for exploratory work and long-running browser sessions.
- Use the Playwright test runner for the automated spec suite and CI.

Playwright CLI rules:

- Run `rtk npx --no-install playwright-cli` from the repo root.
- Never pass `--config`, `--persistent`, `--profile`, `attach`, or `--extension`.
- Never install `@latest` or run `npm init playwright`.
- Serve pages with `npx astro preview --port 4400`.
- Get user approval before `gh ... --attach` or any other external write.

The coordinator decided to keep the `playwright` MCP entry for exploratory work. The CLI nests Playwright `1.64.0-alpha` and drives system Chrome stable, while the test runner uses `@playwright/test` `1.59.1`; check CLI-generated spec code against the runner's API before adding it to the suite.

## Browser-profile isolation

Every Playwright project comes from `devices[...]` in `playwright.config.ts`, which creates an ephemeral context per test. Never call `chromium.launchPersistentContext` with a real profile path. That exposes the developer's browser keychain and cookies to the test run.

## Device matrix (15 projects)

- Desktop: `chromium`, `firefox`, `webkit`, `Edge` (msedge channel), `Chrome` (chrome channel).
- Mobile: `Mobile Chrome` (Pixel 5), `Mobile Chrome (Pixel 7)`, `Mobile Chrome (Galaxy S9+)`, `Mobile Safari` (iPhone 12), `Mobile Safari (iPhone 14 Pro Max)`.
- Tablet: `Tablet Safari` (iPad Pro 11), `Tablet Safari (iPad Mini)`, `Tablet Chrome (Galaxy Tab S4)`.
- Large: `TV` (1920×1080), `TV 4K` (3840×2160 HiDPI).

The CI image (`mcr.microsoft.com/playwright:vX.Y.Z-jammy`) bundles chromium, firefox, and webkit. The `test` job installs the Edge and Chrome stable channels with `npx playwright install msedge` / `chrome`.

Adding a device project means updating `projects[]` in `playwright.config.ts` and checking that `TOTAL_SHARDS` in `.github/workflows/playwright.yml` still splits evenly.

## Scoping by device class

- Smoke and a11y-contract assertions run on every project.
- Mouse-driven tests skip on touch projects with `test.skip(({ isMobile }) => isMobile, ...)`. The touch-affordance gap is tracked by `openspec/changes/enhance-a11y-coverage/`.
- The axe-core WCAG audit (`tests/home-axe.spec.ts`) is mandatory and runs on chromium, webkit, and Mobile Safari. It audits `/` only.
- Visual snapshots are opt-in and chromium-only. `tests/styling-snapshots.spec.ts` skips unless `VISUAL_REGRESSION=1`, and skips every project except `chromium`. Run them locally with `VISUAL_REGRESSION=1 npx playwright test styling-snapshots.spec.ts`. Linux baselines (`*-chromium-linux.png`) are meant to be regenerated by the `workflow_dispatch` path of `.github/workflows/playwright.yml`. Local Darwin and Windows runs write gitignored host PNGs. Do not remove the chromium-only skip before Linux baselines exist for the new engine.
- Cross-engine color and backdrop differences are guarded structurally (computed-style reads in `tests/header.spec.ts`, plus the axe audit), not by pixel diffs.

## Gotchas

- `lint:tokens` walks `git ls-files`, so a new untracked CSS file looks clean. Re-run the gate after `git add`.
- Several vitest lint gates read `.build/dist`; run `npm --ignore-scripts=false run build` first so lifecycle hooks run even when npm globally ignores scripts, or they skip with a warning (`tests/lint-rss-discovery.test.mts` fails instead).

## Known CI issues

From the 2026-10-20 review (beads under epic `site-2m1`):

- No Linux snapshot baselines are tracked, and visual comparison remains `continue-on-error`. The corrected updater is a separate trusted-main dispatch job with a verified Chromium Linux pathspec; baseline seeding, selector verification, and subsequent comparison hardening remain pending (`site-2m1.38`).
- The header hit-area tests are `test.fixme`, and the GitHub icon is 34 × 34 px (`site-2m1.32`).
