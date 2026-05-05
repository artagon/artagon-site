# DESIGN.md — Authoring & Maintenance Guide

> This document is the canonical reference for authoring and maintaining `DESIGN.md` in this repository.
> It covers the precedence chain, maintenance workflows, the OKLCH↔hex hybrid policy, upstream attribution, and the allow-list for `check:design-drift`.

---

## 1 · Precedence chain

> openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change.

Source of truth hierarchy:

1. `openspec/specs/<capability>/spec.md` — governs behavior (functional requirements, acceptance scenarios, CI gates).
2. `DESIGN.md` (repo root) — governs visual presentation (token values, section conventions, component visual contracts).
3. Implementation (`src/`, `public/assets/theme.css`, etc.) — traces to both. Implementation is never the source of truth.

When a code change conflicts with `DESIGN.md`, the code changes (or a `DESIGN.md` change is proposed under the appropriate OpenSpec change). When `DESIGN.md` conflicts with a spec requirement, the spec governs the implementation and `DESIGN.md` is updated within the same OpenSpec change.

This phrasing is canonical and used verbatim in `README.md`, `AGENTS.md`, and `openspec/project.md`. Do not paraphrase.

### Origin: promotion from `new-design/extracted/DESIGN.md`

The repo-root `DESIGN.md` was promoted from `new-design/extracted/DESIGN.md` on 2026-05-04 per the `adopt-design-md-format` openspec change. The earlier copy at `new-design/extracted/DESIGN.md` is retained for diff history but is no longer authoritative — the root `DESIGN.md` supersedes it. Edits MUST go to the root file. The `new-design/extracted/` directory (including the historical `DESIGN.md` copy) is gitignored on `main` and slated for deletion by the `cleanup-new-design-extracted` follow-up change once `update-site-marketing-redesign` and `add-brand-assets-and-writing-pipeline` archive.

---

## 2 · Adding a new color token

1. Edit the OKLCH triple in `DESIGN.md` prose under section "## 2 · Colors" (or its subsections — "Base palette", "Accent", "Semantic"). Record the token name, perceptual lightness (L), chroma (C), and hue (H) using the format `--token-name = oklch(L C H)`.
2. Run `node scripts/oklch-to-hex.mjs --write` to update the conversion table in this document (Section 4). The bare `npm run derive:hex` script prints to stdout — use the `node` command above for the table-write path.
3. Confirm the YAML frontmatter hex in `DESIGN.md` has been updated to match the derived value. The `npm run check:oklch-hex-parity` script will fail if the frontmatter hex deviates by more than 1 LSB per channel from the derived hex.
4. Update `public/assets/theme.css` — add the CSS custom property declaration for the new token.
5. Run `npm run check:design-drift` and confirm it passes (or add an entry to the allow-list in Section 6 with a one-paragraph rationale if the token belongs outside the DESIGN.md frontmatter).
6. Run `npm run lint:design` and confirm it passes with no new `contrast-ratio` warning introduced by the new token's usage in component definitions.

---

## 3 · Bumping `@google/design.md` version

1. Install the new version: `npm install --save-dev --ignore-scripts @google/design.md@<NEW_VERSION>` (exact version, no caret, no tilde). Verify CI uses `npm ci --ignore-scripts`.
2. Regenerate the spec cache and stage it: `npm run spec:cache && git add openspec/.cache/design-md-spec.md`.
3. Update the upstream commit SHA and pinned version in:
   - `openspec/config.yaml` `context: |` block — edit the freeform paragraph that records the design.md pin (search for `97b4df9` and `0.1.1`); keep it on a single tech-stack bullet so the pin is greppable.
   - `.agents/adopt-design-md-format/pins.json` — update `upstream_commit_sha` and `npm_version` fields.
   - `DESIGN.md` frontmatter → `version:` field.
4. Run `npm run test:design-fixtures` and review the output. If the linter's behavior changes (exit codes or finding counts diverge from snapshots), update the test snapshots deliberately — do not silently accept drift.
5. Run `npm run lint:design` and confirm it passes on the current `DESIGN.md`.

