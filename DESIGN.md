---
version: alpha
name: Artagon
description: Trusted identity for machines and humans — verified, private, attested.
colors:
  bg: "#07090c"
  bg-1: "#0d1013"
  bg-2: "#14161a"
  line: "#27292d"
  line-soft: "#181b1e"
  fg: "#f3f2ee"
  fg-1: "#c6c4be"
  fg-2: "#a7a49f"
  fg-3: "#888681"
  accent: "#3ceedd"
  accent-dim: "#00756b"
  accent-ink: "#001714"
  ok: "#61da92"
  warn: "#ffb059"
  bad: "#ec5b57"
typography:
  display:
    fontFamily: '"Space Grotesk", "Inter Tight", sans-serif'
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: JetBrains Mono, ui-monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
components:
  nav:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
  footer:
    backgroundColor: "{colors.bg-1}"
    textColor: "{colors.fg-1}"
    typography: "{typography.body}"
  glow-tag:
    backgroundColor: "{colors.accent-ink}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
  standard-chip:
    backgroundColor: "{colors.bg-1}"
    textColor: "{colors.fg-1}"
    rounded: "{rounded.sm}"
  trust-chain-row:
    backgroundColor: "{colors.bg-1}"
    textColor: "{colors.fg-1}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.bg-1}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
  code-block:
    backgroundColor: "{colors.bg-1}"
    textColor: "{colors.fg-1}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
---

# DESIGN.md — Artagon Web

