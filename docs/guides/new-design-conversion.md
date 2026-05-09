# Guidance Prompt — New-Design → Astro Conversion (v3)

You are converting `new-design/extracted/` (React mocks + HTML pages) into the live Astro site at the repo root. This document is the contract for that conversion.

> **Adversarial-review provenance:** Reviewed by 3 agents (Claude, Codex, Gemini). v3 incorporates findings from both the prompt review AND the new-design viability review. Trust the spec (`openspec/changes/update-site-marketing-redesign/`) over this prompt where they disagree.

## Recommended FIRST PR (low-risk, no RSA dependency)

Convert ONE blog mock (`new-design/extracted/src/pages/post-trust-chain.html`) into a `/writing` content collection entry + Astro route, using the EXISTING layout and NO new global tokens. This:

- Proves the content-extraction pattern.
- Proves the routing pattern.
- Doesn't touch `theme.css` (so doesn't depend on RSA archive).
- Surfaces CSP blockers early (CDN font/script loads will fail).
- Validates Playwright + a11y test loop.

If this PR doesn't merge cleanly, the conversion plan needs revision before any larger work.

## CSP runtime blocker (must resolve before any visual page conversion)

**New-design HTML mocks load:**

- `unpkg.com` React/Babel CDN (3 `<script src=...>` tags at
  `new-design/extracted/src/pages/index.html:429-431` —
  React, react-dom, @babel/standalone)
- Google Fonts CDN (preconnect pair near
  `new-design/extracted/src/pages/index.html:9-10` plus the
  stylesheet `<link>` immediately following)

**Live CSP** (in `scripts/csp.mjs`'s `buildPolicy()` — the
`script-src` directive is constructed inside the `directives`
object, current line offset varies as the function grows; the
contract has not changed) **allows ONLY:**

- `script-src 'self'` + page-specific hashes
- No `unpkg.com`, no `cdn.jsdelivr.net`

**Implication:** Copying mock HTML verbatim breaks runtime even if build passes.

**Fix path (per USMR Phase 2):** Self-host fonts under `public/assets/fonts/` (canonical path per `self-host-woff2-fonts/specs/font-self-hosting/`) and inline subsetted WOFF2. Translate React/JSX server-side at build time (Astro does this for `.astro` files automatically — but only if hooks are translated, see below).

## Mandatory skills + tools (install before starting)

This conversion depends on agent skills + a CLI tool from the design.md ecosystem.

### Install skills (once per machine, or when refreshing)

The `skills` CLI is the canonical installer. It writes skills to `.agents/skills/<name>/SKILL.md` and symlinks them into `.claude/skills/<name>` so Claude Code surfaces them alongside other project skills.

```bash
# Install all 4 skills from google-labs-code/design.md (publishes via .agents/skills directory)
for s in agent-dx-cli-scale ink tdd typed-service-contracts; do
  npx skills add google-labs-code/design.md --skill "$s" \
    -a claude-code -a codex -a gemini-cli -y
done

# Install design-md from stitch-skills (separate repo)
npx skills add google-labs-code/stitch-skills --skill design-md \
  -a claude-code -a codex -a gemini-cli -y
```

After install, the `skills` CLI writes `skills-lock.json` at the repo root with content-addressed hashes. Commit it.

To refresh from upstream: re-run the same command — the lockfile reconciles.

### Install the design.md CLI tool (npm)

```bash
npm install --save-dev @google/design.md
# Verify
npx design.md --version   # → 0.1.1+
npx design.md --help      # → lint | diff | export | spec
```

After install, add a lint script (or rely on the existing one if present):

```json
{
  "scripts": {
    "lint:design": "design.md lint DESIGN.md"
  }
}
```

### Mandatory skills — what to load when

