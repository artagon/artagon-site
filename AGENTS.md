# artagon-site agent guide

This repo is an Astro 6 static marketing site with React islands, TypeScript, MDX, and Playwright. `CLAUDE.md` and `GEMINI.md` symlink to this file. It holds the rules every agent needs on every task. The reference detail lives in `docs/agents/`; read the matching page before working in its area.

| Area                                                     | Read                               |
| -------------------------------------------------------- | ---------------------------------- |
| Code-intelligence recipes, analysis boundaries, evidence | `docs/agents/code-intelligence.md` |
| MCP servers, context7, adding servers                    | `docs/agents/mcp-servers.md`       |
| DESIGN.md pins and precondition gates                    | `docs/agents/design-contract.md`   |
| ast-grep linter config, rule authoring, coverage gaps    | `docs/agents/static-analysis.md`   |
| Test runners, device matrix, snapshots                   | `docs/agents/testing.md`           |
| Multi-agent and multi-model review                       | `docs/agents/review-workflow.md`   |
| Accessibility contracts                                  | `docs/agents/accessibility.md`     |
| Build artifacts and the `build.config.json` SSoT         | `docs/build-artifacts.md`          |

<!-- CODE-INTEL:START -->

## Code intelligence and search

`~/.agents/TOOLS.md` defines these tools on every machine; this section is the repo override. Pick the cheapest tool that answers the question, then confirm the answer in source.

| Need                                                                  | Tool         | Call                                                                                           |
| --------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| Where to start; callers, callees, blast radius in `.ts`/`.tsx`/`.mjs` | ripwire      | `rtk ripwire . --for="<task>" --legend=compact`, `--callers=SYM`, `--uses=SYM`, `--impact=SYM` |
| Exact symbols, types, references, symbol edits                        | Serena (MCP) | `find_symbol`, `find_referencing_symbols`, `get_symbols_overview`                              |
| Code shape, anti-pattern, codemod                                     | ast-grep     | `rtk ast-grep run --lang <ts\|tsx\|html\|css\|yaml\|bash> --pattern '<pat>' <path>`            |
| Repeated regex sweeps over an unchanged tree                          | tgrep        | `rtk tgrep '<regex>' .`; build with `rtk tgrep index .`                                        |
| One-off text, files edited this session, config, prose                | ripgrep      | `rtk rg -n '<regex>' <path>`                                                                   |

Repo-specific rules:

- **ripwire cannot parse `.astro`, `.mdx`, `.css`, or HTML**, and 0.5 has no option to change that. Its caller lists miss every Astro and MDX consumer: `--uses=safeJsonLd` finds only `tests/charset.test.mts`, not `src/components/SeoTags.astro` or `src/pages/faq/index.astro`. Treat ripwire results for anything reachable from a page or component as a floor, and never act on `ripwire --dead-code` in `src/`.
- **ast-grep** follows `sgconfig.yml`: `.astro` parses as `html` (template only; frontmatter is not parsed), and `.mjs`/`.js` as `typescript`. Always pass `--lang`. Prove a pattern on a known match first (`<Header />` under `src/pages/` for `html`); exit 1 with no output means no match or a bad pattern. Verify rule changes with the pinned engine (`npm run lint:sg`), not the global CLI.
- **tgrep** reads a snapshot index in `.tgrep/` (gitignored). Rebuild it after checkout, pull, rebase, or large edits, and check its age with `rtk tgrep status .`. Use `rtk rg` for files changed this session.
- **Serena** runs at `http://127.0.0.1:9141/mcp` with the typescript, html, markdown, yaml, and scss servers from `.serena/project.yml`. It needs `npm ci` for exact results. When it refuses connections, report it `UNAVAILABLE` and use ripwire + ast-grep + tgrep/`rtk rg` for symbol lookups. Newer Serena releases rewrite `.serena/project.yml` on start; do not commit that rewrite by accident.
- **ripgrep** runs only as `rtk rg`. Never use bare `grep`, `find`, `git grep`, `rg`, or `rtk grep` for code search.
- Run each lookup as one `rtk`-prefixed command. Compound commands (`cmd; echo $?`) and bare binaries stop on manual approval.