> Design spec for the Artagon marketing site and docs shell.
> Format follows [google-labs-code/design.md](https://github.com/google-labs-code/design.md).
> Single source of truth for visual, content, and interaction decisions.
> Updated: 2026-04-30

DESIGN.md is the site's **design contract**. It records the _intent_ behind every
token, component, and pattern — so reviewers, contributors, and AI assistants
can answer "is this on-brand?" without guessing.

Precedence (canonical): openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change.

Scope: the public site (`artagon.com`) and its preview/prototype artefacts in
this repo. Product UI (dashboard, admin, docs app) follows a separate spec and
may diverge where platform context requires it.

---

## 1 · Overview

This section establishes the design philosophy and voice that govern every decision in this document. The five principles define what we optimize for; the voice and tone guidelines define how we speak. Both are in force on every surface.

### 1.1 Principles

Five principles, in order of precedence when they conflict.

#### 1.1.1 Proof over promise

Every claim on the site must be demonstrable. The hero animates a _live
decision_ (5-stage trust chain, PERMIT/DENY with reasons). Pricing, benchmarks,
and standards claims link to primary sources. No decorative metrics.

#### 1.1.2 Editorial, not SaaS

Typographic hierarchy, numbered sections, mono eyebrows, generous whitespace.
No stock 3D blobs, no pastel gradients, no AI-slop hero art. The page reads
like a trade publication, not a product page.

#### 1.1.3 Dense without crowded

Target information density is high, but every block has air. Line-length caps,
1200px max-width, 120px section rhythm, 8pt spacing grid. The eye always has a
place to land.

#### 1.1.4 Accessible by default

WCAG 2.2 AA is the floor, not the goal. 4.5:1 text contrast, 3:1 UI contrast,
visible focus, no information conveyed by color alone, `prefers-reduced-motion`
respected on every animated surface.

#### 1.1.5 Portable aesthetic

The tokens travel. The same OKLCH palette, the same four font families, and
the same `.glow-tag` / `.num-h2` primitives render identically across Astro
components, static HTML prototypes, and third-party embeds. No design lives in
one file.

### 1.2 Voice & tone

Artagon writes like a trade publication, not a product page. The voice is direct, specific, and technical. The tone is confident without being promotional.

#### 1.2.1 Positioning line

> **Trusted identity for machines and humans — verified, private, attested.**

This is the elevator pitch. Appears in: footer, `<meta name="description">`,
OpenGraph, favicon tooltip. Do not paraphrase.

#### 1.2.2 Headline formula

The home hero uses the **triad**:

> **Every claim, proven.** · **Every token, bound.** · **Every decision, traceable.**

Each clause maps to one pillar (Identity · Credentials · Authorization).
Use the full triad on the home page. Use single clauses as section eyebrows
when introducing a pillar.

#### 1.2.3 Editorial rules

- **Active voice, present tense.** "Artagon verifies…" not "Identity is verified by…".
- **Specific over abstract.** "IAL2 → IAL3 step-up in 180ms" beats "fast, secure, seamless".
- **No marketing adverbs.** Banned: _truly, simply, easily, seamlessly, revolutionary, next-generation_.
- **Sentence case** in nav, buttons, body. **Title Case** only for page titles.
- **Mono for machine text.** Code, standards chips, eyebrows, log lines, IDs.
- **Serif italic for accent.** Emphasis within mono eyebrows (`& humans`, `or human`).
- **Em-dash, not hyphen** for parenthetical thought. No Oxford commas.

#### 1.2.4 Forbidden phrases

- "Unified platform for the modern enterprise" (generic)
- "AI-native" / "AI-first" (we use crypto, not LLMs)
- "Zero-trust" as a noun (it's a posture, not a product)
- "Passwordless" without context (we're passkeys + DPoP + VCs, which is more)

---

## 2 · Colors

Site uses the **OKLCH** color space throughout. Tokens live in
`public/assets/theme.css` (canonical, served from `public/` and copied
verbatim into the build output). `src/layouts/BaseLayout.astro` references
the file via a `<link rel="stylesheet" href="/assets/theme.css">` tag, so
every Astro page in `src/pages/*.astro` picks up the same token set.

**Token aliasing.** The public tokens listed below (`--bg`, `--bg-1/2`,
`--line`, `--line-soft`, `--fg`, `--fg-1/2/3`, `--accent`, `--accent-dim`,
`--accent-ink`, `--ok`, `--warn`, `--bad`) are aliases over an internal
`--nd-*` staging set defined earlier in `theme.css`. The aliases are the
**stable contract** — components consume them. The `--nd-*` set is the
new-design vocabulary verbatim; preserved so future palette experiments
can revise OKLCH triples without touching every consumer. Never reference
`--nd-*` directly from a component; always use the unprefixed alias.

Legacy aliases `--text` / `--muted` / `--border` / `--brand-teal` /
`--bg-alt` are deprecation shims retained for one release after USMR
Phase 5.1h migrates the project. They map 1:1 to `--fg` / `--fg-2` /
`--line` / `--accent` / `--bg-1` respectively. Drop them in the
follow-up migration commit once consumers have moved.

### 2.1 Base palette (dark, default)

| Token         | OKLCH                   | Role                  |
| ------------- | ----------------------- | --------------------- |
| `--bg`        | `oklch(0.14 0.008 260)` | Page background       |
| `--bg-1`      | `oklch(0.17 0.008 260)` | Card / raised surface |
| `--bg-2`      | `oklch(0.20 0.008 260)` | Hover / pressed       |
| `--line`      | `oklch(0.28 0.008 260)` | Primary border        |
| `--line-soft` | `oklch(0.22 0.008 260)` | Divider, grid lines   |
| `--fg`        | `oklch(0.96 0.005 85)`  | Primary text          |
| `--fg-1`      | `oklch(0.82 0.008 85)`  | Body text             |
| `--fg-2`      | `oklch(0.72 0.008 85)`  | Secondary text        |
| `--fg-3`      | `oklch(0.62 0.008 85)`  | Tertiary / eyebrows   |

Cool-neutral background (hue 260) under warm-neutral foreground (hue 85).
The slight temperature shift makes text feel like ink on paper, not pixels on
a screen.

### 2.2 Accent

| Token          | OKLCH                  | Role                       |
| -------------- | ---------------------- | -------------------------- |
| `--accent`     | `oklch(0.86 0.14 185)` | Primary accent (cyan-teal) |
| `--accent-dim` | `oklch(0.50 0.10 185)` | Accent border / muted      |
| `--accent-ink` | `oklch(0.18 0.04 185)` | Text on accent background  |

Default accent is cyan-teal (`185°`). Alternate accents are available via
`[data-accent]` attributes: `violet` (300°), `amber` (75°), `lime` (135°).
**Never use more than one accent on a page.** The accent carries signal — use
it for: primary CTAs, hover states, the trust-chain's current stage, chart
series 1. Everything else is neutral.

**Site-wide accent override**: USMR Phase 5.1o sets `data-accent="violet"`
on `<html>` in `BaseLayout.astro` so every route renders with the violet
accent (300°) per the new-design mock. The teal default is preserved as
the fallback when `data-accent` is absent (e.g., embedded preview
contexts that bypass `BaseLayout`). The trust-chain's `--ok` (PERMIT,
green) and `--bad` (DENY, red) tokens stay constant across accent
variants — only `--accent` and `--accent-dim` shift.

### 2.3 Semantic

| Token    | OKLCH                  | Role                      |
| -------- | ---------------------- | ------------------------- |
| `--ok`   | `oklch(0.80 0.15 155)` | PERMIT, success, pass     |
| `--warn` | `oklch(0.82 0.14 65)`  | Caution, step-up, pending |
| `--bad`  | `oklch(0.66 0.18 25)`  | DENY, failure, revoked    |

Semantic colors appear in the trust chain, logs, and status badges. They are
**never** used for decoration.

### 2.4 Light theme

Activated via `[data-theme="light"]`. All `--bg-*` and `--fg-*` swap; accent
and semantic tokens stay constant (they are designed to read on both themes).
Contrast ratios verified against WCAG 2.2 AA for all text-on-surface pairs.

---

## 3 · Typography

### 3.1 Type families

| Family               | Role           | Weight     | Notes                                                                   |
| -------------------- | -------------- | ---------- | ----------------------------------------------------------------------- |
| **Inter Tight**      | Body sans      | 400, 500   | `--f-sans`. Optical spacing via `font-feature-settings: "ss01", "cv11"` |
| **Space Grotesk**    | Display        | 400, 500   | `--f-display`. Default hero + h1/h2. Geometric, high x-height.          |
| **Fraunces**         | Serif accent   | 400 italic | `--f-serif`. Emphasis within eyebrows; optional display alt.            |
| **Instrument Serif** | Serif fallback | 400        | Fallback for Fraunces in certain contexts.                              |
| **JetBrains Mono**   | Mono           | 400, 500   | `--f-mono`. Code, eyebrows, standards chips, log lines.                 |

Each family loads with `font-display: swap`. Preload the display face used
above-the-fold. The site **must not** ship more than four custom families.

**Webfont loading (USMR 5.5.16).** `BaseLayout.astro` ships the canonical Google-Fonts loader: `<link rel="preconnect">` to `fonts.googleapis.com` + `fonts.gstatic.com`, then a single `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?…">` request that pulls all 6 families above (`Inter Tight` 300-700, `JetBrains Mono` 300-600, `Instrument Serif` ital 0;1, `Fraunces` ital,opsz,wght variable, `DM Serif Display` ital 0;1, `Space Grotesk` 400-600). The `tests/webfonts.spec.ts` Playwright spec gates the loader's existence and verifies `h1.display` resolves to Space Grotesk + `body` to Inter Tight after `document.fonts.ready` settles. Without this loader every `--f-*` token silently fell back to system-ui (San Francisco on macOS, Segoe UI on Windows) and the hero rendered in a completely different typeface than the canonical mock — caught only when a user A/B-compared screenshots. The `self-host-woff2-fonts` OpenSpec change tracks the eventual move to self-hosted woff2; the CDN gets us pixel parity in the meantime.

**Font-family token contract (USMR 5.5.16-pt56-57).** Every `font-family` declaration in the codebase relies on the **token's own fallback chain** rather than duplicating font names inline. The canonical pattern is `var(--f-display, var(--f-sans))` — token-to-token cascade — NOT `var(--f-display, "Space Grotesk", "Inter Tight", sans-serif)` (5.1-era duplication). Each `--f-*` token already declares its full fallback chain in `:root` (e.g. `--f-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`). When `--f-display` fails to resolve, `var(--f-sans)` provides Inter Tight as the fallback display face — a cohesive type system. The 5 surfaces migrated in pt56-57: bare `h1, h2, h3, .display` (`var(--f-display, system-ui)` → `var(--f-display, var(--f-sans))`), `.serif` (drop `Georgia` since `--f-serif` already chains to it), `.glow-amp` (drop full chain duplication), `.hero h1.display` (canonical token-chain pattern).

**H1 weight cascade (USMR 5.5.16-pt31, pt42).** Bare `<h1>` font-weight is **400** (regular) per canonical `global.css:229`; the catch-all `h1, h2, h3, h4 { font-weight: 500 }` is overridden by the h1-specific rule. The `.display` utility class deliberately **does NOT specify font-weight** — element-level rules drive weight per element (h1: 400, h2-h4: 500). Pre-fix the `.display` utility specified `font-weight: 500` which beat the canonical h1-specific 400 due to specificity (1 class vs 1 element); h1 consumers of `.display` (404, home index, writing index, post detail) all rendered at 500 — a noticeable thickness regression on Space Grotesk display.

**Section ledes (USMR 5.5.16-pt27, pt34, pt45).** Every section lede consumes the canonical `.lead` contract: `font-size: 20px`, `color: var(--fg-1)`, `line-height: 1.5`. Section-specific overrides may set `max-width` (e.g. Pillars: 46ch, Bridge: 50ch, get-started: 52ch) or `justify-self`. Pre-fix scoped `*__lede` rules used `1.05rem` (≈16.8) on `var(--fg-2)` with `line-height: 1.55` — undersized by 3.2 px and dimmer than canonical. Total surfaces brought to canonical: 7 (Pillars, Bridge, Standards, Roadmap, HomeExplore, get-started, 404).

### 3.2 Type scale

```
h1    clamp(56px,  7.2vw, 108px)  line-height 0.94   tracking -0.035em
h2    clamp(36px,  4.0vw,  60px)  line-height 1.02   tracking -0.025em
h3    22px                        line-height 1.20   tracking -0.020em
lead  20px                        line-height 1.50
body  16px                        line-height 1.55
small 13.5px                      line-height 1.50
micro 11px (mono, caps)           line-height 1.40   tracking  0.14em
```

Fluid steps use `clamp()`. Min/max are tested at 360px and 1920px viewports.
Never ship a heading that reflows more than 3× between breakpoints.

**Bare-element rules.** USMR Phase 5.5.5 — the type scale is now applied at the bare `<h1>` / `<h2>` / `<h3>` selector (`public/assets/theme.css`), not only via the `.display` utility class. Any consumer of `theme.css` inherits the scale by default; the `.display` class survives as a token-only opt-in for non-heading elements (e.g. `<span class="display">` in card titles). 5.5.6 fixed a tracking-cascade bug: bare `<h1>` and `.display` now read `var(--display-tracking, var(--tracking-h1))` so the per-face tracking documented in §3.4 actually applies when `[data-hero-font]` toggles.

### 3.3 Tracking rules

- **Display** (h1/h2): negative tracking (-0.025 to -0.035em) for optical balance at large sizes.
- **Mono UPPERCASE**: positive tracking (+0.12 to +0.26em). Mono is too tight otherwise.
- **Body**: default (0).
- **Serif italic accents**: default (0). Fraunces is already optically loose.

### 3.4 Hero display override

Users can swap the display face via `[data-hero-font]`:
`grotesk` · `fraunces` (default) · `dmserif` · `mono`.
The override adjusts tracking, weight, AND the emphasis-span face per family — see `public/assets/theme.css` (the `[data-hero-font="..."]` rules near the file end).

**Emphasis-span audit matrix** (USMR Phase 5.2.5, resolved Open question 5).
Every hero `<h1>` / `<h2>` may contain an italic `<em>` span (e.g. `Three pillars, <em>one</em> coherent platform.`). The italic span consumes the `--f-emphasis` token, which resolves per the table below — eliminates the "mono + serif italic" font-clash bug:

| `[data-hero-font]` | H1 family        | `--f-emphasis` resolves to  | Visual result            |
| ------------------ | ---------------- | --------------------------- | ------------------------ |
| `grotesk`          | Space Grotesk    | `var(--f-serif)` (Fraunces) | sans + serif-italic span |
| `fraunces`         | Fraunces         | `inherit`                   | serif throughout         |
| `dmserif`          | DM Serif Display | `inherit`                   | display-serif throughout |
| `mono`             | JetBrains Mono   | `inherit`                   | mono italic throughout   |

The `inherit` cases drop the italic span back to the surrounding family — never a clashing swap. Italic styling (`font-style: italic`) stays on the span unconditionally; every shipped face has an italic variant. **Test gate (USMR Phase 5.5.15):** `tests/hero-font-matrix.spec.ts` is a Playwright matrix that toggles `[data-hero-font]` to each of the four variants and asserts (a) `--f-display` head matches the canonical font-stack, (b) `--display-tracking` and `--display-weight` resolve to the per-face values, (c) `--f-emphasis` swaps to `var(--f-serif)` under grotesk and inherits otherwise, and (d) the home `<h1>` `font-family` propagates from the toggled root. Closes the phantom-test promise that DESIGN.md had been making since Phase 5.2.7.

Earlier drafts of this section pointed at `src/styles/global.css`, which is not a file in this project; corrected in USMR Phase 5.1p.16.

---

## 4 · Layout

The layout system is built on an 8-point spacing grid with a fixed max-width container and density variants. Spacing tokens and section rhythm are defined here; responsive breakpoints are in §8.2.

**8-point grid.** All spacing tokens are multiples of 4px (half-steps allowed
for inline elements only). Section rhythm: **120px top/bottom**. Card padding:
**24–32px**. Gutter: **32px** desktop, **20px** dense, **44px** roomy (via
`[data-density]`).

`.wrap` caps content at `--maxw: 1240px` and matches the canonical `new-design global.css:212` shape (`max-width: var(--maxw); margin: 0 auto; padding: 0 var(--gutter); position: relative; z-index: 1`). Never nest `.wrap` inside `.wrap`. `.container` is an alias kept for legacy 5.1q components — new components should author against `.wrap`.

**Density variants** (USMR Phase 5.5.6). The `--gutter` token defaults to `32px` (`comfortable`); `[data-density="dense"]` tightens to `20px`, `[data-density="roomy"]` opens to `44px`. Toggle via `<body data-density="dense">` (or the canonical Tweaks panel surface). Pre-5.5.6 the attribute was documented but inert — no override blocks shipped.

**Token-only utility classes.** Beyond `.wrap`, theme.css exposes:

- `.display` — display-family + tracking + weight (consumes `--f-display` + `--display-tracking` with `--tracking-h1` fallback).
- `.serif` — serif-family at weight 400 (consumes `--f-serif`). Use sparingly for italic emphasis on a single word inside a display headline (e.g. `<span class="serif" style="font-style: italic">next</span>`).

These are the only global utility classes — never invent component-scoped utility variants in `theme.css`.

**Section vertical rhythm (USMR 5.5.16-pt25, pt48, pt49, pt69).** Every section consumes `padding-block: var(--section-pad)` which resolves to `clamp(80px, 8vw, 120px)`. Canonical `global.css:215` fixes 120; the 80-floor is a mobile concession (was 64 pre-pt25, undersized by 16). Hero section pads `80px 0 120px` (canonical Hero.jsx:124 — top is 80 to seat the meta strip, bottom is 120 to breathe before the writing strip). The 6 island sections (HomeExplore / Pillars / Bridge / UseCases / Standards / Roadmap) all consume the canonical 80→120 clamp (was 64→120 pre-pt49). The on-ramp / `/get-started` close-CTA section pads top via the same clamp BUT locks bottom to flat `80px` (canonical Cta.jsx:9 — `<section className="section" style={{paddingBottom: 80}}>` — the inline override prevents over-padding the bottom of the closing section). Pre-fix `.writing-strip + .onramp` had scoped `padding-block: var(--space-12)` (=48) overriding the canonical `.section` padding by 72 px — the largest single vertical-rhythm regression caught in the canonical-fidelity sweep. Pre-pt69 `/get-started .cta-section` shipped `clamp(64-120)` symmetric — floor 64 contradicted the 80-floor and the responsive bottom didn't honor the canonical 80 lock.

**Flex-gap double-counting anti-pattern (USMR 5.5.16-pt53, pt54).** When a flex column container declares `gap` AND its children declare `marginBottom`, the spacing **stacks** — net distance is `child marginBottom + parent gap`. Canonical avoids this by either (a) `display: block` parent + element-level `marginBottom` driving rhythm, OR (b) flex parent with `gap` + children with `margin: 0`. Pre-fix `.pillars__panel-prose` and `.use-cases__panel-head` both had flex column with gap PLUS children with marginBottom — net spacing was 78-100 % oversized. Fix pattern: use `display: block` so element-level margins drive vertical rhythm exactly per canonical.

**Style-block brace-balance gate (USMR 5.5.16-pt68).** `tests/lint-style-block-balance.test.mts` walks every `.astro` file's `<style>` block and asserts `{` count equals `}` count after stripping `/* … */` comments. Astro's CSS parser silently drops orphan declarations and tolerates stray braces, so a build-clean `.astro` file can still carry latent CSS bugs (caught: orphan `gap: 1rem;` outside `.onramp__row` rule + stray `}` in `src/pages/index.astro` pre-pt68). Brace balance is a necessary but not sufficient condition for valid CSS — the gate covers the most common drift mode.

**`lint:tokens` extended to scan theme.css (USMR 5.5.16-pt76).** Pre-pt76 `lint:tokens` allowlisted `public/assets/theme.css` whole-file because theme.css is the ONE place tokens are _defined_. The loop's pt74/pt75 audits found that this also masked **token violations in class rules** (e.g. `.cta { color: #041016 }`, `.discrete { color: #8fa0b8 }`) — pre-USMR cruft that had been silently passing. pt76 ships a token-aware filter: theme.css IS scanned, but raw colors on lines containing a `--token:` declaration are allowed (legitimate token definitions). Raw colors anywhere else are violations. CSS comments are stripped before scanning to avoid prose-mention false positives. `var(--token, FALLBACK)` patterns are exempted (defensive fallback values are intentional). Per-line `/* lint-tokens: ok */` markers allow legitimate non-token raw colors (mask compositing primitives `linear-gradient(#000 0 0)` and shimmer-gradient pure-white highlights — both would lose semantic meaning if tokenized). The extended linter caught 16 latent violations on first run; pt76 resolved all of them (deletions, tokenizations, allow markers).

**Class-name discipline — avoid same-class-on-multiple-tags collisions (USMR 5.5.16-pt95).** The home writing-strip section h2 ("Field notes from the team building Artagon.") regressed to 22 px because BOTH the section h2 AND the per-post h3 cards used `class="writing-strip__title"`. Two CSS rules with the SAME specificity (`.writing-strip__title[data-astro-cid-…]`) matched both elements; the later rule (intended for h3 at 22 px) won by source order, applying to the h2 too. Fix pattern: when a BEM-block class needs distinct styling per element role, **disambiguate the role in the class name** — `.writing-strip__title` for the h2 section header AND `.writing-strip__post-title` for the post-card h3. The cross-tag-class probe (a class applied to multiple element types) is a heuristic for collision sites but produces false positives for utility classes (`.container`, `.display`, `.serif`, `.wrap`) that ARE designed for cross-element use.

**Canonical-fidelity audit coverage (USMR 5.5.16, iter 101).** End-to-end verification via Playwright probe confirms canonical token resolution across every primary route: home (Hero · TrustChain · WritingStrip · HomeExplore · onRamp · Footer), `/platform` (Pillars 3-tab), `/bridge` (BridgeFlow 4-step), `/use-cases` (4-tab vertical tablist), `/standards` (3-col wall), `/roadmap` (5-phase timeline V1-V5), `/writing/bridge-strategy` (post-detail h1 · blockquote · chain-fig · cta-cards). Verified properties: bg `oklch(0.14 0.008 260)` neutral-dark; accent `oklch(0.86 0.14 185)` cyan; section h2 `clamp(36, 4vw, 60)` ≈ 56.88 px @ 1422 viewport; hero h1 `clamp(56, 7.2vw, 108)` ≈ 102.4 px; eyebrow 12 px / fg-2 / 0.1em + 18 px ::before accent dash; trust-chain card 28 px padding / 14 px radius / accent box-shadow; writing-strip cards 28×24 padding / radius 12 / 280 px min-height; on-ramp card 16 px radius / 72×64 padding / bg-1 → bg gradient; standard-chip 12.5 px / mono / dotted fg-3 underline. Mobile (720 px) confirms canonical clamp floors hit (h1 56 px, h2 36 px). The 5 permanent regression gates (canonical-typography 15 cases, webfonts 2, brace-balance 47, zombie-fallbacks 2, lint:tokens token-aware mode) backstop every property documented above. Future drift now fails the build instead of silently shipping.

---

## 5 · Shapes

| Token   | Value | Role                            |
| ------- | ----- | ------------------------------- |
| Small   | 4px   | Badges, kbd, micro-chips        |
| Default | 8px   | Buttons, inputs                 |
| Card    | 12px  | Explore cards, panels           |
| Pill    | 999px | Standards chips, glow-tag, dots |

Borders are **1px solid** `--line` or `--line-soft`. Never use 2px. Never use
shadows to imply depth — this is a flat, typographic aesthetic. Use shadows
only for: dropdowns, the Tweaks panel, and the accent glow on interactive
elements.

---

## 6 · Components

Each component has: **purpose**, **anatomy**, **tokens used**, **a11y notes**,
**do/don't**.

### 6.1 Nav

**Purpose.** Primary wayfinding. Sticky, backdrop-blurred, 64px tall.

**Anatomy.** Wordmark (left) · 4-item link row · right cluster (GitHub 34×34 icon button, Playground ghost CTA, Request access primary CTA, theme toggle).

**Links (top nav):** Platform · Use cases · Standards · Writing — exactly 4 (canonical BaseLayout.jsx:203-208). Bridge / Roadmap surface via /bridge and /roadmap routes + the home Explore grid; they are NOT in the primary nav. GitHub is a 34×34 rounded-square icon button in `.right`, NOT a `<li>` in the link list (canonical BaseLayout.jsx:220-238).
**Deliberately excluded:** Bridge (link in footer + Explore card on home), Roadmap (link in footer + Explore card on home).

**Tokens.** `--bg` (72% w/ backdrop blur) · `--line-soft` · `--fg-1` · `--accent` (active underline).

**CTA routing (USMR 5.5.16-pt5).** The Playground ghost CTA points at `/#playground` (the live HomeExplore section) and the Request access primary CTA points at `/#get-started` (the on-home onRamp card) per canonical BaseLayout.jsx:239-240. Both anchors land on the home page and scroll to the matching section; from non-home routes the browser navigates first then scrolls. The earlier 5.1l routing (Playground → `/play` shim, Request access → `/get-started` route) bypassed the canonical anchor pattern; `/play` is a noindex shim and surfaces a "Placeholder page" landing if reached directly.

**A11y.** Skip-to-content link first in tab order. `aria-current="page"` on active link. Focus rings visible in both themes. Each link's hit target is ≥ 44 × 44 CSS px per WCAG 2.5.5 (`min-height: 44px` on `.site-nav .links a` since 5.5.11; visible underline still tracks the original 6px baseline).

**Mobile menu (USMR Phase 5.5.11).** Below 720px viewport the link list and right cluster collapse. A 44×44 hamburger button (`<button class="nav-toggle">`) appears; clicking toggles `body.nav-open`. Open-state slides the link panel below the sticky bar (`top: 64px`) and docks the CTA cluster at the viewport bottom (`top: auto; bottom: 0`). Hamburger spans rotate into an `X` via `translate + rotate(±45deg)`; `prefers-reduced-motion: reduce` zeros the transition. Inline `<script>` binds the click handler and toggles the button's `aria-expanded`. Replaces the 5.1-era `.menu` / `.menu-btn` block deleted in 5.5.11.

**Do** use sentence case for link labels.
**Don't** add a seventh top-level link without deleting one — the ceiling is 5 text links + 1 icon + 2 CTAs.

### 6.2 Footer

**Purpose.** Sitemap + legal + trust signals.

**Anatomy.** Brand column (wordmark + 28ch positioning line) · 4 link columns (Platform · Developers · Company · Legal) · meta strip (copyright · stack credit · version).

**Layout.** Flat 5-col grid: `grid-template-columns: 1.4fr repeat(4, 1fr)` (canonical BaseLayout.jsx:283). Brand column is 1.4× the width of each link column. The pre-canonical `220px 1fr` + nested 4-col arrangement was replaced in 5.5.16 — the nested wrapper produced visual asymmetry on wide viewports.

**Rules.**

- Copyright format: `© {YEAR} Artagon, Inc. — Philadelphia, PA`.
- Version string format: `v{semver} — build {7-char git sha}`.
- "Built on Astro · Open-source core · Apache 2.0" is the stack credit line. Do not edit.
- Column links are LEFT-ALIGNED inside each column (default `text-align: start`); the `.footer-col ul` MUST set `align-items: stretch` to override the global `nav ul { align-items: center }` rule that the header relies on (Footer.astro wraps cols in `<nav>` for semantics, so the descendant selector cascades in).
- Link row density (canonical Hero.jsx:293-296): `font-size: 13.5px`, `line-height: 1.55`, `padding-block: 2px`, `gap: 10px`. Center-to-center distance is ~34.9 px, ≥ WCAG 2.5.8 AA (24×24) under the dense-link-block spacing rule. Do NOT enforce `min-height: 44px` on each link — it visually centers each label inside a 44 px box and inflates the column to ~250 px (canonical column reads as ~120 px).
- The brand column has wordmark + positioning blurb ONLY. ThemeToggle was injected here in 5.1g; that placement was non-canonical and was removed in 5.5.16. The toggle still ships in the header `.right` cluster — the footer is a sitemap, not a control surface.
- Developers column composition (canonical BaseLayout.jsx:258-264): Docs · SDKs · CLI · GitHub · Standards. The 5.5.3 port renamed CLI → Playground; 5.5.16-pt5 reverted that rename. CLI lands on `'#'` placeholder until the route ships (same canonical pattern Legal uses for Terms / Trust center / DPA / Sub-processors).

### 6.3 Glow-tag (eyebrow)

**Purpose.** The site's signature micro-element. Appears above the hero and at select section breaks. Communicates "this is alive, this is premium" without a single gradient blob.

**Anatomy.** Pill · animated conic border · glow dot · shimmer text · optional Fraunces italic amp.

**Tokens.** `--accent` (drives `--g-accent`) · `--bg-1` / `--bg` (gradient fill) · backdrop-blur.

**A11y.** All animations disabled under `prefers-reduced-motion`. Text contrast verified on both themes.

**Do** use for the positioning line, section breakpoints, and "new" announcements.
**Don't** use more than one per viewport. Don't stack two glow-tags.

**Section eyebrow vs glow-tag distinction (USMR 5.5.16-pt15, pt16).** The hero uses the elaborate `.glow-tag` (animated conic ring + halo + shimmer text + serif italic amp). Every OTHER section break uses the canonical `.eyebrow` primitive — a simpler small-caps mono label with a leading 18 px teal accent dash. Per `global.css:220-226`:

```
display: inline-flex; align-items: center; gap: 10px;
font-family: var(--f-mono); font-size: 12px;
color: var(--fg-2); letter-spacing: 0.1em;
text-transform: uppercase; margin-bottom: 24px;
::before { content: ""; width: 18px; height: 1px; background: var(--accent); }
```

Total surfaces consuming this contract: 8 — global `.eyebrow` (theme.css), `.pillars__eyebrow`, `.bridge-flow__eyebrow`, `.use-cases__eyebrow`, `.standards-wall__eyebrow`, `.roadmap-timeline__eyebrow`, `.home-explore__eyebrow`, `.writing-hero__eyebrow`, `.not-found__eyebrow` (USMR 5.5.16-pt70 — 404 missed by the original pt15/pt16 sweep; shipped 11/fg-3/0.12em with no dash). The 18 px teal accent dash is the canonical signature element. Pre-fix all surfaces used `0.7-0.72rem / fg-3 / 0.12em / no dash` — read as plain mono caps labels instead of canonical section-eyebrow primitives.

The blog-hero variant (`.blog-hero__eyebrow`) intentionally **omits** the dash because the "← Blog" backlink IS the visual element; an extra dash before the arrow reads as clutter.

### 6.4 Standards chip

**Purpose.** Inline glossary chip linking to a canonical spec, RFC, or vendor doc. Always opens in a new tab with `rel="noopener noreferrer"` (never `noreferrer` alone).

**Anatomy.** Slot text · dotted underline (1 px, `var(--fg-3)`). On hover or `:focus-visible` the text and underline both flip to `var(--accent)`. No background fill, no badge — the chip is a typographic primitive that sits inline in body copy, not a button.

**Registry (shipped, USMR Phase 5.2.0).** `src/data/glossary.ts` is the single source of truth — 60+ entries covering OAuth/OIDC, AuthN/proofing, verifiable credentials, AuthZ/policy, NIST/eIDAS, IAM, standards orgs, and roles. Each entry has `{ name, href, external }`. Four consumers share the global `.standard-chip` contract (count grew from 2 → 4 across Phase 5.2.x — 5.4):

- **`<Standard term="…">`** (`src/components/Standard.astro`) — token-only static Astro chip for `.astro` and `.mdx` content.
- **React `StandardChip`** (`src/components/PillarsIsland.tsx` inner) — emits identical markup so the global `.standard-chip` style applies to both server-rendered prose and React-island content.

The two paths share one CSS rule (`public/assets/theme.css` `.standard-chip` block) — no per-component duplication. `tests/glossary-data.test.mts` enforces the registry shape (size floor ≥ 50, every `href` is absolute https, plural aliases like `DID/DIDs` resolve to identical canonical URLs).

**A11y.** The chip is an `<a>` element when the term resolves — keyboard reachable, gets the site-wide `:focus-visible` outline. When the term is missing, the chip degrades to a plain `<span>` (no underline, no cursor change) AND a build-time `console.warn` fires so gaps are loud, not silent. Forced-colors mode swaps the underline to `CanvasText` and the hover state to `Highlight`.

**Do** route every acronym through `<Standard>` — never hardcode a spec URL inline. Add new terms to `glossary.ts` with the canonical href before consuming them in copy.
**Don't** hand-roll chip styles. Don't link to a standard without going through the registry (the URL will drift).

**Status: shipped.**

### 6.5 Trust chain

**Purpose.** The hero's centerpiece. Animated 5-stage decision that cycles through 6 real scenarios (some PERMIT, some DENY with specific, technical reasons).

**Stages.** Passkey · Device Attest. · DPoP Key · Presented VC · Policy Decision.

**Scenario set.** `healthy` · `device_fail` · `ial_insufficient` · `token_replay` · `policy_deny` · `delegated_permit`. Do not add decorative scenarios — each one teaches a specific platform capability.

**Rules.**

- Failing stage halts the chain (subsequent stages show `skip`, not `pass`).
- Decision badge + stage outlines + decision card border all key off
  `--accent` (the page's primary accent — **violet** for marketing
  pages per the new-design rendered output, `oklch(0.78 0.16 300)`,
  applied via `data-accent="violet"` on the `<html>` element in
  `BaseLayout.astro`. The `:root` fallback in `tokens.css` is teal
  `oklch(0.86 0.14 185)` for non-marketing surfaces).
  `[data-accent="amber|lime"]` are optional palette overrides
  authored via the Tweaks panel. DENY / fail uses `--bad`
  (semantic red). The chain's visual cohesion comes
  from one accent rendering eyebrow + stages + decision; the
  earlier draft of this document mapped pass → `--ok` (semantic
  green), but the new-design implementation
  (`new-design/extracted/src/pages/index.html` line 1012,
  `const C_PASS = 'var(--accent)'`) is the authoritative contract.
  `--ok` and `--warn` remain for explicit status badges outside the
  chain (logs, banners, inline icons next to a status word).
- Final claim line uses mono and shows the actual decision string + latency.
- Must be simplifiable to a static component on mobile <640px (see §9.2).

**A11y.** Each scenario narrated via `aria-live="polite"`. Reduce-motion users see the full scenario statically with no cycling.

**Explain layer (Planned).** Opt-in via `<TrustChain explain>` (boolean prop, default `false`). When enabled, each stage row gains a `<TrustChainTooltip>` (see §6.13) exposing what+why+standard. Off by default everywhere; turned on for the public hero and the `/how` page; left off in dashboard/audit-log surfaces where the chain is reference-only and the operator already knows the protocol. **Status: not yet shipped.** The current `<TrustChainIsland />` component accepts no props; the explain layer is tracked as a follow-up to the USMR change. This subsection documents the intended shape so consumers know what to expect when it lands.

**Animation primitives.** Two CSS keyframes ship in `public/assets/theme.css` and are consumed by `<TrustChainIsland>` for the 5.1d-idle auto-progression:

- `chain-pulse` — 1.2 s ease-in-out infinite scale 1 → 1.08; applied to `.trust-chain__stage.is-evaluating .trust-chain__stage-num` while a stage is in flight.
- `chain-spin` + the `.chain-spinner` element — 0.7 s linear infinite rotation on an 8 px ring with a top accent border; rendered inline next to "checking…" copy in the evaluating state.

Both keyframes are gated behind `@media (prefers-reduced-motion: reduce) { animation: none }`. Auto-progression itself is also gated: under reduced motion OR when `navigator.webdriver` is true (Playwright / automated browsers), the chain renders fully resolved on first paint and skips the timer-based reveal.

**Auto-progression timing** (USMR Phase 5.1d-idle, ports `new-design/extracted/src/pages/index.html:851-891`):

- Initial kickoff delay: 400 ms after hydration.
- First-stage evaluating window: 1100 ms.
- Per-stage advance: 900 ms.
- Halts on the first `fail` outcome — subsequent stages render as `skip` per the data contract.
- Plays on every scenario change — auto-cycle continues after click / keyboard input. USMR Phase 5.5.5 dropped the prior `userInteractedRef` permanent-freeze latch to restore the canonical Hero.jsx:116-121 UX: the chain re-animates whenever `scenarioIdx` changes, AND the parent effect auto-advances to the next scenario after `CYCLE_DELAY_MS`. The only pause path is `paused` (hover/focus on stage rows + scenario dots).

**Keyboard navigation.** Stage rows are real `<button>` elements (USMR Phase 5.1p.1) so they appear in the tab order automatically. The scenario picker (`.trust-chain__scenarios`) follows the WAI-ARIA tablist pattern: `ArrowLeft` / `ArrowRight` walk between dots, `Home` / `End` jump to first / last. Click and keyboard paths converge on the same `setScenarioIdx` handler.

### 6.6 Explore grid

**Purpose.** Home page sub-navigation. 4-up card grid linking to the four top-level surfaces.

**Anatomy.** Numeric index (`01…04`) · title · description · `Go →` mono.

**Rules.** Always 4 cards, always in this order: Platform · Bridge · Use cases · Standards. Cards hover with a subtle accent tint and 2px lift.

**Status.** CSS primitives `.explore-grid` (responsive 4-up grid; collapses to 2-up < 720 px and 1-up < 480 px) and `.explore-card` (border + accent-tinted hover lift) are authored in `public/assets/theme.css` (USMR Phase 5.1q.5). The `<ExploreGrid>` Astro component sourcing `EXPLORE_CARDS` data is **Planned for Phase 5.x** — the home page does not yet render the section. Surfaces wanting the grid today can author it inline using the shipped classes.

**Sizing (USMR 5.5.16).** `.explore-card` consumes canonical (new-design global.css:296-303) `padding: 28px 24px 24px` (top inflated to clear the idx label), `gap: 14px` between rows, and `min-height: 220px` so cards align across the row even when the title text wraps. The pre-canonical 20 px / 12 px / no min-height arrangement gave shorter cards an inconsistent visual baseline on the home grid.

### 6.7 Numbered section heading

**Purpose.** The audit-page signature. Every `<h2>` in a long-form page is numbered.

**Format.** `01.` mono grey · then the heading in Space Grotesk.

**Class (Planned).** `.num-h2` with `.num` span. The class is referenced in three places in this document (§1.1.5, §6.7, §6.12) but has not been authored in `public/assets/theme.css` yet — implementation is tracked as a follow-up to USMR. This subsection documents the intended shape.

### 6.8 Buttons

| Variant        | Style                              | Use                              |
| -------------- | ---------------------------------- | -------------------------------- |
| `.btn.primary` | Accent background, accent-ink text | Single primary action per view   |
| `.btn`         | Bordered, neutral                  | Secondary actions, footer CTAs   |
| Icon button    | 34×34, bordered square             | GitHub icon, theme toggle, close |

Height: 40px (primary) · 38px (secondary) · 34px (icon). Minimum tap target: 44×44 via hit-area padding. Never place two primary buttons adjacent.

**Token contract (USMR 5.5.16).** Canonical `.btn` (new-design global.css:236-244): `padding: 12px 18px`, `gap: 10px`, `border-radius: 8px`, `font-size: 14px`, `font-weight: 500`, `transition: background .18s ease, border-color .18s ease, transform .18s ease`. Pre-canonical `0.5rem 0.85rem` / `border-radius: 10px` / `gap: 0.4rem` undersized every CTA against the mock; the FAQ-page `btn solid` non-canonical class was renamed to `btn primary` in the same diff. Wrapper `.wrap` consumes the density-aware `--gutter` token (`padding: 0 var(--gutter)`) instead of a hard 20 px so density toggles (`[data-density="dense" | "comfortable" | "roomy"]`) actually flow through.

### 6.9 Code block

Used in blog posts and the Structure Audit page. JetBrains Mono 13px, `--bg-1`, `--line-soft` border, 16px padding, 8px radius. Line numbers optional (mono, `--fg-3`). No syntax highlighting in marketing pages — it fights the editorial tone. Syntax highlighting is allowed on docs pages only.

### 6.10 Tweaks panel

**Purpose.** Hidden design QA surface. Toggleable panel in the bottom-right lets reviewers switch theme, accent, display font, density, background grid, and writing-widget placement without touching code.

**Not a user-facing feature.** The panel is off by default and only appears when the Tweaks mode is active. Do not link to it from the site.

### 6.11 Writing widget

**Purpose.** Surface the latest blog post(s) on the home page. Communicates editorial cadence ("we publish") without becoming a full blog index.

**Status: Shipped (USMR 5.5.16-pt108/pt109/pt110).** Tweaks panel exposes `Writing widget` field with 6 variant buttons; default is `B · 3-up`. Switching writes `data-writing-widget` to `<html>` and persists to localStorage; `:global([data-writing-widget="..."])` selectors in `src/pages/index.astro` switch the visible layout. Live regression gate: `tests/canonical-typography.spec.ts` "writing-widget variant switching toggles strip + hero-strip visibility (pt110)".

**Variants (Shipped).** All 6 canonical layouts from `new-design/extracted/explorations/writing-widget.jsx` are operational:

| Key                    | Implementation                                                                              | Where                            | Use when                                             |
| ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `in-hero`              | `<a class="hero__latest-strip">` 3-row card inside Hero (eyebrow / title / date+arrow)      | Inside Hero, left column         | Lightest touch; doesn't compete with the trust chain |
| `A · strip`            | `grid-template-columns: 1fr` + first card-only visible (siblings hidden)                    | Section between Hero and Explore | Promoting a single major post                        |
| `B · 3-up` _(default)_ | `grid-template-columns: repeat(3, 1fr)` 3-card grid                                         | Section                          | Showcasing recent cadence (3 most recent)            |
| `C · split`            | `grid-template-columns: 1.5fr 1fr 1fr` (featured first card visually wider)                 | Section                          | Mixing one prominent post + recent list              |
| `D · ticker`           | Single column, `flex-direction: row` items, lede + cta hidden, title 16 px, mono date strip | Section                          | Index-feeling, sticky title, dense rows              |
| `off`                  | `.writing-strip { display: none }`                                                          | —                                | Pages where Writing is not the right CTA             |

**Implementation rules.**

- The default `B · 3-up` is the unscoped `.writing-strip__list` rule; other variants are `:global([data-writing-widget="..."])` overrides.
- The `in-hero` variant pivots BOTH `.hero__latest-strip` (show) AND `.writing-strip` (hide); other variants pivot only the standalone strip.
- Real post metadata only — `latestPosts` from the writing content collection. Mock copy is forbidden.
- The strip card uses `var(--bg-1)` with `--line` border that lifts to `--accent-dim` on hover.
- Title font follows `--f-display` so it inherits the hero-font tweak.

### 6.13 TrustChain tooltip (Planned)

**Status: not yet shipped.** No `TrustChainTooltip` component file exists in `src/components/`; the §6.5 "Explain layer" subsection that activates this tooltip is also Planned. This subsection documents the intended shape so consumers know what to expect when the explain-layer ships.

**Purpose.** A teaching layer over the trust chain. Each stage exposes 2–3 sentences explaining what's happening cryptographically, why it matters, the standard it implements, and a link to the canonical spec. The chain itself stays dense — the tooltip is the on-demand decompression.

**Trigger.**

- **Desktop:** hover the row (120ms debounce in, 200ms grace out so the user can travel into the tip without it closing). Pointer entering the tip itself cancels the close timer.
- **Mobile (≤640px):** tap the row, or tap the explicit `ⓘ` info button. Tooltip becomes a bottom sheet with a backdrop.
- **Keyboard:** rows are `tabindex=0`; Enter/Space toggles a locked-open tooltip. Esc dismisses.
- **Explicit affordance:** every row carries a small `ⓘ` info button next to the label. It is redundant with the row hover for sighted mouse users — but it is the only discoverable affordance on touch and the only operable affordance for switch/keyboard-only users. Do not remove it.

**Anatomy.**

1. Numbered chip (`01`…`05`) — mono, accent-tinted, matches the row's node circle.
2. Stage title (sans, 14px/500).
3. Body — _what_ paragraph (plain), _why_ paragraph (`<em>` for emphasis, **not** italic).
4. Footer: standard tag (mono, accent, uppercase) + `Read spec →` link to the canonical document. Link uses `target="_blank"` and `rel="noopener noreferrer"` (cf. §9.4).
5. Close button (`×`) — visible on locked-open state; required on mobile sheet.

**Persistence model.** Two states:

- **Hover-open** (desktop only): closes when pointer leaves both the row and the tip.
- **Locked-open** (after click/tap/Enter): persists until the user clicks outside, presses Esc, or taps the close button. Hovering a different row does not steal a locked-open tip; the user must close it first.

**Positioning.** Prefers `side="left"` of the row (chains live in the right column of the hero). Flips to `side="right"` if the tip would clip the viewport's left edge. Vertically centred on the row, then clamped 80px from the top and 12px from the bottom. Repositions on scroll/resize while open. On mobile, ignored — the sheet is always bottom-anchored.

**Tokens used.** `--bg-1` (96% mix), `--line`, `--accent`, `--accent-dim`, `--fg`, `--fg-1`, `--fg-3`, `--f-sans`, `--f-mono`. Backdrop blur `18px saturate(140%)`. Drop shadow + 1px accent ring + 40px accent halo for depth.

**A11y.**

- Tooltip is a `role="dialog"` with `aria-modal="false"` (it does not trap focus — it sits beside the trigger).
- Each row carries `aria-describedby="tip"`; the info button has `aria-label="Explain {stage}"`.
- Esc closes any open tip from anywhere on the page.
- Reduced motion: open/close transitions drop to opacity-only at 80ms (no transform).
- The `<em>` tag in the _why_ paragraph is semantic emphasis, not visual italic — styled to inherit weight 500 and `--fg`. Italic Fraunces would compete with the chain's mono labels.

**Content rules.** Stage explanations live in `STAGES[i].explain = { what, why, standard, link }`. Copy authored against three constraints: (1) explain _what's happening cryptographically_, not the marketing benefit; (2) `why` answers "so what"; (3) `standard` is the registry name (e.g. `WebAuthn L3 · FIDO2`, `RFC 9449 · DPoP`), `link` resolves through the standards registry (§6.4).

**Do.** Use sentence case. Cite at least one published spec per stage. Keep `what` under 30 words. Update `link` only when the registry's canonical URL changes.

**Don't.** Stack two tooltips. Animate the tip's content (motion teaches nothing here). Reuse this primitive for non-explanatory popovers — use a separate component if you need a menu, picker, or confirmation.

### 6.14 Brand icon system

**Purpose.** A single mark, seven contexts. The Artagon glyph (circle + triangle + baseline + dot) is the only logo we ship; this section enumerates every variant and the rules that govern it.

**Source mark.** 24×24 viewBox. Outer ring stroke 1px @ 0.28 opacity. Triangle stroke 1.25px (`M12 2.5 L20 18.5 L4 18.5 Z`). Inner dot r=2.1, filled. Baseline stroke 1.25px from `(7, 18.5)` to `(17, 18.5)`. Stroke colour: `currentColor`. The faint outer ring is **load-bearing** — it is the only element that reads "closed system". Do not redraw the mark; copy SVG verbatim.

**Variants.**

| Variant                      | When                                       | Tile size | Glyph                                                 | Background                      |
| ---------------------------- | ------------------------------------------ | --------- | ----------------------------------------------------- | ------------------------------- |
| **01 Avatar · twilight**     | GitHub, Discord, dark social               | 1024²     | Classic, accent                                       | `--bg`                          |
| **01 Avatar · paper**        | LinkedIn, X (light theme)                  | 1024²     | Classic, `--paper-ink`                                | `--paper` (oklch 0.98 0.004 85) |
| **01 Avatar · transparent**  | Wherever the host theme is unknown         | 1024²     | Classic, `currentColor`                               | alpha 0                         |
| **02 Favicon 16/32**         | Browser tab                                | 16, 32    | **Bold** glyph (no ring, 2px stroke, larger dot)      | `--bg`                          |
| **02 Favicon 48**            | Browser tab @ HiDPI                        | 48        | Classic                                               | `--bg`                          |
| **02 Apple-touch 180**       | iOS home-screen                            | 180       | Classic                                               | `--bg`, 24px radius tile        |
| **03 Open Graph · twilight** | Default link preview                       | 1200×630  | Classic 44px + wordmark                               | `--bg` + grid + headline        |
| **03 Open Graph · paper**    | Light-theme override                       | 1200×630  | Classic 44px + wordmark                               | `--paper` + grid                |
| **04 Monochrome**            | Terminal splash, footer microprint, fax    | any       | Classic, `currentColor`                               | inherits                        |
| **05 Wordmark · horizontal** | Header (md), hero (lg)                     | —         | Classic + Inter Tight 500                             | inherits                        |
| **05 Wordmark · stacked**    | Square applications, slide bumpers         | —         | Classic 48px + 22px text                              | inherits                        |
| **06 Cropped** _(remix)_     | Tiny sizes (<32px) where the ring vanishes | any       | No ring, larger triangle, `(12,1)→(22.5,21)→(1.5,21)` | inherits                        |
| **06 Filled** _(remix)_      | App-icon tiles, stickers, swag             | 1024²     | Solid disc + knockout triangle                        | tinted                          |

**Sizing rules.**

- The classic mark survives down to **48 px**. Below that, switch to the **bold** variant — anti-aliasing eats the 1 px outer ring.
- The classic mark scales up indefinitely.
- Padding inside an avatar tile: glyph occupies **56% ± 2%** of the tile dimension. This survives every platform's centre-crop.

**Colour rules.**

- The mark inherits `currentColor`. **Do not** hard-code `#86E1DC` in the SVG — it pins the mark to one accent and breaks the `[data-accent]` switch.
- For exported PNGs (favicons, OG cards) where CSS doesn't reach, hard-code the resolved colour at export time and re-export when tokens change.
- The faint outer ring is `currentColor` at `stroke-opacity="0.28"`. It is _not_ a separate token — keep it relative to the foreground so it tracks light/dark theme automatically.

**Wordmark.**

- Family: Inter Tight, weight 500, tracking `-0.01em` (header) or `-0.02em` (hero).
- Glyph-to-text gap: 10px (header), 14px (hero), 14px (stacked).
- Glyph height matches text cap-height — not text size. Inter Tight cap-height is ~71% of em, so a 28px wordmark uses a ~28px glyph (visual harmony, not numerical match).

**A11y.**

- The standalone mark is decorative when it sits next to the wordmark — set `aria-hidden="true"` on the inner SVG; the surrounding `<a>` carries the accessible name.
- When the glyph appears alone (favicon, avatar export), the host platform supplies the name via metadata (`<title>`, OG `site_name`, app manifest `name`). The SVG itself does not include a `<title>` element — that would conflict with the platform-provided label.
- Contrast: the classic mark on `--bg` has 7.0:1 luminance contrast at the triangle stroke and 2.1:1 at the outer ring. The ring is decorative; it falls under the 3:1 UI-element rule, not the 4.5:1 text rule.

**Do.** Treat the gallery in `brand-icons.html` as the canonical reference. Copy SVG from there — the page's `Copy SVG` buttons emit fully self-contained, paste-ready markup with the right size and colour baked in.

**Don't.** Re-draw the mark. Skew, rotate, or flip the mark. Place the mark on a busy photographic background without first dropping it into a tile from this table. Use the filled remix as a default — it is reserved for app-icon tiles and physical swag.

### 6.12 Long-form reader (GitHub-sourced writing & docs)

**Purpose.** Render the full article body for blog posts and longer technical
documents that live as Markdown / MDX in a separate GitHub repo
(`artagon/content` or `artagon/docs`). The home-page Writing widget (§6.11) is
the entry point; this component renders the destination page.

**Source contract.**

- Each article is one file: `posts/<yyyy-mm-dd>-<slug>.{md,mdx}`.
- Frontmatter is required: `title`, `description`, `eyebrow`, `published`,
  `updated?`, `tags[]`, `accent?`, `cover?`, `repo?`. `repo` defaults to
  `artagon/content`; setting it allows pulling docs from `artagon/docs`.
- Body is GitHub-flavored Markdown plus the same MDX components allowed in
  `src/content/pages/` (§6) — `<StandardChip>`, `<TrustChain>`,
  `<Diagram src="…">`, `<Callout>`.
- Content is fetched at build time only. **No client-side fetches to GitHub.**
  Astro pulls and caches at `astro build`; CI revalidates on a webhook.

**Anatomy.**

```
Nav
  Article header   eyebrow · h1 · meta strip (date · author · reading time · "Edit on GitHub")
  Hero figure?     optional cover image OR diagram (intrinsic dims required, §11.4)
  Body             prose column · 65ch max · numbered §-headings (.num-h2)
    ├ Paragraphs   16px / 1.7 · max-inline-size: 65ch
    ├ Code         see "Code blocks" below
    ├ Diagrams     see "Diagrams" below
    └ Quotes       Fraunces italic, --accent-dim left rule, 24px inset
  Aside (≥1024px)  sticky TOC · standards referenced · last updated
  Footer rail      "Continue reading" 2-up · standards-row · share
Footer
```

**Post-body primitives — canonical contract (USMR 5.5.16).** The `/writing/[slug]` route ports primitives from canonical `new-design/extracted/src/pages/blog.html`. Drift from these values silently de-canonicalizes long-form content:

| Primitive        | Property                  | Canonical value                                                      | Pre-fix value                                                                 |
| ---------------- | ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `h2`             | margin-top                | `64px`                                                               | `56px`                                                                        |
| `h2`             | font-size clamp           | `clamp(26px, 2.4vw, 34px)` / line-height `1.12`                      | `clamp(24, 32)` / `1.15`                                                      |
| `h2 .num`        | layout                    | `display: block` + `margin-bottom: 8px` + tracking `0.14em`          | inline `vertical-align: middle` + tracking `0.12em`                           |
| `code` (inline)  | color / bg / border       | `var(--accent)` / `var(--bg-1)` / `1px solid var(--line-soft)`       | `var(--fg)` / accent-tinted `color-mix(accent 6%, transparent)`               |
| `.pull`          | bg / radius / margin      | `linear-gradient(bg-1 → bg)` / `14px` / `56px 0` / `max-width: none` | accent-tinted `bg-1 → bg-1` / `8px` / `36px 0`                                |
| `.chain-row`     | grid / framing            | `40px 1fr auto` + per-row `1px solid var(--line-soft)` + `var(--bg)` | `28px 1fr auto` + border-top divider only                                     |
| CTA cards        | padding / border / height | `26px` / `var(--line)` / no `min-height`                             | `20×22` / `var(--line-soft)` / `min-height: 156px`                            |
| `.compare .col`  | padding                   | `22px`                                                               | `24px`                                                                        |
| `.cta-card`      | hover border / transition | `var(--accent)` / `background .15s, border-color .15s`               | `var(--accent-dim)` / `border-color 0.18s, background 0.18s, transform 0.18s` |
| `.chain-caption` | letter-spacing            | `0.08em` (matches eyebrow micro-text scale)                          | `0.06em`                                                                      |

**Code blocks (the load-bearing requirement).**

- **Highlighter:** Shiki (build-time, themed). Two themes registered: a
  dark `artagon-dark` and light `artagon-light` derived from §2 tokens.
  Never use Prism or Highlight.js — Shiki produces no runtime JS.
- **Per-block frame:** mono caption strip (language · filename · "copy"),
  scrollable body, line numbers optional, line-highlight via `{2,5-7}` syntax.
- **No syntax-highlighted code on marketing pages** (§6.9 still holds). This
  variant is **only** for `/writing/*`, `/docs/*`, and pages opted into via
  `frontmatter: layout: article`.
- **Long lines wrap** at the prose width on mobile; horizontal scroll only
  inside the code body, never the whole page.
- **Copy button** uses `navigator.clipboard.writeText`; falls back to a
  document-execCommand path under no-permission origins. Announces success
  via `aria-live="polite"`.

**Diagrams.**

- **Authoring formats accepted (in priority order):**
  1. **SVG** committed to the repo (`assets/diagrams/<slug>.svg`). Inline-rendered, never `<img>`. Required: `<title>` + `<desc>` for a11y.
  2. **Mermaid** in fenced ` `mermaid ` ` blocks. Compiled to SVG at build with `@mermaid-js/mermaid-cli`. Themed via the same Artagon palette — never the default Mermaid pastel.
  3. **D2** in fenced ` `d2 ` ` blocks. Compiled at build with `terrastruct/d2`. Use for sequence + grid diagrams Mermaid handles poorly.
  4. **PNG/WebP screenshots** with intrinsic `width`/`height` attrs and `alt`. Last resort.
- **No client-side diagram libraries.** Anything that requires runtime JS to render is rejected — it inflates bundles and breaks under reduced-motion and `prefers-color-scheme`.
- **Caption.** Every diagram has a `<figcaption>` in mono, max 1 line, format: `Fig. <n> · <description>`. Numbering is per-article.
- **Dark/light parity.** SVG diagrams must use the §2 token names via
  `currentColor` and CSS variables, not hardcoded hex. The diagram's
  background should be transparent — the article surface provides it.

**Frontmatter → page metadata mapping.**

- `title` → `<h1>` and `<title>` (`{title} — Artagon`).
- `description` → `<meta name="description">` (150–160 chars).
- `published` / `updated` → meta strip and JSON-LD `Article.datePublished` / `dateModified`.
- `tags[]` → standards-style chips below the meta strip; if a tag matches a `STANDARDS` registry entry, render the canonical `<StandardChip>` instead.
- `cover` → OG image and (optionally) the hero figure.
- `repo` → "Edit on GitHub" link target.

**Tokens.** `--bg`, `--bg-1` (code & diagram surfaces), `--fg-1` (prose),
`--fg-3` (meta), `--accent` (links + quote rule), `--line-soft` (figure
borders), `--f-mono` (code, captions, eyebrow), `--f-display` (h1, h2),
`--f-sans` (body).

**A11y.**

- `<main>` wraps article body; aside is `<aside aria-label="Table of contents">`.
- Headings are a clean h1 → h2 → h3 ladder; the SEO lint (§13.2) checks this.
- Code copy buttons announce success via `aria-live`.
- Diagrams: SVGs carry `<title>`/`<desc>`; Mermaid/D2 outputs are wrapped in `<figure role="img" aria-label="…">` with the figcaption serving as the textual fallback.
- All link targets in code/diagrams have visible text. Bare URLs are linkified but visually compressed.

**Performance.**

- Article HTML is **fully pre-rendered** — no runtime markdown parsing on the client.
- Images have `loading="lazy"` (except the hero) and `decoding="async"`.
- Shiki ships zero runtime JS; copy-button is a single ~400-byte island.
- Mermaid/D2 outputs are inlined as SVG; no `<iframe>`, no external CDN.

**Do**

- Treat the GitHub repo as the source of truth. The site is a render target.
- Use Mermaid for sequence diagrams, D2 for system diagrams, hand-authored SVG for the trust-chain visual.
- Keep code blocks under ~60 lines; longer goes in a linked Gist or an `<details>`.

**Don't**

- Don't fetch from GitHub at runtime. Build-time only.
- Don't ship a JavaScript syntax highlighter.
- Don't render diagrams via a `<script>` tag — pre-compile to SVG.
- Don't paste code as a screenshot. It breaks selection, search, and a11y.

### 6.15 Generic primitives

Small utility classes that ride alongside the named components above. They ship in `public/assets/theme.css` (USMR Phase 5.1q.5) so component authors can reach for them without re-declaring layout / typography in scoped Astro styles.

| Class      | Purpose                    | Anatomy                                                                                    |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `.cluster` | CTA / chip group           | `display: flex; flex-wrap: wrap; gap: 10px; align-items: center;`                          |
| `.tag`     | Uppercase mono pill        | `var(--bg-1)` bg · `var(--line)` border · `var(--f-mono)` 0.7 rem · 0.12 em letter-spacing |
| `.kbd`     | Keyboard-shortcut chip     | `var(--bg-1)` bg · `var(--line)` border · `var(--f-mono)` 0.72 rem · 4 px 8 px padding     |
| `.badge`   | Mono numeric / status pill | `var(--bg-1)` bg · `var(--line)` border · `var(--f-mono)` 0.72 rem · 6 px 10 px padding    |

**Rules.**

- These primitives are token-only (`--bg-1` / `--fg-1` / `--line` / `--f-mono`) — no raw color literals. They re-tone automatically across `[data-theme]` / `[data-accent]` switches.
- `.cluster` is for **layout**, not visual decoration. Don't add backgrounds or borders; consume `.tag` / `.btn` / `.badge` as children.
- `.tag` and `.badge` look similar at a glance; reach for `.tag` when the content is a category label and `.badge` when it carries a numeric or status value.
- `.kbd` accepts a single key per element (e.g. `<span class="kbd">Esc</span>`); compound shortcuts use multiple `.kbd` siblings separated by `+`.

### 6.16 Pillars (Platform tablist)

**Purpose.** The `/platform` page's centerpiece — a 3-tab strip surfacing Identity / Credentials / Authorization, each with a serif-italic tagline, body paragraph, glossary-chipped bullet list, and a paired live-looking JSON / policy code panel. Replaces the legacy `--brand-teal` 4-card highlights grid.

**Anatomy.**

- **Hero strip** — eyebrow (`Platform`) · `<h1>` from `platform.mdx` frontmatter · lede with positioning sentence.
- **Tab strip** (`role="tablist"`) — three `<button role="tab">` elements above a 1px `var(--line-soft)` rule. Selected tab: 2px `var(--accent)` top border + `color-mix(in oklab, var(--accent) 5%, transparent)` background tint.
- **Active panel** (`role="tabpanel"`) — 2-column grid (1.1fr / 1fr at ≥ 1024 px, single-column below):
  - Left: serif italic tagline (consumes `--f-emphasis`), body paragraph, mono bullet list with `→` accent arrows. Bullets render glossary chips inline via `<Standard>` / React `StandardChip`.
  - Right: `.pillar-specimen` code panel — mono header strip carries free-form per-kind content (5.5.2: JWK JSON literal for `kind: "jwt"`, sentence-case label for `"vc"`, mono filename for `"policy"`); CSS applies `text-transform: uppercase` so authored values stay in their natural case in source. Accent `● live` indicator on the right of the header. `<pre>` payload below with `white-space: pre-wrap`.

**Rules.**

- **Manual activation** (WAI-ARIA APG, resolved Open question 2): `ArrowLeft` / `ArrowRight` walk focus, `Home` / `End` jump, `Enter` / `Space` commits. Click commits immediately. Roving `tabIndex` — only the focused tab is in document tab order.
- Data lives in `src/data/pillars.ts`; never hardcode pillar copy in component bodies.
- Bullets are structured tokens (`{ kind: "text" | "term", value }`), not inline markup strings. The renderer maps `term` nodes to glossary chips — no regex parsing.
- Specimen `payload` strings carry an `@TODO-IDENTITY-REVIEW: <reviewer> by <date>` inline marker until identity-team sign-off. The Cedar starter uses only documented Cedar primitives — no Artagon-internal type names.
- The italic emphasis span in the heading consumes `--f-emphasis`, not `--f-serif` directly. See §3.4.

**A11y.**

- WAI-ARIA tablist with `aria-controls` / `aria-labelledby` wiring per APG.
- Tab strip border swap is the visual cue for the selected tab; an explicit `aria-selected` reflects state for assistive technology.
- `:focus-visible` outline (2 px `var(--accent)`) survives the active-tab background tint via `outline-offset: -2px`.
- Reduced motion: tab strip has no animation. Forced-colors mode resolves selected-tab border to `Highlight` and code panel to system colors.

**Status: shipped.** USMR Phase 5.2.5 — `src/components/PillarsIsland.tsx` + `src/components/PillarsIsland.css` + `src/data/pillars.ts` extension. Snapshot baselines for `/platform` on Tablet Safari + Mobile Chrome × 3 will need workflow_dispatch regen (task 5.2.x) — the mobile-fit shim from new-design platform.html:7-22 was deliberately NOT ported (resolved Open question 1) so the responsive layout diverges from the legacy 1280-fixed look on tablets.

### 6.17 BridgeFlow (Bridge route)

**Purpose.** The `/bridge` page's centerpiece — a 3-party board paired with a 4-step protocol strip, both wired to a single `step` state so each step in the strip activates exactly one party in the board. Visually narrates the OID4VP→OIDC bridge story for prospects who land on the route from the Header nav.

**Anatomy.**

- **Hero strip** — eyebrow (`The bridge strategy`) · `<h2>` with serif-italic emphasis on "cryptographically verified." · 2-column lede.
- **Board** (`.bridge-flow__board`) — outer card (`var(--bg)` over `var(--bg-1)` page bg, 1 px `var(--line)`, 14 px radius) holding:
  - **Parties row** — 3 equal `<div>` cards: Relying party (`Your OIDC App`, unchanged) · Trust service (`Artagon`, verifier + bridge) · Holder (`User's Wallet`, holds VCs). Active card: 1 px `var(--accent-dim)` border + `color-mix(in oklab, var(--accent) 8%, var(--bg-1))` background. Inactive cards stay neutral.
  - **Steps strip** (`<ol>`) — 4 `<button role>`-elements separated by 1 px `var(--line-soft)` rules. Active step: 2 px `var(--accent)` top border + `color-mix(in oklab, var(--accent) 4%, transparent)` tint. Past steps: 2 px `var(--accent-dim)` top border (visited indicator). Future steps: transparent border.
- **Result sentence** — mono caption below the board: `Result: <accent>high-assurance identity</accent> flows through your existing stack. No migration. No rip-and-replace.`

**Rules.**

- **Auto-cycle** every 2200 ms (matches canonical `setInterval(2200)`). Click any step jumps the cycle to that step but does NOT freeze the timer — the cycle continues from the user-clicked step. USMR Phase 5.5.5 removed the previously-shipped `userInteractedRef` permanent-freeze latch to match canonical Bridge.jsx:16-19 UX. Skipped under `prefers-reduced-motion: reduce` AND `navigator.webdriver` (Playwright deterministic E2E) — both render with `step = 2` (Verify highlighted, the canonical resting screenshot).
- **Data lives in `src/data/bridge.ts`** — `PARTIES` (3-tuple) + `STEPS` (4-tuple) with structured `LabelNode` tokens (text + glossary terms). The renderer maps `term` nodes to `<Standard>` chips inline.
- **Each step's `nodeId` points at exactly one party**. The `tests/bridge-data.test.mts` invariant gate enforces (a) every nodeId resolves to a real party, (b) every party gets activated by at least one step.
- **Click jumps the cycle to the chosen step** without freezing the timer (USMR 5.5.5 reversed the earlier "freeze for page lifetime" behavior). The auto-cycle continues from the user-clicked step, matching canonical Bridge.jsx:16-19.

**A11y.**

- `<ol>` for steps + `<button>` per step. `aria-current="step"` on the active step (and the active party).
- Steps are keyboard-reachable via Tab; `:focus-visible` outline (2 px `var(--accent)`) is preserved with `outline-offset: -2px` so it survives the active-step background tint.
- Cycle pauses naturally on hover/focus only via the click-commit path — there's no separate pause-on-hover today (the cycle is brief enough that hovering rarely intersects with the timer).
- Reduced-motion: cycle skipped, `step = 2` rendered. Forced-colors: party + step active states resolve to `Highlight` border, neutral states stay system-default.

**Status: shipped.** USMR Phase 5.2.8 (page composition revised in 5.5.1) — `src/components/BridgeFlow.tsx` + `src/components/BridgeFlow.css` + `src/data/bridge.ts`. The `/bridge → /platform/#bridge 301` redirect from 5.1q.3 dropped in 5.2.8 (the route resolves directly); the `<section id="bridge">` anchor on `/platform` from 5.1q.4 also dropped in 5.5.1 after canonical-fidelity review confirmed `/platform.html` line 848 (`<App><Pillars/></App>`) renders Pillars only. `/bridge/index.astro` now mounts `<BridgeFlow client:visible />` directly with no surrounding page hero, matching `/bridge.html` line 768 (`<App><Bridge/></App>`).

### 6.18 StandardsWall (Standards route)

**Purpose.** The `/standards` page's centerpiece — a 3-column wall listing every protocol Artagon implements, organized by capability domain (Authn & Authz · Decentralized ID · Authorization). Below the wall, a 4-badge affiliation row records standing in IETF / OpenID Foundation / W3C working groups.

**Anatomy.**

- **Hero strip** — eyebrow (`Standards & specs`) · `<h2>` with serif-italic emphasis on "We implement" · 2-column lede.
- **3-column wall** (`.standards-wall__columns`) — each column has a mono-uppercase header (the group label), then a vertical list of items. Each item is a 2-column row: `name` (mono, `--fg`, weight 500) on the left · `description` (mono, `--fg-2`, smaller) on the right. Rows are separated by 1 px `var(--line-soft)`.
- **Affiliation badges** (`.standards-wall__badges`) — center-aligned row of 4 badges, each with a mono-uppercase eyebrow (`Certifying` / `Contributing` / `Member`) and a body label.

**Rules.**

- **Data lives in `src/data/standards.ts`** — `STANDARDS_GROUPS` (3-tuple) + `STANDARDS_BADGES` (4-tuple). Never hardcode standards copy in component bodies.
- **Item names are glossary-linked at render time** — the StandardsWall renderer calls `lookupGlossary(item.name)`; matches turn into `.standard-chip` links to the canonical RFC / W3C TR / vendor docs. Misses render as plain text. The `tests/standards-data.test.mts` invariant gate enforces ≥ 70% link coverage so a glossary regression doesn't silently strip every item.
- **The canonical Pillars vocabulary is fully covered** — every term referenced on `/platform` (OIDC 2.1, GNAP, DPoP, etc.) appears here too. Tests gate this; the two pages stay in sync.
- **Static-only** — no React island, no client interactivity. The wall is pure presentation.

**A11y.**

- `<section>` with `aria-labelledby` pointing at the `<h2>`. Each column is a `<div>` with an `<h3>` header and an `<ul>` of items.
- Glossary chips inherit the site-wide `:focus-visible` outline. The dotted-underline + accent-on-hover pattern from Standard.astro applies.
- Forced-colors override is inherited via the global `.standard-chip` rule (Phase 5.1).

**Status: shipped.** USMR Phase 5.4 — `src/components/StandardsWall.astro` + `src/data/standards.ts`. Replaces the PageLayout stub from 5.1q.2.

### 6.19 RoadmapTimeline (Roadmap route)

**Purpose.** The `/roadmap` page's centerpiece — a 5-card horizontal timeline (V1-V5, 18 months) showing per-phase status, scope, and time band. Compresses an 18-month delivery plan into a single legible scan.

**Anatomy.**

- **Hero strip** — eyebrow (`Roadmap`) · `<h2>` with serif-italic emphasis on "authority." · 2-column lede.
- **5-card grid** (`.roadmap-timeline__phases`) — equal-width columns separated by 1 px `var(--line-soft)`, all wrapped in a single 1 px `var(--line)` outer card. Each phase card is a `<li>` with header (`<span class="roadmap-phase__version">` mono prefix + `<span class="roadmap-phase__when">` time band right-aligned), status row (colored dot + uppercase mono label), title, and `<ul>` of scope items.
- **Status dot** — 6 × 6 px `border-radius: 999px` colored token + matching `box-shadow: 0 0 10px <color>`. Status → token mapping documented in `src/data/roadmap.ts ROADMAP_STATUS`. Forced-colors mode swaps to system Highlight / Mark.

**Rules.**

- **Data lives in `src/data/roadmap.ts`** — `ROADMAP_PHASES` (5-tuple) + `ROADMAP_STATUS` map. The status enumeration is exhaustive — `tests/roadmap-data.test.mts` gates that every phase resolves AND that the progression is monotonic (V1 ahead of V2 ahead of V3, etc.).
- **`id` field preserved** for `/roadmap#v3`-style deep links carried over from the 5.1c-era stub. The card's anchor is `#roadmap-phase-<id>` if rendered with `id` props (no anchors today; track for 5.7.x if external links exist).
- **Status drives appearance, not content** — the dot color and label come from `ROADMAP_STATUS[phase.status]`; the per-status BEM modifier (`.roadmap-phase--shipping` etc.) selects the color in CSS. Don't hardcode dot colors per phase.
- **Static-only** — no React island. Future phases might add a "filter by status" dropdown; that would land as a separate sub-task (5.7.x).

**A11y.**

- `<ol>` because the V1-V5 ordering is meaningful (chronological).
- Status dot has `aria-hidden="true"` — the adjacent label conveys the same information for AT users.
- The 5-card layout collapses to 2-column < 1024 px, then 1-column < 540 px. No horizontal scroll on any breakpoint.
- Forced-colors override maps shipping / in-build → Highlight; design → Mark; planned → CanvasText (no color signaling).

**Status: shipped.** USMR Phase 5.7 — `src/components/RoadmapTimeline.astro` + `src/data/roadmap.ts` (extended from the 5.1c stub; the prior `kpis[]` field dropped — never consumed downstream). The earlier `RoadmapPhaseCard.astro` / `RoadmapTable.astro` / `public/assets/roadmap.css` cards/table-toggle helpers deleted as orphans.

### 6.20 UseCasesIsland (Use-cases route)

**Purpose.** The `/use-cases` page's centerpiece — a 4-scenario vertical tablist that walks the visitor through the canonical identity narrative arc (Human→Human same-domain, Human→Human cross-domain, Human→Machine ephemeral, Human→Autonomous-Machine). Each panel shows the scenario, a 3-metric divider strip, and an ordered protocol trace with the decision line painted in `--accent`.

**Anatomy.**

- **Hero strip** — eyebrow (`What you can build`) · `<h2>` with serif-italic emphasis on "— solved cleanly." · max-width 22 ch.
- **Board** (`.use-cases__board`) — 2-column grid: 260 px left rail + `1fr` panel. Collapses to 1-column < 720 px.
- **Left rail** (`role="tablist" aria-orientation="vertical"`) — vertical column of `<button role="tab">` elements; selected tab gets a 2 px `var(--accent)` left border + `color-mix(in oklab, var(--accent) 6%, transparent)` background; the `short` eyebrow flips to `var(--accent)`. Inactive tabs show `var(--line-soft)` left border.
- **Detail panel** (`role="tabpanel"`) — outer card (1 px `var(--line)`, 12 px radius, 36 px padding) holding: (a) eyebrow + serif title + body paragraph, (b) `.use-cases__metrics` 3-column divider strip with `--line-soft` separators, (c) `.use-cases__trace` ordered list rendered in `var(--f-mono)` 0.78 rem with right-aligned 2-digit numbering. The trace's last `<li>` carries `is-decision` and recolors text to `var(--accent)` — that's the PERMIT/DENIED line.

**Rules.**

- **Data lives in `src/data/use-cases.ts`** — `USE_CASES` 4-tuple of `UseCaseScenario`. Every scenario has `id` · `label` · `short` · `title` · `scenario` · `trace` (≥ 3 lines, last line is the decision) · `metrics` (exactly 3 KV pairs). `tests/use-cases-data.test.mts` invariants gate the shape.
- **Manual-activation tablist** matching the PillarsIsland 5.2.4 convention. ArrowUp / ArrowDown walk focus, Home / End jump to ends, Enter / Space commits the focused tab, click commits immediately. Roving `tabIndex` — only the active tab is in document tab order.
- **Decision line is always last** — the test gate enforces a `PERMIT|DENIED` token in `trace[trace.length - 1]`. If a future scenario migrates the decision mid-trace the renderer's `is-decision` accent would visually misalign with the narrative; the gate fires before that ships.
- **Scenario taxonomy is exhaustive** — Human→Human (same-domain + cross-domain), Human→Machine ephemeral, and a Human→Autonomous-Machine scenario must all be present. Test-gated.

**A11y.**

- Vertical-orientation tablist with manual activation. `aria-selected`, `aria-controls`, and `tabIndex` reflect the selected/focused split.
- `:focus-visible` on each tab: 2 px `var(--accent)` outline with `outline-offset: -2px` so it survives the active-tab background tint.
- Forced-colors override: active-tab border resolves to `Highlight`; the decision line falls back to `Highlight` (system-defined emphasis); panel + trace backgrounds collapse to `Canvas`.
- The metrics grid is exposed as `role="list"` of `role="listitem"` so screen readers announce it as a discrete unit (the visual divider strip alone wouldn't convey list semantics).

**Status: shipped.** USMR Phase 5.3 — `src/components/UseCasesIsland.tsx` + `src/components/UseCasesIsland.css` + `src/data/use-cases.ts`. Replaces the PageLayout stub from 5.1q.1.

### 6.21 Writing index (Blog alias)

**Purpose.** The `/writing` route — surfaced in the header nav as "Blog" — lists every published post. The new-design canonical brands the page as "Blog · Field notes from the Artagon team"; the underlying URL stays `/writing` and a `/blog` → `/writing` 301 redirect (Cloudflare `_redirects`, including `/blog/*` → `/writing/:splat` for slug parity) means both labels resolve.

**Anatomy.**

- **Hero strip** (`.writing-hero`) — eyebrow (mono uppercase, `Blog · Field notes from the Artagon team`) · `<h1>` with `<span class="writing-hero__emphasis">trust</span>` rendered in `var(--f-emphasis, var(--f-serif))` italic · 18 px lede in `var(--fg-2)`. Bottom border (1 px `--line-soft`) separates hero from list.
- **Post list** (`.writing-list`) — vertical stack of `.post-card`s. Each card is a 2-column grid: 140 px mono-stacked date column (`YYYY` on first line, `MM · DD` on second) + flex content (display-font `<h2>`, lede excerpt, mono meta line `Tag · X min read · Author`). Bottom border (1 px `--line-soft`) per card.
- **Empty state** — single line "No posts yet — check back soon." in `var(--fg-2)`. Renders if every post is marked `draft: true`.

**Rules.**

- **Sort order** — `published` desc. Drafts (`draft: true`) are filtered out at build time.
- **Reading-time estimate** computed from the rendered body at build time using a 220 wpm baseline (see `readingMinutes()` in the page frontmatter). Floor of 1 minute.
- **Primary tag** drives the meta-line eyebrow — first entry of `frontmatter.tags[]` (e.g. "Strategy" / "Engineering" / "Launch"). Falls back to `Field notes` when `tags[]` is empty.
- **Author byline** is optional — resolves through the `authors` collection by slug. A missing or unresolved slug renders the meta line without a byline rather than failing the build.
- **Hover tint** matches the canonical: `color-mix(in oklab, var(--accent) 4%, transparent)`. `:focus-visible` adds a 2 px `var(--accent)` outline with 4 px offset on top of the tint.

**A11y.**

- Hero is a `<section aria-labelledby="writing-hero-heading">`; list is a `<section aria-label="Posts">`. Each card is a single `<a>` (the entire card is the link target, so screen readers read once and don't double-announce).
- `<time datetime="ISO-8601">` wraps the date column so AT users get the canonical date string instead of the visually-stacked `2026 04 · 21` layout.
- Forced-colors override: hover tint resolves to `Canvas`; focus outline resolves to `Highlight`.

**Status: shipped.** USMR Phase 5.5 — `src/pages/writing/index.astro` rewrite (replaces the 5.1q `--brand-teal` stub). `/blog` → `/writing` 301 added to `public/_redirects`. The detail-route refresh (TOC sidebar + related posts + RSS CTA) lands separately as 5.6. Hero padding tightened to `top clamp(56px, 7vw, 72px) / bottom 8px` per canonical `blog.html:823` in 5.5.5; the writing collection now ships 3 posts (welcome / compounding-trust-chain / bridge-strategy) all bylined to `giedrius-trumpickas` (5.5.5 + 5.5.6 authors-collection populate).

### 6.22 ArtagonGlyph (shared brand mark)

**Purpose.** Single-source SVG brand mark consumed by both `Header.astro` and `Footer.astro`. Replaced the 5.1-era `/icons/icon-64.png` raster in 5.5.4. The 4-element path (circle outline + triangle + filled center dot + base line) renders the canonical Artagon mark from `new-design/extracted/src/pages/index.html:538-546`. Eliminates ~26 lines of verbatim duplicated SVG across consumers.

**Anatomy.**

- 24×24 viewBox, default `size: 22` (matches canonical `<ArtagonGlyph size={22} />` consumed by `Nav` + `Footer`).
- 4 path elements drawn with `currentColor` so consumers can swap colors via the surrounding scope's `color` rule (no explicit fill/stroke prop needed).
- Optional `class` prop forwarded to the root `<svg>` so consumers add layout helpers (`.site-nav__glyph` for Header, `.footer-glyph` for Footer) without baking layout into the shared component.

**Rules.**

- Always use `currentColor` for fills/strokes — never hardcode `--accent` or `--fg`. Consumer's surrounding `color` cascades.
- Default `size = 22` matches canonical `index.html:551`. Override only when a different surface needs a different visual scale (e.g. a hero badge); the wordmark consumer should never resize.
- Do not author `aria-label` on the glyph — the wordmark consumer wraps it in a labeled `<a>` (e.g. `aria-label="Artagon home"`); the glyph itself is `aria-hidden="true"`.

**A11y.** `aria-hidden="true"` on the SVG root — every consumer announces the brand via the adjacent `Artagon` wordmark text or via the link's `aria-label`. Forced-colors mode preserves the mark via `currentColor` cascade (resolves to `CanvasText` / `Highlight`).

**Status: shipped.** USMR Phase 5.5.4 — `src/components/ArtagonGlyph.astro` (consumed by `Header.astro:25` + `Footer.astro:84`).

### 6.23 HomeExplore (Home / 6-card explore grid)

**Purpose.** The home page's "Explore" section between the writing strip and the on-ramp CTA. Six cards provide entry points into each marketing route (4 primary product surfaces + 2 wide cards for Roadmap and the external GitHub repo). Token-only port of the canonical `HomeExplore.jsx` (`new-design/extracted/src/components/HomeExplore.jsx`). Static — no React island.

**Anatomy.**

- **Heading row** (2-column grid at ≥ 720 px, stacked below) — left: mono eyebrow (`Explore`) + display headline `One platform. <span class="serif">Six</span> things to dive into.` (italic emphasis on "Six"); right: lede `Pick your entry point. Each page goes deep on one slice of the platform.`
- **Primary grid** — 4-column (`repeat(4, 1fr)` at ≥ 1024 px, `repeat(2, 1fr)` between, single-column below 540 px). Cards: Platform / The Bridge / Use cases / Standards.
- **Secondary grid** — 2-column wide cards (Roadmap / GitHub-external).
- **Card** — 220 px min-height (180 for wide), 12 px radius, 1 px `var(--line-soft)` border, `var(--bg-1)` surface. Top row: mono index (`01`–`06`) + optional `↗ EXTERNAL` chip. Below: display title (26 px, weight 500, `-0.02em` tracking), body lede (13.5 px, `var(--fg-2)`), accent `Open →` CTA at the bottom.

**Rules.**

- **Card data lives inline as 2 typed const tuples** (`PRIMARY` of length 4, `SECONDARY` of length 2 wide). Order is product-narrative — do not reshuffle without a corresponding home-page narrative review.
- **External cards** open in a new tab with `rel="noopener noreferrer"` (matches Footer convention 5.5.4).
- **Hover tint** uses `color-mix(in oklab, var(--accent) 4%, var(--bg-1))` per canonical `global.css:303`. Border darkens to `var(--accent-dim)`. Card lifts via `transform: translateY(-2px)` on a 220 ms ease.
- **The section is the canonical `#playground` anchor** (5.5.6) — the hero secondary CTA `Open the playground` jumps here, mirroring canonical `Hero.jsx:167`.

**A11y.**

- Cards are `<a>` links wrapping the index + title + body + CTA in a single tab stop (no double-announce of nested links).
- `:focus-visible` outline 2 px `var(--accent)` with 2 px offset survives the hover tint background.
- Forced-colors override: hover tint resolves to `Canvas`, border + CTA resolve to `Highlight`.

**Status: shipped.** USMR Phase 5.5.2 — `src/components/HomeExplore.astro` mounted in `src/pages/index.astro` between the writing strip and the on-ramp `#get-started` section.

### 6.24 Get-started landing page (`/get-started`)

**Purpose.** Stand-alone landing page for the design-partner program. Mirrors the canonical `Cta.jsx` composition (`new-design/extracted/src/components/Cta.jsx:7-67`) so users who arrive at `/get-started` directly (Hero primary CTA, Header "Request access" button, every onRamp CTA on /writing posts, footer "Contact" link) see the same on-ramp UX as the in-page `#get-started` anchor on home.

**Anatomy.**

- Outer card (1px `var(--line)`, 16px radius, linear-gradient `var(--bg-1) → var(--bg)` 135deg, 72px top padding to clear the absolute-positioned strip).
- Mono caption strip absolutely-positioned at top: `artagon · design partner program` left, `accepting ~12 partners for Q2` right.
- 2-column grid: 1.2fr lead column (display headline with serif italic emphasis on "next" + 17px lede + 2 CTAs — primary mailto + ghost github.com/artagon with `target="_blank"` + sr-only "(opens in new tab)") and 1fr contact card (1px `var(--line)`, 12px radius, 28px padding, mono 13px, 4 rows: Enterprise / General / Security / Location resolved through `ORG.contacts`, with PGP footnote below).
- Collapses to single column at < 720 px.

**Rules.**

- The primary CTA href is `mailto:` resolved via `ORG.contacts.find(c => c.label === 'General')` so renames/relabels in `src/data/organization.ts` propagate automatically.
- The page is a real Astro route — NOT a `noindex` shim — so it's discoverable + indexable as the design-partner conversion target.
- USMR Phase 5.5.14 replaced the earlier stub-quality version (links to `/console` + `/docs`, both broken) with the canonical Cta.jsx-shaped page.

**Status: shipped.** USMR Phase 5.5.14 — `src/pages/get-started/index.astro` rewritten end-to-end. Hero primary CTA (`#get-started` anchor) AND the dedicated `/get-started` route both land on conversion paths.

### 6.25 404 page

**Purpose.** Recovery surface — replaces a dead-end "Page not found" with 5 navigable entry points back into the marketing site. The previous 5.1-era version offered one home link only.

**Anatomy.**

- Brand frame (`Header` + `Footer` slots).
- 760px max-width content card with mono `Error · 404` eyebrow, display headline ("We couldn't find that **page**." — italic-serif emphasis on "page"), 17px lede.
- 5 recovery links rendered as a `<ul role="list">`: Platform / Bridge / Standards / Writing / Get started — each row is a 200px label + 1fr description + accent arrow grid; hover tints `color-mix(in oklab, var(--accent) 4%, transparent)`. Collapses to single column < 540 px.

**Rules.**

- 404 is intentionally crawlable (no `noindex`) so search engines see the soft-404 signal correctly.
- Recovery-link list is hand-curated — not derived from sitemap — so 404s prioritize the canonical conversion path (Platform → Standards → Writing → Get-started) instead of every route alphabetically.

**A11y.**

- `<ul role="list">` for the recovery links so screen readers announce as a list.
- `:focus-visible` outline 2px `var(--accent)` with 2px offset on each link.
- Forced-colors override: hover tint resolves to `Canvas`, focus outline to `Highlight`.

**Status: shipped.** USMR Phase 5.5.14 — `src/pages/404.astro`.

---

## 7 · Do's and Don'ts

These rules apply site-wide. Component-specific do's/don'ts appear in the relevant §6 component entries.

### 7.1 Writing and voice

**Do**

- Use active voice, present tense: "Artagon verifies…" not "Identity is verified by…".
- Be specific: "IAL2 → IAL3 step-up in 180ms" beats "fast, secure, seamless".
- Cite at least one concrete number (latency, IAL level, RFC number) per page.
- Use sentence case for nav labels, buttons, and body copy.
- Use the full positioning triad on the home page; single clauses as section eyebrows.
- Use `<StandardChip>` every time a standard (FIDO2, W3C VCs, etc.) is mentioned.

**Don't**

- Use marketing adverbs: _truly, simply, easily, seamlessly, revolutionary, next-generation_.
- Use these phrases: "Unified platform for the modern enterprise", "AI-native", "AI-first", "Zero-trust" as a noun, "Passwordless" without context.
- Paraphrase the positioning line — use it verbatim or omit it.

#### Serif italic emphasis in MDX frontmatter (5.5.5+)

**Do**

- Wrap a single word in `*marker*` to emit fraunces serif italic. Pattern: `headline: "Build with the *next* generation of identity."` — the page renderer splits on the asterisks and emits `<em class="serif">next</em>` for odd-index segments. Mirrors the eyebrow ampersand-split convention from 5.1j.
- Reserve emphasis for one word per heading. Multi-word emphasis is canonical only on the home hero (`.glow-amp` for `&`).

**Don't**

- Author raw HTML inside frontmatter strings (`headline: "...<em>next</em>..."`). The renderer rejects it; YAML doesn't escape it; SEO meta-tags duplicate the markup.
- Mix the marker pattern with the `&`-split eyebrow pattern in the same string — readers expect one emphasis style per field.

### 7.2 Links and external resources

**Do**

- Always pair `rel="noopener noreferrer"` with `target="_blank"` on external links.
- Link standards through the planned `STANDARDS` registry (lands with `update-site-marketing-redesign` per the `site-standards-registry` capability). Until that change archives, link standards inline; once the registry exists, references should resolve through it for curation + versioning.

**Don't**

- Use `rel="noreferrer"` alone (it also strips the `Referer` header but omitting `noopener` leaves a security gap in older browsers).
- Hand-roll pill styles for standards — use `<StandardChip>` or `<StandardsRow>`.

### 7.3 Visual and aesthetic

**Do**

- Use shadows only for: dropdowns, the Tweaks panel, and the accent glow on interactive elements.
- Keep one accent per page. The accent carries signal; everything else is neutral.
- Use real post metadata in the Writing widget. Mock copy is forbidden.

**Don't**

- Use shadows to imply elevation — this is a flat, typographic aesthetic.
- Use more than one accent on a page.
- Place two primary buttons adjacent to each other.
- Use `body { transform: scale() }` for responsive — it breaks text and hit targets.

---

## 8 · Motion

### 8.1 Timing

| Token  | Value    | Role                            |
| ------ | -------- | ------------------------------- |
| Micro  | 180ms    | Hover, focus, small transitions |
| Short  | 220ms    | Card lift, chip press           |
| Medium | 500ms    | Stage transitions, reveals      |
| Long   | 5.2–7.0s | Breath / halo / shimmer loops   |

Easing: `cubic-bezier(.2,.6,.2,1)` for UI; `ease-in-out` for loops; `linear`
for spinners only.

### 8.2 Motion principles

1. **Motion is informational, not decorative.** The trust chain animates
   because the order matters. The eyebrow glow breathes because it's the
   product's signature. Nothing else animates unless it helps the user.
2. **Reduced motion is first-class.** Every `@keyframes` block has a
   `@media (prefers-reduced-motion: reduce)` counterpart that disables or
   freezes it. Test with the toggle on.
3. **No parallax.** No scroll-hijacking. No scroll-triggered animations that
   block reading.

---

## 9 · Patterns

### 9.1 Page structure

Every long-form page follows this skeleton:

```
Nav
  Hero                    (eyebrow · headline · lead · CTAs · hero artefact)
  §01 …                   (numbered sections, 120px rhythm)
  §02 …
  §N  Related reading     (links to 2-3 adjacent pages)
  CTA band                (single primary action)
Footer
```

Section count: **5–8 per page**. Fewer feels thin; more is a sign the page should split.

### 9.2 Responsive

**Strategy: real reflow.** No global `transform: scale()`, no zoom hacks, no
fixed-width body. Every page reflows at each breakpoint via media queries.
The earlier scale-fit shim is removed.

#### Breakpoints

| Name    | Width       | Behavior                                                                                                        |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Mobile  | 0–719px     | Single column. Hamburger nav. Trust chain becomes a static `<ol>`. Explore grid is 1-up. Buttons are 48px tall. |
| Tablet  | 720–1023px  | 2-up grids. Nav links may collapse if cramped. Section rhythm tightens to 88px.                                 |
| Desktop | 1024–1439px | Full layout. 120px section rhythm.                                                                              |
| Wide    | 1440px+     | Content stays at 1240px max. Extra space becomes gutter.                                                        |

Token names: `--bp-sm: 480`, `--bp-md: 720`, `--bp-lg: 1024`. Container-query
boundaries inside primitives (e.g. `TwoCol` at 640px) are _internal_ and
deliberately don't match the global breakpoints.

#### Required behavior at each breakpoint

| Element        | < 720px                                                                | 720–1023px                         | ≥ 1024px                           |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------- | ---------------------------------- |
| Nav            | Hamburger overlay, 18px links                                          | Inline links (may wrap)            | Inline links + CTAs                |
| Hero           | Headline `clamp(40px,9vw,64px)`, single column, full-width primary CTA | 2-col reflows to 1-col below 1024  | 1.1fr 0.9fr split                  |
| Trust chain    | Static vertical `<ol>`; animation off                                  | Horizontal, 5 stages, animation on | Horizontal, 5 stages, animation on |
| Explore grid   | 1-up                                                                   | 2-up                               | 4-up                               |
| Footer         | Single column                                                          | 2-up                               | 1.4fr + 4×1fr                      |
| Buttons        | Min 48px tap area, primary fills width                                 | 40px (primary)                     | 40px                               |
| Body type      | 16px / 1.55                                                            | 16px / 1.55                        | 16px / 1.55                        |
| Section rhythm | 64px                                                                   | 88px                               | 120px                              |

#### Forbidden

- `body { transform: scale() }` — text becomes unreadable, hit targets shrink.
- Horizontal scroll on the page (only inside code blocks and overflow tables).
- Tap targets smaller than 44×44 (WCAG 2.2 SC 2.5.8 Target Size Minimum).
- Hiding nav under `display: none` without a discoverable replacement.

### 9.3 Empty & error states

Every data surface (roadmap list, blog index, standards page) must render a designed empty state — never blank div, never "No results.". Minimum: an illustration-free mono message + a suggested next action.

### 9.4 External links

External links use `rel="noopener noreferrer"` (both, always) and `target="_blank"`. Standards chips and footer GitHub link comply; verify via automated lint.

### 9.5 Opengraph & metadata

- `<title>` format: `{Page Title} — Artagon` (home: just `Artagon`)
- `<meta name="description">`: 150–160 chars, includes the positioning line or a paraphrase
- OG image: 1200×630, dark theme, eyebrow + headline only, Space Grotesk display
- Canonical URL set on every page

---

## 10 · Content model

Copy lives in Astro content collections. Editorial surfaces — the home, pillar pages, use-case pages, blog posts — are MDX files under `src/content/pages/` and `src/content/posts/`.

**Authoring rules.**

- Frontmatter: `title`, `description`, `eyebrow`, `accent` (optional override), `status` (`draft` | `published`).
- Body: MDX with imported components (`<StandardChip>`, `<TrustChain>`, etc.).
- No inline styles. No ad-hoc colors. Use tokens.

**Editorial review checklist.**

- [ ] Headline is specific (no "modern, secure, scalable")
- [ ] At least one concrete number (latency, IAL level, RFC number)
- [ ] At least one `<StandardChip>` if standards are mentioned
- [ ] Positioning line appears or is intentionally omitted
- [ ] All external links use `rel="noopener noreferrer"`
- [ ] Passes axe-core at AA
- [ ] Reads correctly with animations disabled

---

## 11 · Accessibility

### 11.1 Floor

WCAG 2.2 AA across every page. No exceptions for marketing surfaces.

### 11.2 Contrast targets

- Body text on `--bg`: ≥ 7.0:1 (AAA)
- Secondary text on `--bg`: ≥ 4.5:1 (AA)
- UI borders: ≥ 3.0:1
- Accent on `--bg-1`: ≥ 4.5:1 (verified in both themes)

### 11.3 Keyboard

Every interactive element reachable via Tab in source order. Focus rings are 2px solid `--accent` with 2px offset. No custom outline removal without a replacement.

### 11.4 Reduced motion

All of: `.glow-tag`, chain-spinner, shimmer, breathe, halo, ping are disabled under `prefers-reduced-motion: reduce`. The trust chain renders statically with the current scenario visible.

### 11.5 Screen readers

- Eyebrows use real text, not decorative ASCII.
- The trust chain uses `aria-live="polite"` for scenario transitions.
- Icon-only buttons have `aria-label`.
- Landmark regions (`<header>`, `<main>`, `<nav>`, `<footer>`) on every page.

### 11.6 Tap targets (WCAG 2.5.5 / 2.5.8)

- **Minimum**: 44 × 44 CSS px hit area for every interactive control. Visible target may be smaller — invisible padding extends the hit area (e.g. trust-chain scenario dots are 9 × 9 px visually with 44 × 44 px parent button).
- Implementation pattern: outer `<button>` with `padding`, inner `::before` pseudo-element renders the visible dot.
- Consumed by: scenario picker (`.trust-chain__scenario-dot`), site-nav `.btn` CTAs, footer link list (single-line per row), theme toggle.

### 11.7 Forced colors mode

`@media (forced-colors: active)` mappings ship globally in `public/assets/theme.css`:

| Token             | System color |
| ----------------- | ------------ |
| `--bg` / `--bg-1` | `Canvas`     |
| `--fg*`           | `CanvasText` |
| `--accent`        | `Highlight`  |
| `--ok`            | `Highlight`  |
| `--bad`/`--warn`  | `Mark`       |
| `--line`          | `CanvasText` |

All decorative `box-shadow` declarations and keyframe animations halt under forced-colors; component-scoped overrides (`TrustChainIsland.css`) handle composition-specific cases (pass border = `Highlight`, fail border = `Mark`).

### 11.8 Touch tap-toggle

Hover-only affordances are mirrored to a touch-friendly press state. Trust-chain stage rows expose `aria-pressed` toggled on tap (`pressedIdx` state in `<TrustChainIsland>`). Decision-claim resolution priority: pressed > hovered > scenario.finalClaim. Same affordance reaches keyboard users via `Enter` / `Space` on a focused row.

### 11.9 Focus indicators

Site-wide rule in `public/assets/theme.css`: every `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `<summary>`, and `[tabindex]:not([tabindex="-1"])` gains `outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px` on `:focus-visible`. Forced-colors mode swaps the outline to `Highlight`. Component-scoped overrides may tighten the outline (e.g. `.trust-chain__scenario-dot` uses 6 px radius to match the dot's rounding).

### 11.10 Automated CI gate

[`tests/home-axe.spec.ts`](./tests/home-axe.spec.ts) runs `@axe-core/playwright` with WCAG 2.1 A + AA tags on chromium / webkit / Mobile Safari. Mandatory since 5.1p.8 (no env-var opt-in). Future regressions block merge.

---

## 12 · Performance

| Metric     | Target                  | Rationale                                                          |
| ---------- | ----------------------- | ------------------------------------------------------------------ |
| LCP        | < 2.0s (p75, 4G)        | Hero text + display face                                           |
| CLS        | < 0.05                  | Fluid type + font-swap risk mitigated by `size-adjust` and preload |
| INP        | < 200ms                 | Minimal JS; chain is isolated                                      |
| JS shipped | < 30KB gzipped per page | Astro islands only                                                 |

**Rules.**

- Preload the hero display font only.
- `font-display: swap` with `size-adjust` tuned per family.
- No 3rd-party fonts from Google Fonts CDN in production — self-host.
- One web component per page maximum (`<deck-stage>` is the only one used, in prototypes).

---

## 13 · Governance

### 13.1 Change process

Design changes follow OpenSpec:

1. Open `openspec/changes/<change-id>/proposal.md` with rationale.
2. Include deltas for affected specs (`site-content`, `site-navigation`, `site-design-system`, `site-standards-registry`, `site-bridge-story`, `style-system`).
3. Update DESIGN.md in the same PR if the change touches brand, voice, or primitives.
4. Ship; archive proposal.

### 13.2 Review gates

A PR cannot merge without:

- [ ] axe-core passes on changed pages
- [ ] Lighthouse ≥ 95 on Performance, Accessibility, Best Practices
- [ ] No new external link missing `rel="noopener noreferrer"`
- [ ] DESIGN.md updated if any §2 foundation or §6 component changed
- [ ] Screenshots at 360px, 768px, 1440px attached to the PR

### 13.3 What this document is not

- Not a code style guide (see `AGENTS.md`, `CONTRIBUTING.md`)
- Not a component API reference (see JSDoc in source)
- Not a brand guide for print / video / merch (out of scope)

---

## 14 · Open questions

1. **UI icon library.** Distinct from the brand mark (§6.14). The site still has no UI icon set for product nav, dashboard, or docs sidebar. Propose: adopt **Lucide** at AA minimum with a 16/20/24 size scale, and override only where Lucide has no semantic equivalent (e.g. `dpop`, `passkey`). **Needs decision.**
2. **Illustration strategy.** The site uses zero illustration today. If/when we need them, what's the style? Proposal: technical diagrams only (like the trust chain), no character illustrations. **Needs direction.**
3. **Docs design system.** The docs shell is out of scope. It should inherit tokens but can diverge on density, nav, and code block treatments. **Separate DESIGN.md.**
4. **PNG export pipeline for icon variants.** §6.14 documents the variants but the SVG→PNG→ICO pipeline is not codified. Propose: a `scripts/export-icons.mjs` (Sharp + sharp-ico) that consumes `brand-icons.html`'s source SVGs and writes `public/favicon.ico`, `public/apple-touch-icon.png`, `public/og-default.png`. **Needs scope.**

---

## 15 · Changelog

### 2026-05-01

- **§6.5 Trust chain — explain prop added.** New opt-in `<TrustChain explain>`
  attribute layers an explanatory tooltip over each stage. Off by default
  everywhere; turned on for the public hero and `/how`. Behaviour spec lives
  in §6.13.
- **§6.13 TrustChain tooltip** added. Hover/tap/keyboard tooltip primitive
  with what+why+standard content, smart side-flip positioning, mobile bottom
  sheet, locked-open vs hover-open states, Esc/outside-click dismiss.
  Reference prototype: `trust-chain-tooltips.html`.
- **§6.14 Brand icon system** added. Enumerates every variant of the Artagon
  glyph: 3 avatars, 4 favicons, 2 OG cards, monochrome, 3 wordmark lockups,
  2 remix concepts. Sizing, colour, and a11y rules. Reference gallery:
  `brand-icons.html`. Resolves §14 question 1's brand-mark half; question 1
  rewritten to scope the remaining UI-icon decision.
- **§9.2 Responsive — Strategy A locked.** Mobile reflow committed: scale-fit
  shim removed from `index.html`; inline `gridTemplateColumns` swapped for
  `grid-*` utility classes; hamburger nav added at `< 720px`; trust chain,
  explore grid, footer, hero, writing variants all reflow via media queries.
- **§6.12 Long-form reader** added. Articles and docs are sourced from a
  separate GitHub repo as Markdown/MDX, build-time only. Defines code-block
  rendering (Shiki), diagram pipeline (Mermaid → SVG, D2 → SVG, hand SVG),
  and frontmatter contract.

### 2026-04-30

- **Added §6.11 Writing widget.** Six placements (`in-hero`, `A · strip`, `B · 3-up` _(default)_, `C · split`, `D · ticker`, `off`) wired through the Tweaks panel. Shipped USMR 5.5.16-pt108/pt109/pt110. Replaces the earlier ad-hoc "Latest writing" mention. **Default changed**: pre-shipping the canonical default was `h1` (in-hero); shipping default is `B · 3-up` because the canonical user feedback showed the 3-up cards on the home page reference; in-hero remains a one-click toggle in the Tweaks panel.
- **Open question.** Mobile reflow strategy: the current build uses `body { transform: scale() }` to fit narrow viewports, which §9.2 forbids. Tracked separately in `explorations/Mobile Optimization.html`. _(Resolved 2026-05-01 — see above.)_

---

_Maintained by the Artagon design working group. Changes require a PR against
`main` and at least one design-team approval._