---

## 4 · OKLCH↔hex hybrid policy

Artagon's design tokens use the **OKLCH color space** throughout because OKLCH provides perceptually-uniform lightness steps and chroma axes — making the token ladder legible (e.g., a Δ0.03L step is always the same visual distance regardless of hue). This is load-bearing for the twilight/midnight palette system.

The upstream `@google/design.md` format specifies YAML frontmatter colors as `# + sRGB hex` only; OKLCH support is not on the current spec roadmap. We resolve this with a **hybrid representation**:

- **YAML frontmatter (`DESIGN.md` front):** carries `# + sRGB hex` equivalents. These are consumed by downstream tooling, CSS variable generation, and agent ingestion via `@google/design.md lint`.
- **Markdown body (`DESIGN.md` prose):** carries canonical OKLCH triples as the authoritative color specification. OKLCH is the source of truth for the perceptual intent of each token.

The relationship between the two representations is enforced by the parity script at `scripts/check-oklch-hex-parity.mjs`. This script:

- Re-derives hex from all prose-cited OKLCH triples.
- Compares each derived value against the corresponding frontmatter hex.
- Fails if any token deviates by more than **1 LSB per channel** (1/255 per R, G, or B). Sub-LSB differences are visually undetectable round-trip noise from floating-point rounding and are accepted.

The parity check is invoked as a precondition of `npm run lint:design`:

```json
"lint:design": "npm run check:oklch-hex-parity && design.md lint DESIGN.md"
```

The **conversion table** below is auto-generated by `npm run derive:hex --write`
(`node scripts/oklch-to-hex.mjs --write`). The table is bracketed by
`oklch-table:start` / `oklch-table:end` HTML comment markers so the script can
regenerate it without human editing. Do not edit the table contents
manually — run the script instead.

<!-- oklch-table:start -->

| Token          | OKLCH                   | sRGB hex  |
| -------------- | ----------------------- | --------- |
| `--bg`         | `oklch(0.14 0.008 260)` | `#07090c` |
| `--bg-1`       | `oklch(0.17 0.008 260)` | `#0d1013` |
| `--bg-2`       | `oklch(0.2 0.008 260)`  | `#14161a` |
| `--line`       | `oklch(0.28 0.008 260)` | `#27292d` |
| `--line-soft`  | `oklch(0.22 0.008 260)` | `#181b1e` |
| `--fg`         | `oklch(0.96 0.005 85)`  | `#f3f2ee` |
| `--fg-1`       | `oklch(0.82 0.008 85)`  | `#c6c4be` |
| `--fg-2`       | `oklch(0.62 0.008 85)`  | `#888681` |
| `--fg-3`       | `oklch(0.45 0.008 85)`  | `#575550` |
| `--accent`     | `oklch(0.86 0.14 185)`  | `#3ceedd` |
| `--accent-dim` | `oklch(0.5 0.1 185)`    | `#00756b` |
| `--accent-ink` | `oklch(0.18 0.04 185)`  | `#001714` |
| `--ok`         | `oklch(0.8 0.15 155)`   | `#61da92` |
| `--warn`       | `oklch(0.82 0.14 65)`   | `#ffb059` |
| `--bad`        | `oklch(0.66 0.18 25)`   | `#ec5b57` |

<!-- oklch-table:end -->

---

## 5 · Upstream attribution

### Package and format

- **Upstream repository:** https://github.com/google-labs-code/design.md
- **Format license:** Apache-2.0
- **Upstream LICENSE file SHA** (git blob SHA, verified at pin time): `15e431c225cf463f87a61f4e2a76dfb09e2bf849`
  - SHA fetched via: `gh api repos/google-labs-code/design.md/contents/LICENSE --jq '.sha'`
  - Provides a verified reference for license-checker tools (see license gap note below).