Evidence:

- Tag code-intelligence claims `SUPPORTED`, `PARTIAL`, or `UNAVAILABLE` and name the tool.
- "Unused", "dead", or "no callers" needs two lanes: ast-grep or Serena, plus `rtk rg`/`rtk tgrep` over code, config, tests, and docs. ripwire alone never proves absence.
- Before deleting or renaming a component, export, CSS class, token, route, or npm script, search the string boundaries in `docs/agents/code-intelligence.md` (Astro templates, MDX, class strings, `var(--token)`, content-collection IDs, glossary terms, npm scripts, `build.config.json` keys, test globs, routes).

State routing before any code search or modification:

```text
Tool: <ripwire | serena | ast-grep | tgrep | rtk rg | context7>
Call: <tool or command>(<brief args>)
Reason: <one sentence>
```

Shell rules:

- Route shell commands through `rtk`. Use `rtk proxy <cmd>` only when raw output is required, and say why.
- Call MCP tools directly; never wrap an MCP server in `rtk` or a shell.
- Do not use `bash -c`, one-off scripts, or absolute binary paths to get around MCP routing or `rtk`.

<!-- CODE-INTEL:END -->

<!-- MCP:START -->

## MCP servers

Project servers live in `.mcp.json` (Claude Code) and `.codex/config.toml` (Codex; loaded only when the project is trusted). Shared servers such as `context7` come from each client's user-level config through the local MCP controller. Gemini CLI reads `.gemini/settings.json`, which sync does not manage.

| Server            | Use for                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `context7`        | Current Astro, Playwright, and library docs. The project is on Astro 6, and Astro 5 → 6 changed real APIs, so check docs instead of memory. |
| `serena`          | Semantic navigation and symbol edits (see above).                                                                                           |
| `ast-grep`        | Structural search and rule testing: `dump_syntax_tree`, `test_match_code_rule`, `find_code`, `find_code_by_rule`.                           |
| `playwright`      | Inspecting rendered pages and flows the suite does not cover. Global `playwright-mcp`, not pinned here.                                     |
| `chrome-devtools` | Claude only: traces, Lighthouse, network and console. Global `chrome-devtools-mcp`, not pinned here.                                        |

Do not hand-edit the `serena` entry or add controller-managed servers here. Re-run `sync-mcp.sh --project <repo-root> --include serena --agent claude --agent codex` (artagon-cli-mcp plugin), previewing with `--dry-run` first. Details: `docs/agents/mcp-servers.md`.

<!-- MCP:END -->

<!-- STACK-CONTRACT:START -->

## Stack contract

This repo does **not** use Tailwind CSS; see `docs/decisions/0001-no-tailwind.md`. Styling is Astro scoped styles plus global semantic tokens:

- New `.astro` component styles prefer scoped `<style>` blocks.
- Shared brand and semantic tokens belong in `public/assets/theme.css` and `DESIGN.md`.
- Consume colors through CSS variables and existing `ui-*` utilities. Never add raw color literals or Tailwind utility conventions.
- React is only for interactive islands. Static UI belongs in Astro components.
- Add `client:*` directives only when interactivity requires them, and pick the least eager one that fits (`client:visible` or `client:idle` before `client:load`).
- Content-heavy features use Astro content collections or typed data modules, not ad hoc filesystem parsing.
- Keep logic in `.ts` modules (`src/lib/`, `src/data/`), not in Astro frontmatter: ast-grep rules and ripwire cannot see frontmatter.

<!-- STACK-CONTRACT:END -->

<!-- OPENSPEC:START -->

## OpenSpec

Always consult the OpenSpec workflow when a request:

- Mentions planning, proposals, specs, changes, or implementation plans.
- Introduces new capabilities, breaking changes, architecture shifts, or significant performance/security work.
- Is ambiguous enough that the authoritative project spec should be checked before coding.

For the change-proposal workflow, run the appropriate `opsx:*` skill — `opsx:propose` to create a new change, `opsx:apply` to start implementing, `opsx:archive` to land it. The full skill set lives at `.agents/skills/` (`opsx:explore` / `:new` / `:propose` / `:ff` / `:continue` / `:apply` / `:verify` / `:sync` / `:archive` / `:bulk-archive` / `:onboard`).

For project structure, capabilities, and merge ordering, read `openspec/project.md`. For general contribution conventions, read `openspec/contributing.md`. The pre-pt238 `@/openspec/AGENTS.md` workflow guide was retired when its content moved into the per-skill `opsx:*` scaffolds.

<!-- OPENSPEC:END -->

<!-- DESIGN-CONTRACT:START -->

## Design contract and change discipline

openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change.

Every code change moves three artifacts together in the same diff:

1. **Implementation**: the code itself (`src/`, `tests/`, `scripts/`, `public/`).
2. **OpenSpec `tasks.md`**: add the sub-task before implementing if it does not exist, and check it off in the same diff. Cite the task ID in code comments and the commit body (for example `// USMR Phase 5.1q.6` and `Closes 5.1q.6`).
3. **`DESIGN.md`**: update the affected §X when a component contract, visual identity, token, or animation primitive shifts. If frontmatter palette or OKLCH triples move, run `npm run check:oklch-hex-parity` in the same diff.

The commit body lists which artifacts moved (task IDs · DESIGN.md sections · spec deltas). DESIGN.md pins, mirrors, and what each precondition gate really checks: `docs/agents/design-contract.md`.

<!-- DESIGN-CONTRACT:END -->

<!-- BEADS:START -->

## Issue tracking — beads

Agent work items are tracked with beads_rust (`br`; the `bd` alias is not installed). IDs use the `site` prefix, set in `.beads/config.yaml`. Issues live in a local SQLite database that git ignores; `.beads/issues.jsonl` is the tracked export.

Beads does not replace OpenSpec. When a bead implements an OpenSpec task, name the task ID in the bead and still check the task off in its `tasks.md`.

```bash
br ready --json                                        # open, unblocked work
br show <id> --json                                    # details and dependencies
br update <id> --claim --actor "<agent-name>" --json   # assign to you + in_progress
br create --title "..." --type task --priority 2 --json  # priority 0 (critical) to 4 (backlog)
br dep add <issue> <depends-on>                        # <issue> waits on <depends-on>
br close <id> --reason "Completed: <proof>" --json
br sync --flush-only                                   # export the database to issues.jsonl
```

- Run `br` through `rtk` like any other shell command, and always pass `--actor` so audit records carry the agent name.
- `br` never runs git. Stage `.beads/issues.jsonl` with the change it describes; commit or push only when the user asks.
- `br` writes the absolute checkout path into `source_repo_path` on every row. The `beads-relpath` clean filter in `.gitattributes` rewrites it to `"."` on `git add`. Register it once per clone, before staging the export:

  ```bash
  git config filter.beads-relpath.clean "sed -E 's/\"source_repo_path\":\"[^\"]*\"/\"source_repo_path\":\".\"/'"
  git config filter.beads-relpath.smudge cat   # required=true also needs a smudge, or checkouts fail
  git config filter.beads-relpath.required true
  ```

- Use `br agents` only with `--check`. Its `--add` and `--update` modes append a generic block whose session checklist runs `git commit` and `git push`.
- The open review backlog is epic `site-2m1`. NTM session state lives in `.ntm/`, which git ignores.

<!-- BEADS:END -->

<!-- AST-GREP:START -->

## Static analysis — ast-grep