| Skill                                          | When                                                                             | Why                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **`tdd`** (Red-Green-Refactor)                 | Every component conversion + every utility function + every data parser          | Test fails first → minimum code to pass → refactor under green. No "I'll write a test later."                  |
| **`typed-service-contracts`** (Spec & Handler) | Anything that parses external input (frontmatter, JSON, query strings, env vars) | Spec separate from handler. Parse don't validate. Errors as values via `Result<T, E>`. No raw `JSON.parse(x)`. |
| **`agent-dx-cli-scale`**                       | Adding/modifying npm scripts in `package.json`                                   | Score ≥18/21 on machine-readable output, predictable exit codes, idempotency, no interactive prompts.          |
| **`design-md`** (Stitch)                       | Synthesizing or modifying `DESIGN.md`; reconciling design tokens                 | Stitch's design-system synthesis protocol. Pairs with `npx design.md lint`.                                    |
| **`ink`**                                      | Never (this conversion)                                                          | Terminal UI skill. N/A for web.                                                                                |

To load a skill in Claude Code: invoke the `Skill` tool with the skill name (e.g. `tdd`). To load in Codex/Gemini CLI: read the `SKILL.md` file directly into the session prompt.

### Tool integration — `@google/design.md` CLI

| Command                                            | Purpose                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npx design.md lint DESIGN.md`                     | Validate the design contract. Run after every DESIGN.md edit; commit only if 0 errors. Warnings about unreferenced tokens are expected. |
| `npx design.md diff <old> <new>`                   | Compare two DESIGN.md versions. Use during token migration.                                                                             |
| `npx design.md export DESIGN.md --format dtcg`     | Emit DTCG-compliant token JSON. Pipe to `tools/dtcg-validate` if downstream consumers exist.                                            |
| `npx design.md export DESIGN.md --format tailwind` | Emit Tailwind config snippet. NOTE: project does NOT use Tailwind by design; export is for downstream consumers only.                   |
| `npx design.md spec`                               | Print the canonical DESIGN.md format spec. Use as a reference, not a re-implementation guide.                                           |

### Authority order

1. **User instructions** (CLAUDE.md, AGENTS.md, direct request) — highest
2. **Skills** (loaded above) — override default agent behavior for their domain
3. **DESIGN.md** + `openspec/specs/*` — project facts and contracts
4. **This guidance prompt** — project-specific facts (file paths, class names, build commands)
5. **Default behavior** — lowest

If a skill conflicts with this guidance prompt, the skill wins for its domain (TDD process, contract design, CLI design); this guidance wins for project-specific facts.

## Source of truth (precedence order)

1. `openspec/specs/*` — live specs (highest authority for requirements)
2. `openspec/changes/update-site-marketing-redesign/` (USMR — task count + ralph-loop narrative log grew substantially through Phase 5.x and the 5.5.16-loop deep-audit pass; the file is now in the ~500-line range and grows by ~1 narrative entry per pt-iter. For the live count run `wc -l openspec/changes/update-site-marketing-redesign/tasks.md` and `grep -c '^\s*- \[' openspec/changes/update-site-marketing-redesign/tasks.md` for the task-checkbox count) — the change you're implementing
3. `new-design/extracted/DESIGN.md` (39KB) — visual + content intent. The repo-rooted `DESIGN.md` (per `openspec/specs/design-system-format`) is the canonical visual identity contract; the new-design copy is FROZEN reference material. Where the two disagree, the spec wins and the repo-rooted DESIGN.md is updated in the same change (per the precedence chain in `openspec/project.md` and `AGENTS.md`).
4. `new-design/extracted/MIGRATION.md` — historical migration notes. **STALE — do not follow as roadmap.** Use only as visual reference.
5. This guidance prompt.

## React-based design source — `new-design/extracted/`

The new design ships as a React + HTML mock staging area. You are converting these into Astro. **Do NOT modify files inside `new-design/extracted/`** — it is frozen reference material. Read only.

### Source layout

| Path                                                     | What                                                                                                                                    | Conversion target                                                                                                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new-design/extracted/DESIGN.md`                         | 39KB design spec (intent, tokens, components, voice)                                                                                    | Read only. Run `npx design.md lint` against it for warnings.                                                                                                                                                           |
| `new-design/extracted/MIGRATION.md`                      | Historical migration notes                                                                                                              | Read only. STALE — many claims about postbuild/scripts/assets are wrong. Use only as visual reference.                                                                                                                 |
| `new-design/extracted/src/components/*.jsx` (8 files)    | React components: `Hero.jsx`, `Pillars.jsx`, `Bridge.jsx`, `UseCases.jsx`, `Standards.jsx`, `Roadmap.jsx`, `HomeExplore.jsx`, `Cta.jsx` | `.astro` components under `src/components/` (post-Phase 5). Each has hooks — see "React interactivity — guidance" below for the decision tree (CSS-only → vanilla script → React island).                              |
| `new-design/extracted/src/layouts/BaseLayout.jsx`        | React layout (Nav, Footer, GLOSSARY, ArtagonGlyph host)                                                                                 | Merge content INTO existing `src/layouts/BaseLayout.astro` and `src/components/{Header,Footer}.astro`. Do NOT replace BaseLayout wholesale (preserve theme persistence script, slots — see BaseLayout contract below). |
| `new-design/extracted/src/pages/*.html` (16 files)       | HTML mocks with inlined `<script type="text/babel">` React                                                                              | Replace content of `src/pages/<route>/index.astro` per the route map below. Some have NO live counterpart — discard or defer per USMR.                                                                                 |
| `new-design/extracted/src/styles/tokens.css` (82 lines)  | OKLCH design tokens, fonts, base elements                                                                                               | Sed-rename to `--nd-*` prefix, append to `public/assets/theme.css` under a `/* ===== NEW-DESIGN TOKENS (OKLCH) ===== */` section. See "CSS token namespace collision" below.                                           |
| `new-design/extracted/src/styles/global.css` (307 lines) | Component styles                                                                                                                        | Per-class merge into `public/assets/theme.css`; preserve live classes by default.                                                                                                                                      |
| `new-design/extracted/src/data/roadmap.ts`               | Typed roadmap data                                                                                                                      | Diff against existing `src/data/roadmap.ts` and merge the new shape. Don't overwrite.                                                                                                                                  |
| `new-design/extracted/public/assets/`                    | Brand assets                                                                                                                            | Defer to `add-brand-assets-and-writing-pipeline` change for SVG generation.                                                                                                                                            |
| `new-design/extracted/screenshots/`                      | 2 reference screenshots (`home-nav.png`, `platform.png`)                                                                                | Visual oracle for those 2 routes only. For other routes that have a corresponding `new-design/extracted/src/pages/<name>.html` mock, render the mock in a browser as the visual oracle.                                |
| `new-design/extracted/openspec/`                         | DRAFT openspec changes — superseded by repo `openspec/`.                                                                                | Read only. Do NOT adopt. Live `openspec/` wins.                                                                                                                                                                        |

### Hook locations (from round-2 codex audit)

These React components contain hooks that DO NOT translate directly to Astro static-mode rendering:

| File              | Line | Hook                                  | Astro alternative                                                         |
| ----------------- | ---- | ------------------------------------- | ------------------------------------------------------------------------- |
| `Hero.jsx`        | 77   | `useState`/`useEffect` (animation)    | CSS `@keyframes` + `animation-delay`                                      |
| `Pillars.jsx`     | 82   | `useState` (tab state)                | `<input type="radio">` + `:checked` siblings (already used in `/roadmap`) |
| `Bridge.jsx`      | 8    | `useState` + `setInterval` (carousel) | CSS `@keyframes` cycling, OR `<input type="radio">` w/ JS-set `checked`   |
| `UseCases.jsx`    | 70   | `useState` (selector)                 | `<input type="radio">` + `:checked` siblings, OR `<details>`              |
| `Standards.jsx`   | —    | hardcoded registry                    | Use typed `src/data/standards.ts` registry per USMR Phase 6               |
| `Roadmap.jsx`     | 7    | hardcoded phases                      | Use typed `src/data/roadmap.ts` (already exists)                          |
| `HomeExplore.jsx` | 7    | mostly static                         | Direct JSX → Astro template                                               |
| `Cta.jsx`         | 7    | static markup                         | Direct JSX → Astro template                                               |

**See "React interactivity — guidance" below.** React islands are permitted; choose the cheapest pattern that satisfies the requirement.

## Live site state — DO NOT BREAK

### Build + tooling

- Astro 6 (per `package.json` `"astro": "6.2.1"`), build via `npm run build` (NOT bun — `package-lock.json` is canonical).
- `@google/design.md@0.1.1` installed — use `npx design.md lint DESIGN.md` after any DESIGN.md edit.

### CSS budgets

The pre-USMR snapshot (verified 2026-05-04) recorded
`public/assets/theme.css` at **28.8KB raw / 5.94KB gz** with a budget
of ≤35KB raw / ≤7KB gz. That snapshot is no longer the authoritative
budget — the file grew with USMR Phase 5.x token additions (current
size: run `wc -c public/assets/theme.css`), and the budget tracking
model itself shifted from a single global stylesheet to per-route /
per-component scoped styles. The pre-USMR `public/assets/roadmap.css`
(4.27KB raw, loaded only on `/roadmap` via the `head` slot) was
absorbed into `src/components/RoadmapTimeline.astro` scoped styles
during the 5.7 redesign as part of that shift.

No active gate enforces a global `theme.css` budget today. ANY
component conversion that pushes per-page CSS visibly over the
historic budget should still be flagged in review and either REVERTED
or SPLIT — but the threshold is now contextual, not a fixed number
in this guide.

### Live route map

Pre-USMR-Phase-5.x the live route count was 16 (this section was originally
labeled "verified 16 routes"). Post-USMR Phase 5.x the count grew to 22
unique route patterns (the `/writing/[slug]` dynamic expands to 3
instantiations on disk; see `openspec/project.md` for the authoritative
list). The conversion-target rows below preserve the original route↔mock
mapping for the routes that fell within the conversion scope; the
post-USMR additions (`/use-cases`, `/standards`, `/writing/[slug]`,
`/writing/feed.xml`, `/bridge`) are summarized in the next subsection
with their shipped status.

| Route          | File                                | Pattern | New-design source                           | Status                  |
| -------------- | ----------------------------------- | ------- | ------------------------------------------- | ----------------------- |
| `/`            | `src/pages/index.astro`             | flat    | `new-design/extracted/src/pages/index.html` | Convert                 |
| `/404`         | `src/pages/404.astro`               | flat    | none                                        | Keep, add visual polish |
| `/console`     | `src/pages/console/index.astro`     | nested  | none                                        | Keep, no change         |
| `/developers`  | `src/pages/developers/index.astro`  | nested  | none                                        | Keep, no change         |
| `/docs`        | `src/pages/docs/index.astro`        | nested  | none                                        | Keep, no change         |
| `/faq`         | `src/pages/faq/index.astro`         | nested  | none                                        | Keep, no change         |
| `/get-started` | `src/pages/get-started/index.astro` | nested  | none                                        | Keep, no change         |
| `/how`         | `src/pages/how/index.astro`         | nested  | none                                        | Keep, no change         |
| `/platform`    | `src/pages/platform/index.astro`    | nested  | `platform.html`                             | Convert                 |
| `/play`        | `src/pages/play/index.astro`        | nested  | none                                        | Keep, no change         |
| `/privacy`     | `src/pages/privacy/index.astro`     | nested  | none                                        | Keep, no change         |
| `/roadmap`     | `src/pages/roadmap/index.astro`     | nested  | `roadmap.html`                              | Convert                 |
| `/search`      | `src/pages/search/index.astro`      | nested  | none                                        | Keep, no change         |
| `/security`    | `src/pages/security/index.astro`    | nested  | none                                        | Keep, no change         |
| `/status`      | `src/pages/status/index.astro`      | nested  | none                                        | Keep, no change         |
| `/vision`      | `src/pages/vision/index.astro`      | nested  | none (uses `src/content/pages/vision.mdx`)  | Keep, no change         |

### New routes USMR added (shipped status)

The pre-pt241 instruction "do NOT create until USMR Phase 5 explicitly
says so" is no longer load-bearing — USMR Phase 5.x has shipped or
discarded each of these routes. Current status:

- `/use-cases` — **SHIPPED** in Phase 5.3 (sourced from `new-design/extracted/src/pages/use-cases.html`).
- `/standards` — **SHIPPED** in Phase 5.4 (sourced from `new-design/extracted/src/pages/standards.html`; data registry at `src/data/standards.ts`).
- `/writing/[slug]` — **SHIPPED** in Phase 5.x (3 dynamic posts: welcome / bridge-strategy / compounding-trust-chain).
- `/writing/feed.xml` — **SHIPPED** in Phase 5.x (RSS feed; auto-discovery wiring landed in pt197).
- `/bridge` — **SHIPPED** as a real route (the pre-pt241 "USMR does NOT create — discard" instruction was reversed in Phase 5.2.8 when `/bridge` got its own dedicated landing).
- `/blog` — **DISCARDED** as planned (superseded by `/writing/[slug]`).
- `/brand-icons` — **DEFERRED** to `add-brand-assets-and-writing-pipeline` change as planned.

### BaseLayout.astro contract

`src/layouts/BaseLayout.astro` (current size: run `wc -l src/layouts/
BaseLayout.astro` — pre-USMR snapshot was 65 lines; the file grew
through Phase 5.x additions including the canonical webfonts loader
and the `[data-theme-toggle]` sync hook, current size ~142 lines as
of pt243). Read the file directly for current line numbers — what
follows is the LOGICAL structure, stable across versions:

- `<meta>` charset/viewport, `<Seo>`, `<SeoIcons>` block.
- **Pre-paint theme persistence `<script is:inline>` block.** DO NOT
  touch. This must execute before paint to avoid theme flash.
- Webfonts loader (Google Fonts preconnect pair + 6-family stylesheet
  link), site-wide `<link rel="stylesheet" href="/assets/theme.css">`,
  named slots: `head` (per-page CSS injection), `json-ld`,
  `indexation`, `branding`.
- Legacy menu/script blocks (most retired in pt85; the surviving
  `__setTheme` global helper synchronizes `aria-pressed` on every
  `[data-theme-toggle]` button).
- `<body>`: `<SkipLink>`, `<slot name="header">` (header injection),
  `<main id="main-content">` + default `<slot />` (page content),
  `<slot name="footer">` (footer injection), dev-only
  `<ThemePreview>` + `<Tweaks />` panels.

To merge new-design's `BaseLayout.jsx` content (Nav, Footer, GLOSSARY, ArtagonGlyph):

- Nav → goes inside `<slot name="header" />` consumer (`<Header>` component) — already exists at `src/components/Header.astro`. Update IT, not BaseLayout.
- Footer → `<slot name="footer" />` consumer (`<Footer>`) — exists at `src/components/Footer.astro`. Update IT.
- GLOSSARY/ArtagonGlyph → new components under `src/components/`.

### Card.astro variant enum (verified)

`src/components/ui/Card.astro:21` — `variant: 'default' | 'domain' | 'pillar' | 'component' | 'product' | 'vision' | 'solid'`. ALL variants are LIVE. **NOTE:** `vision` variant has no matching `.ui-card--vision` CSS rule (pre-existing bug; do NOT fix in this conversion — file separate change).

## Critical constraints (consolidated from adversarial review)

### 1. RSA prerequisite gate

USMR depends on `refactor-styling-architecture` (RSA) being archive-
ready. **RSA archived 2026-05-04** to
`openspec/changes/archive/2026-05-04-refactor-styling-architecture/`.
The pre-USMR snapshot recorded RSA at "65/83 tasks complete" with
`scripts/verify-prerequisites.mjs` not yet authored — both
conditions have since resolved.

The script `npm run verify:prerequisites` is now live
(`scripts/verify-prerequisites.mjs` + npm script in `package.json`)
and runs as part of the postbuild chain. Run it directly:

```bash
npm run verify:prerequisites
```

USMR task 0.5 (the deliverable that authored this script) is closed.

### 2. CSS token namespace collision (verified)

Live `theme.css` has these tokens that new-design ALSO defines with different values:

- `--bg` (live: `#0a0f1e` / `#0b1220` / `#0e1026` / `#0a0e19` per theme; new: OKLCH `oklch(0.14 0.008 260)`)
- `--bg-alt` (live: hex per theme; new: not defined as `--bg-alt`)
- `--accent` (live: `#7c5cff`; new: `oklch(0.86 0.14 185)` per theme)