- **npm package:** `@google/design.md@0.1.1` (exact pin, no caret)
- **Pinned upstream commit SHA:** `97b4df92901b9353fbc71cfe1b51dad1ece01708`
  - Recorded in `.agents/adopt-design-md-format/pins.json`.
  - Also recorded in `openspec/config.yaml` → `context.upstream_commit_sha`.
- **Captured at:** 2026-05-02

### npm package.json license field gap

As of the pinned version (`0.1.1`), the published npm `package.json` for `@google/design.md` does **not** carry a `"license": "Apache-2.0"` field. This means automated license-checker tools (e.g., `license-checker`, `licensee`) may report the package as having an unknown license.

The LICENSE file in the upstream git repository (`15e431c225cf463f87a61f4e2a76dfb09e2bf849`) confirms the Apache-2.0 license. Filing an upstream issue requesting the field was deferred (Phase 0.5 of `adopt-design-md-format`) because agents cannot file issues on external organization repositories. The upstream LICENSE-file SHA above serves as the verified reference until the upstream fix lands.

### Integrity verification

The `package-lock.json` `integrity` hash for `@google/design.md` must match the npm registry's published signed `dist.integrity`. To verify:

```bash
# Check lock file integrity field:
node -e "const l=require('./package-lock.json'); console.log(l.packages['node_modules/@google/design.md'].integrity)"

# Compare against registry:
npm view @google/design.md@0.1.1 dist.integrity
```

### Vendoring exit strategy

If `@google/design.md` is unpublished from npm or its repository archives for more than 90 days (detected by the weekly `.github/workflows/design-md-drift.yml` cron), source will be vendored into `vendor/design.md/` under Apache-2.0 with a `NOTICE` file citing the upstream repository. At that point a top-level `NOTICE` file must be added with the Apache-2.0 attribution boilerplate.

---

## 6 · Allow-list for `check:design-drift`

The `check:design-drift` script (`scripts/check-design-drift.mjs`) asserts that every CSS custom property declared in `public/assets/theme.css` resolves to a DESIGN.md frontmatter token under one of the four namespaces — `colors`, `typography`, `spacing`, or `rounded` — using either the bare-name form (e.g., `--bg` → `colors.bg`) or the namespaced form (e.g., `--color-bg` → `colors.bg`, `--rounded-md` → `rounded.md`, `--font-display-family` → `typography.display.fontFamily`). Tokens in `public/assets/theme.css` that resolve to neither shape MUST appear here with a one-paragraph rationale before the script will exit 0.

The script reads this section by parsing every backtick-quoted CSS-custom-property name (e.g., `` `--brand-teal` ``) under the `## 6 ·` heading. The rationale-prose presence is enforced by humans in PR review, not by the script — this is the soft contract end of the allow-list. To re-seed after a `theme.css` change, run `node scripts/check-design-drift.mjs --seed-allow-list` and paste new entries into the appropriate sub-section below.

This section governs the **drift** gate (CSS tokens outside DESIGN.md), not the **lint** gate (DESIGN.md internal warnings). For accepted `lint:design` warnings, see Section 7.

### 6.1 Legacy theme primitives

Tokens: `` `--ink` ``, `` `--bg-alt` ``, `` `--surface` ``, `` `--muted` ``, `` `--primary` ``, `` `--text` ``, `` `--border` ``, `` `--ring` ``, `` `--maxw` ``, `` `--radius` ``, `` `--shadow` ``.

Pre-existing theme primitives that pre-date DESIGN.md adoption. They power the legacy `:root` and `:root[data-theme="…"]` blocks that ship the twilight/midnight/slate palette switch the marketing site relies on today. Each one will either fold into a DESIGN.md frontmatter token (e.g. `--text` → `colors.fg`, `--surface` → `colors.bg-1`) or be retired entirely as the redesign in `update-site-marketing-redesign` lands. Until that work concludes the names cannot be removed without breaking every component that references them, so they live on this allow-list with no rationale beyond "transitional, scheduled for removal in TG-D and the redesign change."

### 6.2 Brand triad

