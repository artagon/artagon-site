<!-- MCP:START -->

## MCP Servers

Project MCP servers are declared in **`.mcp.json`** (repo root). All models (Claude, Gemini, Codex) load this file automatically when working in this project.

### Active servers

| Server     | Purpose                                                            | How to use                                                                   |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `context7` | Live documentation for Astro, MDN, Playwright, and other libraries | Prefix queries with `use context7` or call `resolve-library-id` + `get-docs` |

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

### Adding new servers

Add entries to `.mcp.json` following the existing format. Commit `.mcp.json` so all models and team members get the same servers automatically.

<!-- MCP:END -->

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

Claude and Gemini route shell search commands through `.claude/skills/search-toolchain` / `.gemini/skills/search-toolchain` hooks. Codex does not expose a native pre-tool hook in the installed CLI, so Codex agents must follow this policy directly:

- Prefer `python3 .codex/skills/search-toolchain/scripts/search_router.py -- '<search command>'` for `grep`, `rg`, `ripgrep`, and `git grep` searches.
- Prefer structural `ast-grep` searches for supported languages (`bash`, `rust`, `typescript`, `tsx`, `python`, `go`, `json`, `yaml`, `html`, `css`, and others configured by the shared skill).
- Use bounded text fallback only when the language or file format is unsupported by `ast-grep` / tree-sitter.

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