There ARE plain `:root {}` blocks in theme.css (current line numbers
shift with each token addition; run `grep -n '^:root' public/assets/
theme.css` for the live offsets). Tokens are also defined under
`:root[data-theme="midnight|twilight"]`. The pre-pt167 third theme
`slate` was retired (only twilight + midnight remain).

**Token rename contract (mandatory):**

1. Before merging new-design `tokens.css`, sed-rename ALL its tokens to `--nd-` prefix in a copy: `--bg` → `--nd-bg`, `--accent` → `--nd-accent`, `--fg` → `--nd-fg`, etc.
2. Append the renamed block to theme.css under a new comment `/* ===== NEW-DESIGN TOKENS (OKLCH) ===== */`.
3. Per-converted-page, alias old tokens via `:root[data-theme="midnight"] { --bg: var(--nd-bg); }` AFTER visual verification that the new color matches DESIGN.md intent.
4. Run `npm run build` after EACH alias. Verify the page in browser. Verify both shipped themes (twilight + midnight) still work — pre-pt167 there was a third `slate` theme; only twilight + midnight remain.
5. Do NOT merge new-design `--bg` directly into a plain `:root` — it would shadow themed variants.

### 3. React interactivity — guidance

This repo has **`@astrojs/react` installed** (per `package.json` —
the integration was added during USMR Phase 5.x for the
`TrustChainIsland` + `TweaksPanel` interactive surfaces). React
islands are PERMITTED for components that genuinely need state.
The Tweaks panel shipped initially as vanilla TS as an existence
proof; the React migration came later. The vanilla version is not
a precedent that bans React for everything.