Tokens: `` `--brand-teal` ``, `` `--brand-teal-rgb` ``, `` `--brand-violet` ``, `` `--brand-sky` ``.

The brand-mark colours that drive the hero gradient, glow-tag halo, and CTA button. They are NOT part of the DESIGN.md `colors` namespace because they are theme-pack-specific (the tuple changes per `[data-theme]`, where the DESIGN.md `colors` set is theme-invariant intent — `accent` resolves differently per theme through these). `--brand-teal-rgb` exists because `rgba(var(--brand-teal-rgb), 0.2)` is the only fallback that works in `color-mix`-unsupported browsers; it is mathematically the same colour as `--brand-teal` but in `R, G, B` triplet form.

### 6.3 Teal opacity ramps

Tokens: `` `--teal-5` ``, `` `--teal-5-fallback` ``, `` `--teal-8` ``, `` `--teal-8-fallback` ``, `` `--teal-10` ``, `` `--teal-10-fallback` ``, `` `--teal-12` ``, `` `--teal-12-fallback` ``, `` `--teal-15` ``, `` `--teal-15-fallback` ``, `` `--teal-20` ``, `` `--teal-20-fallback` ``, `` `--teal-30` ``, `` `--teal-30-fallback` ``, `` `--teal-40` ``, `` `--teal-40-fallback` ``.

Pre-mixed `color-mix(in srgb, var(--brand-teal) N%, transparent)` ramps with `rgba(var(--brand-teal-rgb), 0.NN)` fallbacks for browsers that lack `color-mix` support. The percentage is encoded in the token name to keep the call-site self-documenting (`background: var(--teal-15)` reads as "15% teal tint" without context). DESIGN.md does not model opacity tints because the upstream `@google/design.md` schema has no opacity-ramp namespace; agents that need a tint should reach for these directly rather than re-derive them.

### 6.4 Surface-teal mixes

Tokens: `` `--surface-teal-5` ``, `` `--surface-teal-5-fallback` ``, `` `--surface-teal-8` ``, `` `--surface-teal-8-fallback` ``, `` `--surface-teal-10` ``, `` `--surface-teal-10-fallback` ``, `` `--surface-teal-15` ``, `` `--surface-teal-15-fallback` ``.

Same pattern as §6.3 except the second mix-component is `var(--surface)` instead of `transparent` — these produce a teal-tinted surface rather than a teal tint over whatever sits behind. Used by hover/active states on cards and chips. Same rationale as §6.3 for living outside DESIGN.md: surface-tint ramps are a CSS pattern, not a design intent.

### 6.5 Border presets

Tokens: `` `--border-teal-solid` ``, `` `--border-teal-solid-thick` ``, `` `--border-teal-subtle` ``, `` `--border-teal-subtle-fallback` ``, `` `--border-teal-subtle-thin` ``, `` `--border-teal-subtle-thin-fallback` ``, `` `--border-teal-faint` ``, `` `--border-teal-faint-fallback` ``, `` `--border-teal-table` ``, `` `--border-teal-table-fallback` ``, `` `--border-left-accent` ``.

Compound `border` shorthand presets — `Npx solid var(--teal-N)` — that exist so component CSS can write `border: var(--border-teal-subtle)` instead of repeating the width and style triple. DESIGN.md `colors` declares the colour intent; these tokens declare the _border-shorthand_ intent, which is a different axis. They are not promotable to DESIGN.md until the upstream schema grows a `borders` namespace.

### 6.6 Gradient presets

Tokens: `` `--gradient-hero` ``, `` `--gradient-hero-fallback` ``, `` `--gradient-surface` ``, `` `--gradient-surface-fallback` ``, `` `--gradient-accent` ``, `` `--gradient-accent-fallback` ``, `` `--gradient-inline` ``, `` `--gradient-inline-fallback` ``, `` `--gradient-vision-2030` ``, `` `--gradient-vision-2030-fallback` ``.

