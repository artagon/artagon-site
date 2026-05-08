<!-- MCP:START -->

## MCP Servers

Project MCP servers are declared in **`.mcp.json`** (repo root). All models (Claude, Gemini, Codex) load this file automatically when working in this project.

### Active servers

| Server     | Purpose                                                            | How to use                                                                                 |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `context7` | Live documentation for Astro, MDN, Playwright, and other libraries | Prefix queries with `use context7` or call `resolve-library-id` + `get-docs`               |
| `serena`   | LSP-backed semantic code navigation and symbol-aware edits         | Use for named symbols: components, functions, hooks, types, references, and symbol edits   |
| `ast-grep` | Tree-sitter structural search and codemods                         | Use for syntactic patterns in Astro, HTML, TS/TSX, JS, CSS, YAML, JSON, Bash, Python, etc. |

### context7 usage

```
# Resolve a library to its context7 ID first:
resolve-library-id: "astro"           → /withastro/astro
resolve-library-id: "playwright"      → /microsoft/playwright

# Then fetch docs:
get-docs: /withastro/astro   topic="content collections"
get-docs: /microsoft/playwright   topic="locators"
```

Use context7 whenever working with Astro APIs, MDX content, Playwright selectors, or any library where your training data may be stale (Astro 5 changes frequently).

### Serena usage

Serena is configured as a project-level MCP server for Claude, Gemini, and Codex. Its project config lives in **`.serena/project.yml`** and enables language servers for:

- `typescript` — TypeScript, JavaScript, `.mjs`, TSX, React islands, Astro frontmatter helpers
- `html` — Astro template markup and HTML-like component structure
- `markdown` — Markdown and MDX content
- `yaml` — GitHub Actions, OpenSpec, ast-grep rules, and project YAML
- `scss` — CSS/SCSS language-server coverage for project stylesheets

Use Serena first for semantic navigation:

| Capability                                               | MCP tool                                       |
| -------------------------------------------------------- | ---------------------------------------------- |
| Find a component, function, hook, class, or type by name | `find_symbol`                                  |
| Find callers, references, or usages                      | `find_referencing_symbols`                     |
| Inspect a file/module outline                            | `get_symbols_overview`                         |
| Replace a function, component, or method body            | `replace_symbol_body`                          |
| Insert code before/after a known symbol                  | `insert_before_symbol` / `insert_after_symbol` |
| Rename a symbol safely                                   | `rename_symbol`                                |
| Store durable project knowledge                          | `write_memory` / `read_memory`                 |

Before LSP-dependent work, ensure dependencies are installed so TypeScript, React, Astro, and CSS language servers can resolve imports.

### ast-grep MCP usage

Use ast-grep for structural patterns and codemods. Always inspect the AST before authoring non-trivial patterns.

| Capability                                   | MCP tool               |
| -------------------------------------------- | ---------------------- |
| Inspect a snippet's syntax tree              | `dump_syntax_tree`     |
| Test a rule against a snippet                | `test_match_code_rule` |
| Search the codebase for a structural pattern | `find_code`            |
| Search with a YAML rule                      | `find_code_by_rule`    |

Use shell search only when MCP tools do not satisfy the need. In that case, follow `~/.agents/SEARCH.md` and use `rtk rg` for text-shaped queries: TODOs, copy strings, config keys, error message literals, or unsupported file formats.

### Search decision tree

1. Target is a named component, function, hook, class, type, exported constant, or known symbol -> Serena.
2. Target is a syntactic shape, such as `useState($$$)`, `<Image>` without `alt`, `set:html`, `await` in a specific context, or YAML rule structure -> ast-grep.
3. Multi-file refactor:
   - Symbol-aware rename or API movement -> Serena.
   - Pattern-aware migration or repeated call-shape rewrite -> ast-grep.
4. Literal text, comments, generated names, or prose -> `rtk rg`, only after MCP tools are not a fit.

### Shell search restrictions

- Do not use `grep`, `find`, `git grep`, bare `rg`, or `ripgrep` for code search.
- Do not use `rtk grep` for code search.
- Use MCP tools first: Serena for symbols, ast-grep MCP for structure, context7 for current docs.
- Do not use direct `bash`, shell scripts, or raw shell commands to bypass MCP tools.
- Do not use direct `bash`, shell scripts, or raw shell commands to bypass `rtk`.
- If shell text search is necessary, use `rtk rg` and follow `~/.agents/SEARCH.md`.
- If exact raw output is required, use `rtk proxy <cmd>` and state why.