**Forward-looking use cases that justify React islands:**

- `/play` — token issuance + VC presentation playground (live OIDC/GNAP/DPoP flows, multi-step state machines, response inspectors)
- `/console` — admin operations (forms with cross-field validation, optimistic updates, server-state caching)
- `/search` — typeahead/facet UI (debounced queries, results virtualization, keyboard navigation)
- Bridge SVG carousel (auto-cycling phases, gesture-driven scrubbing)
- Hero animation (live trust-chain decision visualization that the marketing site advertises)

These ship as React islands because rebuilding state machines + form validation + animation orchestration in vanilla DOM costs more in maintenance than the ~120KB shared React runtime. The marketing routes (`/`, `/platform`, `/vision`, `/roadmap`, etc.) STAY static — only interactive surfaces hydrate.

**Decision tree for any new-design React component**:

1. **Cheapest path first** — try CSS-only state (`:checked`/`:has()`/`:hover`/`:focus-within`/`:target`) or native HTML elements (`<details>`/`<dialog>`/`<input type="radio|checkbox">`/`popover` API). If it works, ship that.
2. **Vanilla `<script>` block** in an `.astro` component — Astro auto-bundles inline scripts. Good for one-off DOM glue. Pattern: see `src/components/Tweaks.astro` (custom element via Astro `<script is:inline>`) or `src/scripts/tweaks-state.ts` (pure logic).
3. **React island** — if the component has non-trivial state (e.g. carousel timing, multi-step form, focus-trap dialog), use a React island. Cost per island:
   - Deps already installed: `@astrojs/react` + `react` + `react-dom` + `@types/react` + `@types/react-dom` (per `package.json`; ~120KB minified+gzipped for the React runtime, shared across all islands)
   - `react()` is already in `astro.config.ts` integrations — no config edit needed for new islands
   - Each island re-runs CSP/SRI hash regen at build time — verify `scripts/csp.mjs` and `scripts/sri.mjs` postbuild succeed
   - Use `client:visible` (lazy hydration, IntersectionObserver-based) BEFORE `client:load` (eager) unless the island is above the fold
   - Document the cost in the conversion commit message — bundle delta and CSP changes