Named multi-stop linear gradients used by the hero, surface, accent, inline-CTA, and vision-2030 sections. Each pairs a `color-mix`-based primary with a `rgba()`-based fallback. DESIGN.md `colors` is single-stop only; gradients are component-level visual primitives that the upstream schema does not model. Per DESIGN.md §1.2 ("Editorial, not SaaS"), gradients are _minimised_, but the few we ship live here.

### 6.7 Shadow scale

Tokens: `` `--shadow-sm` ``, `` `--shadow-md` ``, `` `--shadow-lg` ``, `` `--shadow-xl` ``, `` `--shadow-glow-teal` ``, `` `--shadow-glow-teal-fallback` ``.

Four-level shadow ramp plus a brand-tinted accent glow. DESIGN.md §3.4 states the site's flat aesthetic restricts shadows to specific affordances (dropdowns, the Tweaks panel, accent glow on interactive elements); these tokens are how that policy is implemented. Shadows are not in the upstream `@google/design.md` schema, so they cannot be promoted to frontmatter without a schema extension.

### 6.8 Section / hero spacing utilities

Tokens: `` `--spacing-section` ``, `` `--spacing-section-simple` ``, `` `--spacing-section-large` ``, `` `--spacing-hero-block` ``, `` `--spacing-hero-top` ``, `` `--spacing-hero-inline` ``, `` `--spacing-hero-bottom` ``, `` `--padding-card` ``, `` `--padding-card-compact` ``, `` `--padding-card-inline` ``, `` `--margin-section-header` ``, `` `--margin-content-block` ``, `` `--margin-subsection` ``.

Page-rhythm spacing utilities (the 120px section rhythm from DESIGN.md §3.3, plus card-padding and section-header margins). The DESIGN.md `spacing` namespace declares the _atomic_ spacing scale (`xs`/`sm`/`md`/`lg`/`xl`/`2xl`); these tokens compose those atoms into named _page-level_ utilities. They are intentionally one layer up from the design contract — promoting them would let designers redefine "section padding" by editing CSS, which is the wrong abstraction layer for the contract.

### 6.9 Gap tokens

Tokens: `` `--gap-tiny` ``, `` `--gap-small` ``, `` `--gap-medium` ``, `` `--gap-large` ``.

T-shirt-sized `gap` aliases used inside grid and flex layouts. They map onto the same atoms as §6.8 (`--gap-medium` = `1.5rem`, `--gap-large` = `2rem`) but expose a layout-vocabulary alias rather than a design-token alias. Same architectural rationale: layout vocabulary lives in CSS; design intent lives in DESIGN.md.

### 6.10 Radius variants

Tokens: `` `--radius` ``, `` `--radius-card` ``, `` `--radius-sm` ``, `` `--radius-tiny` ``, `` `--radius-lg` ``, `` `--radius-xl` ``, `` `--radius-full` ``.

The DESIGN.md `rounded` namespace declares four canonical radii (`sm` = 4px, `md` = 8px, `lg` = 12px, `xl` = 16px). The CSS tokens here are the legacy alias spelling — `--radius-sm` (8px) precedes the DESIGN.md scale and disagrees with it (DESIGN.md `rounded.sm` = 4px). They are kept on the allow-list rather than retired now to avoid a flag-day rename across every Astro component; TG-D will reconcile in a single sweep that maps `--radius-sm` → `--rounded-md`, `--radius-tiny` → `--rounded-sm`, etc. `--radius-full` (999px) is the pill-radius from DESIGN.md §3.4 and has no `rounded` equivalent.

### 6.11 Layout chrome

Tokens: `` `--nav-h` ``, `` `--ctl-h` ``, `` `--section-pad` ``, `` `--container-max` ``.

Layout-chrome constants — sticky-header height, control-row height, section padding-block via `clamp()`, content max-width. These are layout primitives, not design tokens; DESIGN.md models the _aesthetic_ contract, not the layout grid (which lives in §3.3 prose: 8-point grid, 1240px max-width, 120px section rhythm). Codifying them as CSS custom properties is a CSS implementation detail.

