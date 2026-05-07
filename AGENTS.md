<!-- MCP:START -->

## MCP Servers

Project MCP servers are declared in **`.mcp.json`** (repo root). All models (Claude, Gemini, Codex) load this file automatically when working in this project.

### Active servers

| Server     | Purpose                                                            | How to use                                                                                 |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `context7` | Live documentation for Astro, MDN, Playwright, and other libraries | Prefix queries with `use context7` or call `resolve-library-id` + `get-docs`               |
| `serena`   | LSP-backed semantic code navigation and symbol-aware edits         | Use for named symbols: components, functions, hooks, types, references, and symbol edits    |
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

| Capability | MCP tool |
| ---------- | -------- |
| Find a component, function, hook, class, or type by name | `find_symbol` |
| Find callers, references, or usages | `find_referencing_symbols` |
| Inspect a file/module outline | `get_symbols_overview` |
| Replace a function, component, or method body | `replace_symbol_body` |
| Insert code before/after a known symbol | `insert_before_symbol` / `insert_after_symbol` |
| Rename a symbol safely | `rename_symbol` |
| Store durable project knowledge | `write_memory` / `read_memory` |

Before LSP-dependent work, ensure dependencies are installed so TypeScript, React, Astro, and CSS language servers can resolve imports.

### ast-grep MCP usage

Use ast-grep for structural patterns and codemods. Always inspect the AST before authoring non-trivial patterns.

| Capability | MCP tool |
| ---------- | -------- |
| Inspect a snippet's syntax tree | `dump_syntax_tree` |
| Test a rule against a snippet | `test_match_code_rule` |
| Search the codebase for a structural pattern | `find_code` |
| Search with a YAML rule | `find_code_by_rule` |

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
- If shell text search is necessary, use `rtk rg` and follow `~/.agents/SEARCH.md`.
- If exact raw output is required, use `rtk proxy <cmd>` and state why.

Before any code search or modification, state routing:

```text
Tool: <serena | ast-grep | rtk rg | context7>
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

| Rule ID                    | Severity | What it catches                                         |
| -------------------------- | -------- | ------------------------------------------------------- |
| `no-inner-html`            | error    | `innerHTML` / `outerHTML` assignment (XSS sink)         |
| `no-set-html-directive`    | error    | Astro `set:html` XSS escape hatch                       |
| `no-math-random-crypto`    | warning  | `Math.random()` used for security                       |
| `no-weak-hash`             | error    | `crypto.createHash('md5'\|'sha1')` (CWE-327)            |
| `no-jwt-decode-unverified` | error    | `jwt.decode()` without signature verification (CWE-347) |
| `no-console-log-sensitive` | warning  | `console.log` with token/secret/key/credential vars     |
| `no-hardcoded-secrets`     | error    | API keys / JWTs hardcoded as string literals            |

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