4. **Hybrid** — render the island statically with `client:only="react"` if SSR is impossible, OR render the static markup server-side and use `client:visible` for hydration. Prefer the hybrid because it ships visible content even if JS fails.

**One blocker remains**: Google Fonts. Per Phase 2.3, **self-host all WOFF2 fonts under `public/assets/fonts/`**. This removes `font-src` from CSP entirely (just `'self'`), eliminates the third-party hash chain, and makes SRI deterministic. Do NOT load fonts from `fonts.googleapis.com` or any CDN — that's the only externality this repo refuses.

### 4. CSS class collision resolution

Live theme.css already defines: `.btn`, `.card`, `.lead`, `.section`, `.container.narrow`, `.eyebrow`, `.badge`, `.brand`, `.nav`, `.cta`. New-design `global.css` redefines several of these.

**Rule:**

- For each colliding class, diff live vs new-design.
- Default: PRESERVE live. New-design overrides ONLY when DESIGN.md has an explicit "supersedes prior implementation" note for that class.
- Document each override in the conversion commit message.

## Order of operations (USMR-aligned)

| Phase                            | Tasks                                                                                                                                        | Done when                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0. Prerequisite gate**         | Implement `scripts/verify-prerequisites.mjs` (USMR 0.5). Tests pass.                                                                         | `npm run verify:prerequisites` exits 0 with RSA archive-ready signal.                                                                                                                |
| **1. Token landing**             | Sed-rename new-design tokens to `--nd-*`. Append to theme.css. Build green.                                                                  | `npm run build` succeeds. Visual diff zero on all 16 pages.                                                                                                                          |
| **2. Homepage E2E**              | Convert `index.html` → `src/pages/index.astro`. Per-page tokens aliased. Playwright smoke test passes.                                       | Build green + screenshot matches `new-design/extracted/screenshots/home-nav.png` (only 2 screenshots exist; for the rest, render new-design HTML in a browser as the visual oracle). |
| **3. Per-page rollout**          | Convert `/platform`, `/roadmap`, `/bridge`, `/use-cases`, `/standards` (the routes that have new-design HTML mocks). Each is its own commit. | Build green between each. Both shipped themes (twilight + midnight) still work on each converted page.                                                                               |
| **4. New routes (USMR Phase 5)** | Add `/use-cases`, `/standards`. Author per USMR spec, NOT by copying new-design HTML wholesale.                                              | New routes pass Playwright + a11y.                                                                                                                                                   |
| **5. Component extraction**      | After all pages converted, lift duplicated markup into `src/components/*.astro`.                                                             | No regression in any page. Components pass unit tests.                                                                                                                               |
| **6. Cleanup**                   | Remove dead live theme.css rules superseded by new-design. Use coverage tooling (e.g. `unused-css-class-detector`) — not eyeballing.         | Final theme.css ≤ budget.                                                                                                                                                            |

