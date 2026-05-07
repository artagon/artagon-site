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

### 3.3 Tracking rules

- **Display** (h1/h2): negative tracking (-0.025 to -0.035em) for optical balance at large sizes.
- **Mono UPPERCASE**: positive tracking (+0.12 to +0.26em). Mono is too tight otherwise.
- **Body**: default (0).
- **Serif italic accents**: default (0). Fraunces is already optically loose.

### 3.4 Hero display override

Users can swap the display face via `[data-hero-font]`:
`grotesk` (default) · `fraunces` · `dmserif` · `mono`.
The override adjusts tracking and weight per family — see `public/assets/theme.css` (the `[data-hero-font="..."]` rules near the file end). Earlier drafts of this section pointed at `src/styles/global.css`, which is not a file in this project; corrected in USMR Phase 5.1p.16.

---

## 4 · Layout

The layout system is built on an 8-point spacing grid with a fixed max-width container and density variants. Spacing tokens and section rhythm are defined here; responsive breakpoints are in §8.2.

**8-point grid.** All spacing tokens are multiples of 4px (half-steps allowed
for inline elements only). Section rhythm: **120px top/bottom**. Card padding:
**24–32px**. Gutter: **32px** desktop, **20px** dense, **44px** roomy (via
`[data-density]`).

`.wrap` caps content at `--maxw: 1240px`. Never nest `.wrap` inside `.wrap`.

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

**Anatomy.** Wordmark (left) · link row · right cluster (GitHub icon, Playground, Request access).

**Links (top nav):** Platform · Use cases · Standards · Writing.
**Deliberately excluded:** Bridge (absorbed into Platform), Roadmap (footer only), GitHub (icon-button, right).

**Tokens.** `--bg` (72% w/ backdrop blur) · `--line-soft` · `--fg-1` · `--accent` (active underline).

**A11y.** Skip-to-content link first in tab order. `aria-current="page"` on active link. Focus rings visible in both themes.

**Do** use sentence case for link labels.
**Don't** add a seventh top-level link without deleting one — the ceiling is 5 text links + 1 icon + 2 CTAs.

### 6.2 Footer

**Purpose.** Sitemap + legal + trust signals.

**Anatomy.** Brand column (wordmark + positioning line) · 4 link columns (Platform · Developers · Company · Legal) · meta strip (copyright · stack credit · version).

**Rules.**

- Copyright format: `© {YEAR} Artagon, Inc. — Philadelphia, PA`.
- Version string format: `v{semver} — build {7-char git sha}`.
- "Built on Astro · Open-source core · Apache 2.0" is the stack credit line. Do not edit.

### 6.3 Glow-tag (eyebrow)

**Purpose.** The site's signature micro-element. Appears above the hero and at select section breaks. Communicates "this is alive, this is premium" without a single gradient blob.

**Anatomy.** Pill · animated conic border · glow dot · shimmer text · optional Fraunces italic amp.

**Tokens.** `--accent` (drives `--g-accent`) · `--bg-1` / `--bg` (gradient fill) · backdrop-blur.

**A11y.** All animations disabled under `prefers-reduced-motion`. Text contrast verified on both themes.

**Do** use for the positioning line, section breakpoints, and "new" announcements.
**Don't** use more than one per viewport. Don't stack two glow-tags.

### 6.4 Standards chip

**Purpose.** Clickable pill linking to a canonical spec document. Always opens in a new tab with `rel="noopener noreferrer"` (never `noreferrer` alone).

**Anatomy.** Dot · label. Two sizes: `sm` (11px) · `md` (12px).

**Registry (planned).** A `STANDARDS` array — single source of truth for the seven canonical entries below — will land in `src/data/standards.ts` (or equivalent) when the `update-site-marketing-redesign` change applies its `site-standards-registry` capability. Until then, references to specific standards are scattered in MDX prose; the redesign change consolidates them. Canonical entries:
IETF GNAP · OpenID OID4VC · FIDO2 · W3C DIDs · W3C VCs · NIST 800-63 · eIDAS 2.

**Hover.** Accent border + accent-tinted background + soft glow + 1px lift.

