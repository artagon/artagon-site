## ADDED Requirements

### Requirement: Font Metrics Verification Gate

`scripts/verify-font-metrics.mjs` (`npm run verify:font-metrics`) MUST run as part of `npm run postbuild` after `verify-font-self-hosting`. The gate verifies for each WOFF2 binary under `public/assets/fonts/`:

1. SHA-256 checksum matches the entry in `public/assets/fonts/CHECKSUMS`.
2. `cmap` table coverage is a subset of the `unicode-range` declared in the `@font-face` block in `theme.css`.
3. `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` declared in the `@font-face` block agree with the values re-derived from the WOFF2's `head` + `OS/2` tables to within 0.5%.
4. A non-empty `LICENSE.txt` (≥ 1 KB) sibling exists in the same family directory.

Any violation MUST exit non-zero with the offending family + file + property + actual-vs-expected diff so the contributor can re-derive metrics or restore the binary.

#### Scenario: Postbuild runs verify:font-metrics

- **WHEN** `npm run postbuild` finishes
- **THEN** `scripts/verify-font-metrics.mjs` ran (visible in console output) and exited zero; no `✗` lines.

#### Scenario: SHA-256 mismatch fails the build

- **WHEN** a contributor replaces a `.woff2` binary without updating `CHECKSUMS`
- **THEN** the gate exits non-zero with `sha256 mismatch for <path>`.

#### Scenario: Override drift fails the build

- **WHEN** the `size-adjust` value declared in `theme.css` differs from the value re-derived from the binary by more than 0.5%
- **THEN** the gate exits non-zero with `<family>/<weight>-<style>.woff2: size-adjust drift: declared 95.5%, expected 96.1%`.

#### Scenario: Out-of-subset codepoint fails the build

- **WHEN** the WOFF2's `cmap` table contains a codepoint outside the declared `unicode-range` in the `@font-face` block (subset bounds drift)
- **THEN** the gate exits non-zero with `<family>: codepoint U+<hex> not in declared unicode-range`.

#### Scenario: Missing license fails the build

- **WHEN** a `LICENSE.txt` is removed or shrinks below 1 KB
- **THEN** the gate exits non-zero with `missing or truncated license for <family>`.

### Requirement: Font Payload Measurement Gate

`scripts/measure-font-payload.mjs` (`npm run measure:font-payload`) MUST run as part of `npm run postbuild` after `verify:font-metrics`. The gate scans `.build/dist/**/*.html` (the configured output dir per `build.config.json`), identifies all WOFF2 references (preload links + `@font-face` URIs reached via referenced stylesheets), sums on-disk byte sizes per route AND per family-per-route, and exits non-zero if either bound is exceeded:

- Total WOFF2 bytes per route > 180 KB.
- Per-family WOFF2 bytes per route > 60 KB.

The gate output MUST be machine-readable: a JSON line per route with `{ route, total_bytes, families: { <family>: bytes } }`. CI captures the JSON for trend analysis.

#### Scenario: Home route within budget

- **WHEN** `npm run postbuild` finishes
- **THEN** `measure-font-payload.mjs` reports the home route's total ≤ 180 KB and per-family ≤ 60 KB; gate exits zero.

#### Scenario: Adding a heavy family fails the build

- **WHEN** a contributor adds Inter Tight 400-italic (a new style) and the home route total exceeds 180 KB
- **THEN** the gate exits non-zero with `route=/ total=192KB exceeds 180KB; offending family=inter-tight at 73KB`. (Inter Tight tops out at weight 700; new italic style is the realistic budget-busting example.)

#### Scenario: JSON report is captured by CI

- **WHEN** the workflow runs `npm run postbuild`
- **THEN** the workflow's log contains the per-route JSON output of `measure-font-payload.mjs`, suitable for dashboard ingestion.