### Shell command restrictions

- Prefer MCP tools over shell commands whenever an MCP tool satisfies the task.
- Run MCP servers and MCP tools directly through the model/client; do not wrap Serena, context7, ast-grep MCP, or any MCP stdio server with `rtk`.
- Route shell commands through `rtk <command>` by default.
- Do not invoke `bash -c`, `sh -c`, `zsh -c`, command files, one-off scripts, or raw binaries just to avoid MCP tool routing or `rtk` filtering.
- Use `rtk proxy <command>` only when exact raw output is required, and state the reason before running it.
- Tools explicitly documented outside RTK, such as ast-grep rule execution, may run directly only when the documented command requires it.

Before any code search or modification, state routing:

```text
Tool: <serena | ast-grep | rtk | rtk rg | context7>
Call: <tool_name or command>(<brief args>)
Reason: <one sentence>
```

### Adding new servers

Add entries to `.mcp.json` following the existing format. Commit `.mcp.json` so all models and team members get the same servers automatically.

<!-- MCP:END -->

<!-- STACK-CONTRACT:START -->

## Stack contract

This repo is an Astro static site with React islands, TypeScript, MDX, Playwright, `@google/design.md`, and project CSS tokens. It does **not** use Tailwind CSS; see `docs/decisions/0001-no-tailwind.md`.

Project styling follows Astro scoped styles plus global semantic tokens:

- New `.astro` component styles should prefer scoped `<style>` blocks.
- Shared brand and semantic tokens belong in `public/assets/theme.css` and `DESIGN.md`.
- Consume colors through CSS variables and existing `ui-*` utilities; do not add raw color literals or Tailwind utility conventions.
- React should be used only for interactive islands. Static UI belongs in Astro components.
- Add `client:*` directives only when interactivity is required, and choose the least eager directive that fits the UX (`client:visible` or `client:idle` before `client:load` where possible).
- Content-heavy features should prefer Astro content collections or typed data modules over ad hoc filesystem parsing.

<!-- STACK-CONTRACT:END -->

<!-- OPENSPEC:START -->

## OpenSpec

Always open `@/openspec/AGENTS.md` when a request:

- Mentions planning, proposals, specs, changes, or implementation plans.
- Introduces new capabilities, breaking changes, architecture shifts, or significant performance/security work.
- Is ambiguous enough that the authoritative project spec should be checked before coding.

Use `@/openspec/AGENTS.md` for change proposal workflow, spec format, project structure, and OpenSpec conventions.

<!-- OPENSPEC:END -->

<!-- DESIGN-CONTRACT:START -->

## Design contract

openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change.

DESIGN.md is at the repo root (governed by `adopt-design-md-format`).