ast-grep is the project linter (no ESLint). After writing `.ts`, `.mjs`, `.js`, or `.astro`, run `npm run lint:sg` and fix every error-severity finding before calling the task done. CI runs `npm run lint:sg:ci`. On macOS, `./node_modules/.bin/sg scan` avoids the npm WouldBlock bug. Never suppress a finding without explicit approval; add new security patterns as YAML rules in `rules/security/`.

### Rules in force

| Rule ID                         | Severity | Catches                                                                                             |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `no-inner-html`                 | error    | `innerHTML` / `outerHTML` assignment (XSS sink)                                                     |
| `no-set-html-directive`         | error    | Astro `set:html` escape hatch (enforced by `tests/lint-set-html-safejsonld.test.mts`)               |
| `no-math-random-crypto`         | warning  | `Math.random()` used for security                                                                   |
| `no-weak-hash`                  | error    | `crypto.createHash('md5'\|'sha1')` (CWE-327)                                                        |
| `no-jwt-decode-unverified`      | error    | `jwt.decode()` without signature verification (CWE-347)                                             |
| `no-console-log-sensitive`      | warning  | `console.log` with token, secret, key, or credential variables                                      |
| `no-hardcoded-secrets`          | error    | API keys and JWTs hardcoded as string literals                                                      |
| `no-raw-color-literal`          | warning  | `rgb()` / `rgba()` / `hsl()` / `oklch()` / `oklab()` literals in Astro `<style>` blocks             |
| `no-raw-color-style-object-ts`  | warning  | Hex and color-function literals in TypeScript CSS property/value object pairs                       |
| `no-raw-color-style-object-tsx` | warning  | Hex and color-function literals in TSX CSS property/value object pairs, including JSX style objects |
| `no-untraceable-token`          | warning  | Inline hex literals (`#0b1220`) in Astro `<style>` blocks (`design-system-format` §6.3)             |

### Rule authoring and coverage gaps

Language mappings, the rule template, how to prove a rule, and the gaps the 2026-10-20 review found in these rules: `docs/agents/static-analysis.md`.

<!-- AST-GREP:END -->

<!-- COMMIT-MESSAGES:START -->

## Commit messages

Do not attribute commits to Claude, Gemini, Codex, OpenAI, Anthropic, Google, or any other AI assistant/vendor. Do not include generated-by trailers, assistant co-author trailers, or tool branding in commit messages. Never author a commit under an assistant identity (for example `Claude <noreply@anthropic.com>` or `copilot-swe-agent[bot]`).

<!-- COMMIT-MESSAGES:END -->

<!-- BUILD-TEST:START -->

## Build, test, review, and accessibility

- **Build.** All build, cache, and report artifacts live under `.build/` (`cache/`, `reports/`, `dist/`). `build.config.json` is the single source of truth; `build.config.ts` exports the typed `BUILD`. `lighthouserc.json` and `lychee.toml` are generated by `npm run sync:build-config`, so never hand-edit them. `npm run build` runs the prebuild sync, `astro build`, then the postbuild gate chain (order in `package.json` `scripts.postbuild`). See `docs/build-artifacts.md`.
- **Tests.** Three runners share `tests/` and must keep disjoint discovery globs: Playwright owns `*.spec.ts`, vitest owns `*.test.mts`, and node:test runs the files listed in `package.json`. Loading vitest and `@playwright/test` in one process breaks on a matcher-symbol collision. Playwright uses ephemeral contexts only; never `launchPersistentContext` with a real browser profile. See `docs/agents/testing.md`.
- **Review.** Non-trivial diffs get a parallel multi-agent review: at minimum `code-reviewer`, `silent-failure-hunter`, and `type-design-analyzer`, plus an `astro-expert` brief for `src/pages/`, `src/components/`, `src/layouts/`, or `astro.config.ts`. Load `.claude/skills/review-verification-protocol/` before reporting any finding. See `docs/agents/review-workflow.md`.
- **Accessibility.** WCAG 2.1 AA is the floor (2.2 AA where stricter), plus project contracts: 44 × 44 px hit areas, explicit `:focus-visible`, reduced-motion and forced-colors coverage, one `<h1>` per page, and pointer, keyboard, and touch parity. The axe gate in `tests/home-axe.spec.ts` is mandatory. See `docs/agents/accessibility.md`.