### 6.12 Roadmap module-local tokens

Tokens: `` `--rm-card-bg` ``, `` `--rm-card-stroke` ``, `` `--rm-chip-bg` ``.

Tokens scoped to the `/roadmap` page's card grid (`--rm-` prefix = roadmap-module). Module-local tokens deliberately stay out of DESIGN.md to avoid polluting the global token namespace with one-page concerns. The `--rm-` prefix is the contract that signals "do not reference outside the roadmap module"; the allow-list entry confirms the prefix is intentional, not a typo.

### 6.13 New-design OKLCH palette (`--nd-*`)

Tokens: `` `--nd-bg` ``, `` `--nd-bg-1` ``, `` `--nd-bg-2` ``, `` `--nd-line` ``, `` `--nd-line-soft` ``, `` `--nd-fg` ``, `` `--nd-fg-1` ``, `` `--nd-fg-2` ``, `` `--nd-fg-3` ``, `` `--nd-accent` ``, `` `--nd-accent-dim` ``, `` `--nd-accent-ink` ``, `` `--nd-ok` ``, `` `--nd-warn` ``, `` `--nd-bad` ``.

OKLCH-native colour primitives that power the new-design system being introduced by the `update-site-marketing-redesign` change. The `--nd-` prefix namespaces them away from the legacy `--brand-*` / `--teal-*` / `--surface-*` tokens to allow both palettes to coexist during the transition. These tokens intentionally bypass DESIGN.md's `colors` namespace because the upstream `@google/design.md` schema does not model OKLCH triples directly; the OKLCH values are the source of truth, and DESIGN.md hex entries (added in the Phase 2.1 frontmatter) are the derived representation. Once the legacy palette is retired (tracked in TG-D), the `--nd-*` prefix will be dropped and these will become the bare `colors.*` tokens.

### 6.14 Elevation scale

Tokens: `` `--elevation-0` ``, `` `--elevation-1` ``, `` `--elevation-2` ``, `` `--elevation-3` ``, `` `--elevation-4` ``, `` `--elevation-5` ``.

Six-level shadow ramp that replaces raw `rgba(0,0,0,*)` box-shadow literals throughout the codebase. `--elevation-0` is `none` (no shadow); levels 1–5 escalate blur radius and opacity from 2px/0.20 to 48px/0.40. DESIGN.md does not currently model an elevation namespace (the upstream schema has no `elevation` group); per §6.7 the project's flat aesthetic restricts shadows to specific affordances, and this scale operationalises that policy. Components should reference `--elevation-{n}` rather than authoring new shadow literals, and `lint:tokens` (via `no-raw-color-literal.yml`) enforces this at build time.

### 6.15 Focus-ring primitives

Tokens: `` `--focus-ring-width` ``, `` `--focus-ring-offset` ``, `` `--focus-ring-color` ``, `` `--focus-ring-shadow` ``.

Accessibility-critical focus-indicator tokens that compose into a double-ring `box-shadow` (inner ring = `--bg`, outer ring = `--brand-teal`) via the `--focus-ring-shadow` shorthand. Keeping them as CSS custom properties allows the ring to theme-switch automatically when `--bg` or `--brand-teal` changes. DESIGN.md has no `focus` namespace; these tokens are implementation-level CSS primitives for the interaction contract described in DESIGN.md §3.4 ("Focus visible, brand-teal ring").

### 6.16 Motion tokens

Tokens: `` `--motion-duration-instant` ``, `` `--motion-duration-fast` ``, `` `--motion-duration-base` ``, `` `--motion-duration-slow` ``, `` `--motion-duration-slower` ``, `` `--motion-easing-standard` ``, `` `--motion-easing-emphasized` ``, `` `--motion-easing-decelerate` ``, `` `--motion-easing-accelerate` ``, `` `--motion-easing-linear` ``.