- **DESIGN.md** — canonical visual identity contract per [google-labs-code/design.md](https://github.com/google-labs-code/design.md) format spec (alpha). Pinned to upstream commit `97b4df92901b9353fbc71cfe1b51dad1ece01708` and npm `@google/design.md@0.1.1`.
- **`openspec/.cache/design-md-spec.md`** — committed mirror of `npx @google/design.md spec --format markdown`. Kept in sync via the weekly `design-md-drift.yml` workflow (Phase 2.7).
- **`docs/design-md.md`** — authoring + maintenance guide: precedence chain, how to add a token, how to bump the upstream version, OKLCH↔hex hybrid policy, upstream attribution, and the `check:design-drift` allow-list.

Edits to `DESIGN.md` trigger the postbuild lint gate (`npm run lint:design`) and the PR-scoped diff workflow that posts changes as a PR comment. The `check:oklch-hex-parity` precondition gate fails if frontmatter hex values drift from the prose-cited OKLCH triples by more than 1 LSB per channel.

### Change discipline (durable)

Every code change must move three artifacts together in the same diff:

1. **Implementation** — the code itself (`src/`, `tests/`, `scripts/`, `public/`).
2. **OpenSpec tasks.md** — add the sub-task BEFORE implementing if it doesn't exist; check it off in the same diff. Reference the task ID in code comments and the commit body (e.g. `// USMR Phase 5.1q.6` and `Closes 5.1q.6`).
3. **DESIGN.md** — update the affected `§X` subsection when a component contract / visual identity / token / animation primitive shifts. If frontmatter palette or OKLCH triples move, run `npm run check:oklch-hex-parity` in the same diff.

The commit body lists which artifacts moved (task IDs · DESIGN.md sections · spec deltas).

**Why**: this codebase has a documented failure mode where DESIGN.md prose drifts from the implementation (the historical `--brand-teal → --ok` discrepancy), and OpenSpec changes claim work is done that hasn't shipped. Multi-agent reviews catch the drift only when the artifacts are touched in the same diff. Code-only changes that should have moved a doc are a recurring source of multi-round review churn.

**Precondition gates that backstop the discipline**:

- `check:oklch-hex-parity` — fails on >1 LSB drift between DESIGN.md frontmatter palette and the prose-cited OKLCH triples (precondition of `lint:design`).
- `lint:tokens` — fails on raw color literals in `src/` and on undefined `var(--…)` references; walks `git ls-files` (post-commit).
- `lint:design` — design.md format gate; runs as part of postbuild.
- `lint:design-md-uniqueness` — guards against duplicate token names.
- `verify:design-prerequisites` — schema gate before lint runs.

<!-- DESIGN-CONTRACT:END -->

<!-- AST-GREP:START -->

## Static Analysis — ast-grep

This project uses **ast-grep** (`sg`) as its primary linter (no ESLint). All models must run and respect it.

### Running the linter

```bash
npm run lint:sg          # scan (exits non-zero on any error-severity finding)
npm run lint:sg:fix      # scan + auto-apply fixes where available
npm run lint:sg:ci       # CI mode (explicit non-zero exit code on errors)
```

Direct binary (avoids npm script WouldBlock bug on macOS):

```bash
./node_modules/.bin/sg scan
```

### Configuration

- **`sgconfig.yml`** (repo root) — rule directories, test config, language mappings
- **`rules/security/`** — all project rules live here as YAML files
- `.astro` files → scanned as `html` (template portion); frontmatter `---` blocks are NOT covered — keep security logic in `src/lib/*.ts`
- `.mjs` and `.js` files → mapped to `typescript` parser

### Rules in force

| Rule ID                    | Severity | What it catches                                                                                                           |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `no-inner-html`            | error    | `innerHTML` / `outerHTML` assignment (XSS sink)                                                                           |
| `no-set-html-directive`    | error    | Astro `set:html` XSS escape hatch                                                                                         |
| `no-math-random-crypto`    | warning  | `Math.random()` used for security                                                                                         |
| `no-weak-hash`             | error    | `crypto.createHash('md5'\|'sha1')` (CWE-327)                                                                              |
| `no-jwt-decode-unverified` | error    | `jwt.decode()` without signature verification (CWE-347)                                                                   |
| `no-console-log-sensitive` | warning  | `console.log` with token/secret/key/credential vars                                                                       |
| `no-hardcoded-secrets`     | error    | API keys / JWTs hardcoded as string literals                                                                              |
| `no-raw-color-literal`     | warning  | `rgb()` / `rgba()` / `hsl()` / `oklch()` / `oklab()` literals inside Astro `<style>` blocks (USMR Phase 2 token system)   |
| `no-untraceable-token`     | warning  | Inline hex literals (`#0b1220`, `#22e3c5`) inside Astro `<style>` blocks (per `adopt-design-md-format` §6.3 traceability) |

### When to run

- **Before committing** any `.ts`, `.mjs`, `.js`, or `.astro` file
- **After writing new code** — run `npm run lint:sg` and fix all `error`-severity findings before considering the task done
- **Adding a new security pattern?** Add a YAML rule in `rules/security/` following the existing format; do not suppress findings without an explicit approval

### Search toolchain

Follow the canonical search policy in the MCP section above. That section owns the Serena, ast-grep MCP, context7, `rtk rg`, and prohibited shell-search rules.

### Writing new rules

```yaml
id: my-rule-id # kebab-case, unique
language: typescript # typescript | javascript | html
severity: error # error | warning | info
message: "Description with $META_VAR interpolation"
files:
  - "src/**/*.ts"
ignores:
  - "**/*.test.ts"
rule:
  pattern: dangerousCall($ARG)
```

<!-- AST-GREP:END -->

<!-- COMMIT-MESSAGES:START -->

## Commit messages

Do not attribute commits to Claude, Gemini, Codex, OpenAI, Anthropic, Google, or any other AI assistant/vendor. Do not include generated-by trailers, assistant co-author trailers, or tool branding in commit messages.

<!-- COMMIT-MESSAGES:END -->

<!-- BUILD-ARTIFACTS:START -->

## Build & Deploy

All runtime build/cache/report artifacts live under `.build/`:

- `.build/cache/` — reusable across runs (CI cache key target).
- `.build/reports/` — per-run output (CI uploads as artifact, retention-days: 14).
- `.build/dist/` — deploy artifact (Pages upload).

Single source-of-truth: `build.config.json` at repo root. Typed wrapper: `build.config.ts` exporting `BUILD: DeepReadonly<BuildPaths>`. TS configs (`astro.config.ts`, `playwright.config.ts`) `import { BUILD } from './build.config.ts'`. JSON/YAML/TOML configs (`lighthouserc.json`, `lychee.toml`) are GENERATED by `scripts/sync-build-config.mjs`; manual edits clobbered.

Scripts:

- `npm run build` — runs `prebuild` (sync) → `astro build` → `postbuild` (SRI + CSP).
- `npm run dev` — runs `predev` (sync) → `astro dev`.
- `npm run sync:build-config` — regenerate generated configs.
- `npm run clean` / `clean:cache` / `clean:reports` — lock-aware via `.build/.run.lock`.
- `npm run test:build-config` — drift-gate + idempotency + path-validator tests.

Tree-sitter grammars are explicitly excluded from `BUILD.cache` — they belong in the contributor's editor/IDE/global home directory, not the project.

See [`docs/build-artifacts.md`](./docs/build-artifacts.md) for the full SSoT contract, generator mechanics, contributor "add a tool" checklist, CODEOWNERS dual-review rule, and Bazel-readiness path.

<!-- BUILD-ARTIFACTS:END -->

<!-- TESTING:START -->

## Testing

Three test runners coexist in `tests/`. They are **disjoint by what they import**, NOT by file extension:

| Runner                              | Owns                                                   | Config                                                                     | Discovery                                                                                 |
| ----------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Playwright** (`@playwright/test`) | `tests/**/*.spec.ts`                                   | [`playwright.config.ts`](./playwright.config.ts)                           | `testMatch: "**/*.spec.ts"` (override of default)                                         |
| **vitest** (`vitest`)               | `tests/**/*.test.mts`                                  | [`vitest.config.ts`](./vitest.config.ts)                                   | `include: ["tests/**/*.test.mts"]`; explicit `exclude` for legacy `tweaks-state.test.mts` |
| **node:test** (`node:test`)         | `tests/**/*.test.mjs` + legacy `tweaks-state.test.mts` | enumerated in [`package.json`](./package.json) `test:node` / `test:tweaks` | no glob; each file listed by name                                                         |

The runners' globs **must stay disjoint** — Playwright's default glob (`**/*.@(spec|test).?(c|m)[jt]s?(x)`) overlaps both other runners. Loading `vitest` and `@playwright/test` into the same process triggers `Symbol($$jest-matchers-object)` collision (PR #46 broke on this; fix `7b51428`/`9a3981b`).

### Browser-profile isolation

Every Playwright project is configured via `devices[...]` in `playwright.config.ts`, which spins up an **ephemeral browser context per test**. Do NOT use `chromium.launchPersistentContext('/path/to/real/profile')` — that exposes the developer's Edge / Chrome keychain to the test runner and is a security regression vector. Profiles stay isolated; no keychain reads; no cookie persistence across tests.

### Device matrix (15 projects)

Desktop: `chromium` / `firefox` / `webkit` / `Edge` (msedge channel) / `Chrome` (chrome channel). Mobile: `Mobile Chrome` (Pixel 5) / `Mobile Chrome (Pixel 7)` / `Mobile Chrome (Galaxy S9+)` / `Mobile Safari` (iPhone 12) / `Mobile Safari (iPhone 14 Pro Max)`. Tablet: `Tablet Safari` (iPad Pro 11) / `Tablet Safari (iPad Mini)` / `Tablet Chrome (Galaxy Tab S4)`. Large: `TV` (1920×1080) / `TV 4K` (3840×2160 HiDPI).

The CI image (`mcr.microsoft.com/playwright:vX.Y.Z-jammy`) bundles chromium / firefox / webkit. Edge and Chrome stable channels are installed via `npx playwright install msedge` / `npx playwright install chrome` in the `test` job.

### Test scoping by device class

- **Smoke + a11y-contract** assertions run on every project (structural, no mouse/touch dependency).
- **Mouse-driven tests** (`test.skip(({isMobile}) => isMobile, ...)`) skip on touch projects. The underlying touch-affordance gap is tracked by [`openspec/changes/enhance-a11y-coverage`](./openspec/changes/enhance-a11y-coverage/).
- **axe-core WCAG audit** (`tests/home-axe.spec.ts`) runs on chromium / webkit / Mobile Safari only. Currently gated on `AXE_AUDIT=1`; flips to mandatory after `enhance-a11y-coverage` Phase 4.
- **Visual snapshots** are currently **chromium-only** — `tests/styling-snapshots.spec.ts:46-50,124-128` skip on every non-chromium project to keep the baseline set bounded. Baselines are Linux-pinned (`*-chromium-linux.png`) and regenerated via `.github/workflows/playwright.yml`'s `workflow_dispatch` path. The webkit / Mobile Safari Linux baselines that earlier docs referenced **do not exist yet** — cross-engine deltas (`color-mix(in oklab, …)`, `oklch()` rounding, `backdrop-filter` engine handling) are guarded structurally by `tests/header.spec.ts` (computed-style reads on chromium + webkit + Mobile Safari) and `tests/home-axe.spec.ts` (WCAG audit on the same triple) instead of pixel diffs. Phase 5.x / `enhance-a11y-coverage` Phase 4 broadens snapshot scope. Do NOT remove the chromium-only skip without first regenerating Linux baselines for the new engine via `workflow_dispatch`. Local Darwin / Windows runs produce gitignored host-specific PNGs.

### Lint gotcha: `lint:tokens` uses `git ls-files`

[`scripts/lint-tokens.mjs`](./scripts/lint-tokens.mjs) walks `git ls-files`, so an **untracked** new CSS file with raw color literals appears clean. After `git add`, re-run the gate against the committed state — a passing lint on uncommitted code does NOT guarantee a passing lint after commit.

### Hot-spots

- New device project → update [`playwright.config.ts`](./playwright.config.ts) `projects[]` AND verify the `test:ci` shard count (`TOTAL_SHARDS` env in `.github/workflows/playwright.yml`) still distributes evenly.
- New test runner (any third) → all three runners' configs must add explicit `include` / `exclude` to keep them disjoint.
- New a11y rule → the [`enhance-a11y-coverage`](./openspec/changes/enhance-a11y-coverage/) change owns the WCAG 2.1 AA contracts; the `accessibility` CI job runs axe-core on chromium / webkit / Mobile Safari.

<!-- TESTING:END -->

<!-- REVIEW:START -->

## Review workflow

Multi-agent review is the default for non-trivial changes. Spawn a parallel set of review agents from the `pr-review-toolkit` plugin (each agent reads the same diff but with a different lens):

| Lens                         | Agent                                     | Use for                                                         |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Neutral                      | `pr-review-toolkit:code-reviewer`         | first-pass correctness + style                                  |
| Adversarial: silent failures | `pr-review-toolkit:silent-failure-hunter` | swallowed errors, inadequate error handling, fall-back behavior |
| Adversarial: types           | `pr-review-toolkit:type-design-analyzer`  | encapsulation, invariant expression, enforcement                |
| Adversarial: comments        | `pr-review-toolkit:comment-analyzer`      | comments that lie about the code; stale references              |
| Test coverage                | `pr-review-toolkit:pr-test-analyzer`      | gap analysis vs. shipped logic                                  |
| Simplification               | `pr-review-toolkit:code-simplifier`       | duplication, over-conditional rendering                         |

**Mandatory pre-report skill**: every review (sub-agent or direct) MUST load [`.claude/skills/review-verification-protocol`](./.claude/skills/review-verification-protocol/) BEFORE reporting findings. The skill enforces: read actual code (not just diff), search for usages before claiming "unused", calibrate severity (Critical / Major / Minor / Informational), downgrade net-new-code suggestions to Informational.

Per `AGENTS.md` Commit-Messages rule, agents MUST NOT add `Co-Authored-By: Claude` / vendor-attribution trailers, AND must not author commits as `Claude <noreply@anthropic.com>` or `copilot-swe-agent[bot] <…>` (author identity counts as attribution; PR #46 had to rewrite two such commits — see history of `9a3981b` / `67abd4b`).

### Tier system (durable)

Group lenses by blast radius. Run **within a tier in parallel** (single message, multiple Agent tool calls — six standard agents finish in ~the time of one). **Serialize between tiers** when a Tier-1 finding would invalidate the diff a later tier reviews; otherwise concurrent is fine if the diff is stable + lints/tests already green.

| Tier  | When to run                                                    | Lenses (default)                                                                                                                                                                                                          |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Every non-trivial diff (mandatory minimum viable)              | `code-reviewer` · `silent-failure-hunter` · `type-design-analyzer` · `astro-expert` (custom brief — promote to Tier 1 for any diff touching `src/pages/`, `src/components/*.astro`, `src/layouts/`, or `astro.config.ts`) |
| **2** | Diff scope warrants it (UI / new tests / many comments)        | `comment-analyzer` · `pr-test-analyzer` · `ux-design-expert` (custom)                                                                                                                                                     |
| **3** | Custom adversarial briefs (one-off, run via `general-purpose`) | Visual-fidelity (mock parity) · Token-coverage · DESIGN.md ↔ implementation drift · Accessibility (axe-core) · CSP/SRI hash drift                                                                                         |

**Architectural-review trio** (run when reviewing implementation depth, not just diff correctness; serialized order):

1. **security-architect-reviewer** — inline JSON-LD / `set:html` / pre-paint script allow-lists; CSP/SRI; ast-grep security rules (`no-set-html-directive`, `no-inner-html`, `no-hardcoded-secrets`, `no-weak-hash`, `no-jwt-decode-unverified`); build-time vs runtime input trust boundaries.
2. **modularity-and-boundaries-reviewer** — content-collection vs typed-data-module split (no ad-hoc `fs.readFile` outside `scripts/`); test-runner isolation; `build.config.json` SSoT; orphaned exports; cross-cutting concerns (logging / errors) threaded through interfaces; Astro `pages/` vs `components/` vs `layouts/` separation. _Question: can a new contributor predict where any change belongs?_
3. **type-system-architect-reviewer** — discriminated unions over optional-prop combinations; invariant expression; tuple types vs arrays for fixed-arity contracts; `readonly` / `as const` discipline; branded / nominal types where structural equivalence is unsafe.

**Brevity rule.** Keep each agent's prompt tight: scope + verification anchors + output format under 500 words. List specific surfaces with FILE:LINE pointers — never ask the agent to "verify everything." Long prompts get rejected mid-stream.

**Re-review mode.** When re-running a lens after fixes, instruct the agent to verify the original findings ONLY and refrain from introducing new ones (rule 7 of the protocol). Otherwise reviews never converge.

<!-- REVIEW:END -->

<!-- ACCESSIBILITY:START -->

## Accessibility

WCAG 2.1 AA is the floor (project convention is WCAG 2.2 AA where it tightens 2.1). The [`enhance-a11y-coverage`](./openspec/changes/enhance-a11y-coverage/) OpenSpec change owns the durable contracts:

- **Tap target ≥ 44 × 44 CSS px** (WCAG 2.5.5). Visible target may be smaller; invisible padding extends the hit area.
- **Color contrast ≥ 4.5:1 (text) / ≥ 3:1 (non-text)**. Verified at vitest time via `tests/contrast-tokens.test.mts`; documented in [`DESIGN.md`](./DESIGN.md) §"Color tokens" with computed ratios.
- **DESIGN.md token assignments** — [`DESIGN.md`](./DESIGN.md) §line 226-228 + §6.5 specify `--ok` for PERMIT/pass states, `--bad` for DENY/fail, `--accent` (= `--brand-teal`) reserved for primary CTAs and the trust-chain's CURRENT/EVALUATING stage. Components MUST consume the semantic alias, not the staging `--nd-*` token directly.
- **Focus indicators**: every interactive element has explicit `:focus-visible` (2 px `var(--accent)` outline + 2 px offset). Browser defaults are not relied on.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` blocks set `animation: none` and `transition: none` on animated UI; in particular the upstream `glow-tag` / `glow-text-shimmer` etc. (see [`new-design/extracted/src/styles/global.css`](./new-design/extracted/src/styles/global.css) lines 200-202).
- **Forced colors**: `@media (forced-colors: active)` overrides map semantic aliases to system colors (`Canvas` / `CanvasText` / `Highlight` / `Mark`). Trust-chain tints derived via `color-mix()` lose meaning in forced-colors mode without explicit overrides.
- **Pointer + keyboard + touch parity**: every interactive component on a content route must support all three modalities. Hover-only affordances need a tap-toggle equivalent on touch (`aria-pressed`).
- **Live region announcements**: `aria-live="polite"` on the trust-chain decision card. The planned screen-reader Tab-navigation proxy test (owned by [`enhance-a11y-coverage`](./openspec/changes/enhance-a11y-coverage/), Phase 6) is the next step beyond axe-core; until it ships, today's coverage is the live-region attribute itself plus the axe-core audit at [`tests/home-axe.spec.ts`](./tests/home-axe.spec.ts).
- **Automated CI gate**: [`tests/home-axe.spec.ts`](./tests/home-axe.spec.ts) runs `@axe-core/playwright` on chromium / webkit / Mobile Safari with WCAG 2.1 A + AA tags; gate flips from informational to mandatory after `enhance-a11y-coverage` Phase 4 lands.

<!-- ACCESSIBILITY:END -->

<!-- REFERENCES:START -->

## Symbolic references

Canonical artifacts maintained as separate sources of truth:

| Artifact                           | Path                                                                                | Owns                                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual identity                    | [`DESIGN.md`](./DESIGN.md)                                                          | Tokens, typography, components, color contracts. Pinned to `@google/design.md@0.1.1`.                                                                                                                |
| design.md spec mirror              | [`openspec/.cache/design-md-spec.md`](./openspec/.cache/design-md-spec.md)          | `npx @google/design.md spec --format markdown` snapshot. Refreshed weekly via `design-md-drift.yml`.                                                                                                 |
| design.md authoring guide          | [`docs/design-md.md`](./docs/design-md.md)                                          | Token-add procedure, OKLCH↔hex hybrid, upstream version-bump runbook.                                                                                                                                |
| Build SSoT                         | [`build.config.json`](./build.config.json) → [`build.config.ts`](./build.config.ts) | `.build/{cache,reports,dist}` paths. JSON/YAML/TOML configs are GENERATED.                                                                                                                           |
| Token source                       | [`public/assets/theme.css`](./public/assets/theme.css)                              | Public aliases (`--text` / `--muted` / `--border` / `--brand-teal` / `--bg-alt` / `--bad` / `--ok` / `--warn`) over staging `--nd-*` set.                                                            |
| Security rules                     | [`rules/security/`](./rules/security/)                                              | ast-grep YAML rules: `no-inner-html`, `no-set-html-directive`, `no-math-random-crypto`, `no-weak-hash`, `no-jwt-decode-unverified`, `no-console-log-sensitive`, `no-hardcoded-secrets`.              |
| OpenSpec changes (active)          | [`openspec/changes/`](./openspec/changes/)                                          | `update-site-marketing-redesign`, `enhance-a11y-coverage`, `add-brand-assets-and-writing-pipeline`, `migrate-deploy-to-cloudflare-pages`, `migrate-legacy-tokens-to-layer`, `self-host-woff2-fonts`. |
| OpenSpec specs (live capabilities) | [`openspec/specs/`](./openspec/specs/)                                              | `build-config`, `check-site-quality`, `configure-copilot-environment`, `design-system-format`, `github-pages-deployment`, `manage-site-links`, `openspec-workflow`, `site-content`, `style-system`.  |
| Project skills                     | [`.agents/skills/`](./.agents/skills/)                                              | Per-project SKILL.md scaffolds for the OpenSpec workflow (`opsx:explore` / `:new` / `:propose` / `:ff` / `:continue` / `:apply` / `:verify` / `:sync` / `:archive` / `:bulk-archive` / `:onboard`).  |
| Review skills                      | `.claude/skills/review-verification-protocol/` (loaded as user skill)               | False-positive reduction rules. Mandatory load before any review report.                                                                                                                             |
| CI workflow                        | [`.github/workflows/playwright.yml`](./.github/workflows/playwright.yml)            | Test (5 shards × all projects) + visual-regression (chromium / webkit / Mobile Safari) + accessibility (chromium / webkit / Mobile Safari) + merge-reports.                                          |

When a section above is touched (tokens, components, accessibility contracts), update **both** the implementation file AND the relevant artifact above in the same change.

<!-- REFERENCES:END -->