**Do** use `<StandardChip>` / `<StandardsRow>` everywhere a standard is mentioned — hero, standards page, footer, blog posts.
**Don't** hand-roll pill styles. Don't link to a standard without going through the registry (the URL will drift).

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
- Plays once on first mount only. Subsequent scenario changes (click / keyboard nav) settle the chain immediately to the resolved state — users who actively pick a scenario want the result, not a re-animation.

**Keyboard navigation.** Stage rows are real `<button>` elements (USMR Phase 5.1p.1) so they appear in the tab order automatically. The scenario picker (`.trust-chain__scenarios`) follows the WAI-ARIA tablist pattern: `ArrowLeft` / `ArrowRight` walk between dots, `Home` / `End` jump to first / last. Click and keyboard paths converge on the same `setScenarioIdx` handler.

### 6.6 Explore grid

**Purpose.** Home page sub-navigation. 4-up card grid linking to the four top-level surfaces.

**Anatomy.** Numeric index (`01…04`) · title · description · `Go →` mono.

**Rules.** Always 4 cards, always in this order: Platform · Bridge · Use cases · Standards. Cards hover with a subtle accent tint and 2px lift.

**Status.** CSS primitives `.explore-grid` (responsive 4-up grid; collapses to 2-up < 720 px and 1-up < 480 px) and `.explore-card` (border + accent-tinted hover lift) are authored in `public/assets/theme.css` (USMR Phase 5.1q.5). The `<ExploreGrid>` Astro component sourcing `EXPLORE_CARDS` data is **Planned for Phase 5.x** — the home page does not yet render the section. Surfaces wanting the grid today can author it inline using the shipped classes.

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

### 6.9 Code block

Used in blog posts and the Structure Audit page. JetBrains Mono 13px, `--bg-1`, `--line-soft` border, 16px padding, 8px radius. Line numbers optional (mono, `--fg-3`). No syntax highlighting in marketing pages — it fights the editorial tone. Syntax highlighting is allowed on docs pages only.

### 6.10 Tweaks panel

**Purpose.** Hidden design QA surface. Toggleable panel in the bottom-right lets reviewers switch theme, accent, display font, density, background grid, and writing-widget placement without touching code.

**Not a user-facing feature.** The panel is off by default and only appears when the Tweaks mode is active. Do not link to it from the site.

### 6.11 Writing widget

**Purpose.** Surface the latest blog post(s) on the home page. Communicates editorial cadence ("we publish") without becoming a full blog index.

**Placements (Planned).** Controlled by `tweaks.writing`. The default is the in-hero strip; the others are larger sections that sit between Hero and Explore. **Status: not yet shipped** — `Tweaks.astro` does not currently expose a `writing` placement control; the in-hero strip placement also pending (HeroLatestStrip placement gap is tracked in tasks.md).

| Key              | Variant                    | Where                            | Use when                                                        |
| ---------------- | -------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `h1` _(default)_ | Latest strip below CTAs    | Inside Hero, left column         | Always-on; lightest touch; doesn't compete with the trust chain |
| `a`              | Featured strip + 2-up rail | Section between Hero and Explore | Promoting a single major post                                   |
| `b`              | 3-up cards                 | Section                          | Showcasing recent cadence (3 most recent)                       |
| `c`              | Editorial split            | Section                          | Mixing one prominent post + recent list                         |
| `d`              | Dated ticker               | Section                          | Index-feeling, sticky title, dense rows                         |
| `off`            | Hidden                     | —                                | Pages where Writing is not the right CTA                        |

**Rules.**

- One placement per page. Do not combine `h1` with a section variant.
- Use real post metadata only. Mock copy is forbidden.
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

- **Added §6.11 Writing widget.** Five placements (`h1` in-hero default, `a/b/c/d` lower section, `off`) wired through the Tweaks panel. Replaces the earlier ad-hoc "Latest writing" mention.
- **Open question.** Mobile reflow strategy: the current build uses `body { transform: scale() }` to fit narrow viewports, which §9.2 forbids. Tracked separately in `explorations/Mobile Optimization.html`. _(Resolved 2026-05-01 — see above.)_

---

_Maintained by the Artagon design working group. Changes require a PR against
`main` and at least one design-team approval._