Duration scale (0–480 ms, five steps) and named `cubic-bezier` easing curves aligned with the Material 3 motion vocabulary. The `--motion-easing-emphasized` curve (with overshoot) implements the "spring-like" entrance described in DESIGN.md §3.4. Centralising them as custom properties lets components reference a semantic name (`--motion-easing-standard`) instead of inlining bare timings, and allows global motion-preference overrides (`prefers-reduced-motion`) to be applied at the token level in one place. The upstream `@google/design.md` schema has no `motion` namespace, so these live on the allow-list.

### 6.17 Z-index scale

Tokens: `` `--z-base` ``, `` `--z-raised` ``, `` `--z-dropdown` ``, `` `--z-sticky` ``, `` `--z-overlay` ``, `` `--z-modal` ``, `` `--z-popover` ``, `` `--z-toast` ``, `` `--z-tooltip` ``, `` `--z-debug` ``.

Stacking-context ladder (0 → 9999) that prevents `z-index` wars between independently authored components. Tokens are ordered by semantic role (sticky headers at 1100, modals at 1300, tooltips at 1600, debug overlays at 9999). DESIGN.md is an aesthetic contract, not a layout-stacking contract; z-index management is a CSS implementation concern and has no upstream schema namespace, so these tokens are documented here rather than promoted to DESIGN.md frontmatter.

### 6.18 Atomic spacing scale

Tokens: `` `--space-0` ``, `` `--space-px` ``, `` `--space-0-5` ``, `` `--space-1` ``, `` `--space-2` ``, `` `--space-3` ``, `` `--space-4` ``, `` `--space-5` ``, `` `--space-6` ``, `` `--space-8` ``, `` `--space-10` ``, `` `--space-12` ``, `` `--space-16` ``, `` `--space-20` ``, `` `--space-24` ``.

4px-based atomic spacing scale (0 → 96 px, 15 steps) that underpins the 8-point grid documented in DESIGN.md §3.3. The DESIGN.md `spacing` namespace uses T-shirt sizes (`xs`–`2xl`); these tokens provide the full numeric ramp needed by the CSS cascade so components can construct compound values (e.g. `padding: var(--space-4) var(--space-6)`) without hardcoding pixel values. The two systems are complementary: `spacing.*` tokens name _canonical design steps_, while `--space-*` tokens name _every rung on the 4px ladder_; the overlap tokens are intentionally synonymous.

### 6.19 Cascade-layered radius additions

Tokens: `` `--radius-none` ``, `` `--radius-xs` ``, `` `--radius-md` ``.

Three radius values added in the Phase 2.1 cascade-layer work that fill gaps in the legacy radius set documented in §6.10. `--radius-none` (0) provides an explicit "sharp corners" token for overrides. `--radius-xs` (4px) maps to DESIGN.md `rounded.sm`. `--radius-md` (10px) maps to approximately DESIGN.md `rounded.md` (8px) with a slight upward adjustment per the new-design spec. These are declared inside `@layer tokens` so that any legacy unlayered `--radius-md` declaration (which pre-dates cascade layers) continues to win for routes not yet migrated, preserving the "Existing Token Preservation" invariant described in the PR.

### 6.20 Fluid type scale

Tokens: `` `--fs-h1` ``, `` `--fs-h2` ``, `` `--fs-h3` ``, `` `--fs-lead` ``, `` `--fs-body` ``, `` `--fs-small` ``, `` `--fs-micro` ``, `` `--lh-h1` ``, `` `--lh-h2` ``, `` `--lh-h3` ``, `` `--lh-lead` ``, `` `--lh-body` ``, `` `--lh-small` ``, `` `--lh-micro` ``, `` `--tracking-h1` ``, `` `--tracking-h2` ``, `` `--tracking-h3` ``, `` `--tracking-mono-caps` ``.