## Success criteria per page conversion

Run ALL of these. None optional.

1. **Build:** `npm run build` exits 0. No warnings about missing assets.
2. **Smoke:** Playwright test loads page, asserts `h1` visible, asserts main landmarks present (`<main>`, `<header>`, `<footer>`):
   ```ts
   test("page renders", async ({ page }) => {
     await page.goto("/<route>");
     await expect(page.locator("h1")).toBeVisible();
     await expect(page.locator("main")).toBeVisible();
     // Anti-blank-page guard:
     const text = await page.locator("main").textContent();
     expect(text?.length ?? 0).toBeGreaterThan(100);
   });
   ```
3. **Theme switching:** Test both shipped themes (the third theme `slate` was retired in pt167):
   ```ts
   for (const theme of ["twilight", "midnight"]) {
     await page.goto(`/<route>?theme=${theme}&persist=0`);
     const bg = await page.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue("--bg"),
     );
     expect(bg).toBeTruthy();
     // Visual regression: screenshot per theme
   }
   ```
4. **Console clean:** No JS console errors, no 404s on assets.
5. **Lighthouse a11y:** ≥ 95. Run via `npx lighthouse http://localhost:4321/<route> --only-categories=accessibility --chrome-flags="--headless"`.
6. **CSS budget:** No active gate enforces a fixed global threshold today (see "CSS budgets" section above for the model shift from a single global stylesheet to per-component scoped styles). Per-page CSS load that visibly exceeds the historic ~35KB raw / ~7KB gz pre-USMR snapshot should still be flagged in review and either REVERTED or SPLIT, but the threshold is contextual rather than fixed. Inspect: `wc -c .build/dist/<route>/index.html` + linked CSS files.
7. **No regressions:** All previously-converted pages still pass their tests.