<!-- BUILD-TEST:END -->

<!-- REFERENCES:START -->

## Symbolic references

Canonical artifacts, each maintained as its own source of truth. When you change one of these areas, update the implementation and the artifact in the same change.

| Artifact                           | Path                                                                                | Owns                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual identity                    | [`DESIGN.md`](./DESIGN.md)                                                          | Tokens, typography, components, color contracts. Pinned to upstream commit `97b4df92901b9353fbc71cfe1b51dad1ece01708` and `@google/design.md@0.1.1`.                                                                                                                        |
| design.md spec mirror              | [`openspec/.cache/design-md-spec.md`](./openspec/.cache/design-md-spec.md)          | `npx @google/design.md spec --format markdown` snapshot, refreshed weekly by `design-md-drift.yml`.                                                                                                                                                                         |
| design.md authoring guide          | [`docs/design-md.md`](./docs/design-md.md)                                          | Token-add procedure, OKLCH↔hex hybrid, upstream version-bump runbook.                                                                                                                                                                                                       |
| Build SSoT                         | [`build.config.json`](./build.config.json) → [`build.config.ts`](./build.config.ts) | `.build/{cache,reports,dist}` paths. JSON/YAML/TOML configs are generated.                                                                                                                                                                                                  |
| Token source                       | [`public/assets/theme.css`](./public/assets/theme.css)                              | Canonical aliases (`--bg`, `--bg-1/2`, `--line`, `--line-soft`, `--fg`, `--fg-1/2/3`, `--accent`, `--accent-dim`, `--accent-ink`, `--bad`, `--ok`, `--warn`, plus retained `--brand-teal` / `--surface`) over the staging `--nd-*` set. Consumers use canonical names only. |
| Security rules                     | [`rules/security/`](./rules/security/)                                              | ast-grep YAML rules; the "Rules in force" table above is kept 1:1 with disk by `tests/lint-sg-rules-doc-sync.test.mts`.                                                                                                                                                     |
| OpenSpec changes (active)          | [`openspec/changes/`](./openspec/changes/)                                          | `update-site-marketing-redesign`, `enhance-a11y-coverage`, `add-brand-assets-and-writing-pipeline`, `migrate-deploy-to-cloudflare-pages`, `migrate-legacy-tokens-to-layer`, `self-host-woff2-fonts`, `externalize-strings-and-add-i18n`.                                    |
| OpenSpec specs (live capabilities) | [`openspec/specs/`](./openspec/specs/)                                              | `build-config`, `check-site-quality`, `configure-copilot-environment`, `design-system-format`, `github-pages-deployment`, `manage-site-links`, `openspec-workflow`, `site-content`, `style-system`.                                                                         |
| Project skills                     | [`.agents/skills/`](./.agents/skills/)                                              | Per-project SKILL.md scaffolds for the OpenSpec workflow (`opsx:*`).                                                                                                                                                                                                        |
| Review skills                      | `.claude/skills/review-verification-protocol/` (user skill)                         | False-positive reduction rules; mandatory before any review report.                                                                                                                                                                                                         |
| Agent reference docs               | [`docs/agents/`](./docs/agents/README.md)                                           | Detail behind every section of this file; path citations gated with this file.                                                                                                                                                                                              |
| CI workflow                        | [`.github/workflows/playwright.yml`](./.github/workflows/playwright.yml)            | Sharded test matrix, visual-regression, accessibility, and merge-reports jobs (open issues in `docs/agents/testing.md`).                                                                                                                                                    |

The OpenSpec rows are kept 1:1 with disk by `tests/lint-agents-md-symbolic-refs-sync.test.mts`.

<!-- REFERENCES:END -->