Phase 2.6 fluid type scale. `--fs-*` tokens use `clamp()` to interpolate between floor and ceiling sizes across the 360 px → 1440 px viewport range; `--lh-*` tokens carry the paired line-height and `--tracking-*` tokens the letter-spacing for display text and mono-caps labels. The DESIGN.md `typography` namespace models font-family and static font-size intent (e.g. `typography.display.fontSize`); it has no slot for the `clamp()` expression or paired line-height/tracking values that are specific to each type role. Promoting these would require schema extensions upstream. Until then they live here as the single source of truth for all typographic sizing in the codebase.

### 6.21 Semantic colour aliases

Tokens: `` `--ink-on-brand` ``, `` `--chip-bg-neutral` ``.

Two semantic aliases introduced by the Phase 2.1 migration to replace raw hex literals in components. `--ink-on-brand` is an alias for `var(--nd-accent-ink)` (near-black `oklch(0.18 0.04 185)` suitable for text on teal brand backgrounds); it exists as a named alias so callsites read as intent rather than palette reference. `--chip-bg-neutral` is `color-mix(in oklch, transparent 88%, var(--nd-fg-2) 12%)` — a subtly tinted neutral chip surface that stays legible across themes; it requires a `color-mix` expression rather than a flat OKLCH value and therefore cannot be expressed as a DESIGN.md frontmatter hex token without losing the dynamic theme-awareness. Both are deliberate aliases over already-documented palette tokens, not new colour decisions.

## 7 · Accepted `lint:design` warnings

The following 10 lint warnings produced by `npm run lint:design` on the current `DESIGN.md` are accepted. Each is a deliberate architectural choice, not an oversight.

| #   | Warning type      | Token / reference  | Rationale                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `missing-primary` | `primary` (absent) | Architectural choice — Artagon uses `accent` as the functional primary action color. The upstream linter expects a token named `primary`; we intentionally do not have one. Agents may synthesize `primary` from `accent` for tooling compatibility, but the authoritative name in this repo is `accent`. The warning is accepted and documented here rather than silenced. |
| 2   | `orphaned-tokens` | `bg-2`             | Used by utility classes in `public/assets/theme.css` (e.g., `.surface-2 { background: var(--color-bg-2) }`), not by any component defined in DESIGN.md frontmatter. The linter cannot see CSS-class consumers; the token is intentionally present and used.                                                                                                                 |
| 3   | `orphaned-tokens` | `line`             | Used by border/separator utility classes in `theme.css`. Intentionally absent from DESIGN.md component definitions because borders are applied via utility classes, not per-component token references.                                                                                                                                                                     |
| 4   | `orphaned-tokens` | `line-soft`        | Used by subtle divider utility classes in `theme.css`. Same rationale as `line` above — utility-class consumer that the linter cannot trace.                                                                                                                                                                                                                                |
| 5   | `orphaned-tokens` | `fg-2`             | Used by secondary body text utility classes. Present in DESIGN.md prose and frontmatter; not referenced by component definitions because secondary text is applied via a utility class, not a component-level token reference.                                                                                                                                              |
| 6   | `orphaned-tokens` | `fg-3`             | Used by tertiary/muted text utility classes in `theme.css`. Same pattern as `fg-2`. Intentional — muted text is a utility, not a component contract.                                                                                                                                                                                                                        |
| 7   | `orphaned-tokens` | `accent-dim`       | Used by hover and active state utility classes for accent surfaces. Component definitions use `accent`; `accent-dim` is the interaction-state variant exposed via a utility class.                                                                                                                                                                                          |
| 8   | `orphaned-tokens` | `ok`               | Used by `.status-ok` CSS class (success/healthy states). The token is intentional; status tokens are applied through status utility classes, not through component definitions in DESIGN.md frontmatter.                                                                                                                                                                    |
| 9   | `orphaned-tokens` | `warn`             | Used by `.status-warn` CSS class (warning/degraded states). Same rationale as `ok`.                                                                                                                                                                                                                                                                                         |
| 10  | `orphaned-tokens` | `bad`              | Used by `.status-bad` CSS class (error/failing states). Same rationale as `ok` and `warn`.                                                                                                                                                                                                                                                                                  |