## What MUST NOT happen

- ❌ Replace `BaseLayout.astro` wholesale — preserve lines 16-37 theme script, all 4 slots (`head`, `header`, default, `footer`)
- ❌ Delete live `theme.css` and start over
- ❌ Run `npm run verify:prerequisites` before USMR task 0.5 implements it
- ❌ Use `bun` — repo is npm-canonical
- ❌ Add Tailwind — site is hand-written CSS by design
- ❌ Touch `new-design/extracted/` directory — frozen reference material
- ❌ Convert a page without running ALL success criteria
- ❌ Use `client:*` directives without first justifying the cost (bundle delta, CSP/SRI hash regen, dep additions); when justified, prefer `client:visible` over `client:load`
- ❌ Create new routes (`/bridge`, `/blog`, `/brand-icons`) — they're either superseded or out of scope
- ❌ Edit `DESIGN.md` mid-conversion without filing an openspec change
- ❌ Edit USMR `tasks.md` to mark tasks done without proof — proof goes in commit messages
- ❌ Merge new-design tokens directly into a plain `:root {}` block — must be `--nd-*` prefixed first
- ❌ Skip RSA verification before starting USMR work

## When stuck

1. **DESIGN.md disagrees with USMR spec** → spec wins. File separate change to update DESIGN.md.
2. **Live class collides with new-design class** → favor live unless DESIGN.md explicitly supersedes for that class.
3. **React hook can't translate cheaply** → escalation path: CSS-only / `<details>` / `<dialog>` / `popover` / vanilla `<script>` / web component / React island. Document the bundle + CSP cost in the conversion commit message.
4. **Build breaks** → `git restore --source HEAD --staged --worktree <file>` (NOT `git checkout` — that's ambiguous between branch and file). Re-read this prompt's relevant section before retrying.
5. **Test ambiguous** → write a stricter test before continuing. TDD skill applies.

## Reporting

After each completed sub-task:

- Update `openspec/changes/update-site-marketing-redesign/tasks.md` — check off ONLY tasks with passing tests.
- Commit message format: `feat(USMR-<phase>): <short summary>` with body listing test commands run + results.
- Do NOT claim completion without a passing build + all 7 success criteria.

## Audit checklist before any commit

```bash
# 1. Build
npm run build

# 2. Smoke tests
npm test

# 3. Lint
npx design.md lint DESIGN.md

# 4. CSS budget
wc -c public/assets/theme.css public/assets/roadmap.css

# 5. Format check (if applicable)
# (no formatter configured; manual review)

# 6. Review skills compliance
cat .agents/skills/tdd/SKILL.md  # rule applied?
cat .agents/skills/typed-service-contracts/SKILL.md  # rule applied to data layer?
```

If any of these fail, do NOT commit. Fix or revert.
