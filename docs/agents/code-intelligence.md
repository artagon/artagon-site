# Code intelligence in this repo

`~/.agents/TOOLS.md` defines the tools and evidence labels on every machine. This page is the repo override: what each tool sees here, how to call it, and where it goes blind. The short form is in `AGENTS.md` under "Code intelligence and search", and each tool's call forms and pitfalls are in its project skill: `.agents/skills/ripwire/`, `tgrep/`, `ripgrep/`, `ast-grep/`, and `ast-grep-mcp/` (USMR 14.86).

## Tool coverage

| Tool         | Sees in this repo                                                                                                                                                       | Blind to                                                                                            | Call it as                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ripwire 0.5  | `.ts`, `.tsx`, `.js`, `.mjs`; JSON/TOML/YAML keys; Markdown headings                                                                                                    | `.astro` (frontmatter and template), `.mdx`, `.css`, HTML                                           | `rtk ripwire . --uses=SYM --legend=compact`                                    |
| Serena (MCP) | Language servers in `.serena/project.yml`: typescript, html, markdown, yaml, scss                                                                                       | Config strings, content-collection IDs, CSS class strings; exact only with `node_modules` installed | `find_symbol`, `find_referencing_symbols`, `get_symbols_overview`              |
| ast-grep     | Every language in `sgconfig.yml` `languageGlobs`: `.astro` and `.html` as `html`, `.ts/.mts/.mjs/.js` as `typescript`, `.tsx/.jsx` as `tsx`, plus css, yaml, json, bash | Astro frontmatter (the `---` block is not parsed as TypeScript); types                              | `rtk ast-grep run --lang html --globs '**/*.astro' --pattern '<Header />' src` |
| tgrep        | Every text file, from a trigram index in `.tgrep/`                                                                                                                      | Files changed after the last `tgrep index .`                                                        | `rtk tgrep '<regex>' .`                                                        |
| ripgrep      | Every text file on disk now                                                                                                                                             | Nothing; it is plain text, so structure and types are invisible                                     | `rtk rg -n '<regex>' <path>`                                                   |

### ripwire cannot parse Astro

ripwire 0.5 has no extension-to-language mapping, and its only config file key (`.ripwire_config`: `register_macros`) is for dead-code exemptions. Measured on this repo, `rtk ripwire . --uses=safeJsonLd` reports uses only in `tests/charset.test.mts`. It misses both production call sites, `src/components/SeoTags.astro` and `src/pages/faq/index.astro`. Consequences:

- Treat every ripwire caller list, `--impact`, and `--affected` result as a floor (`PARTIAL`) whenever the symbol can be reached from a component, page, layout, or MDX file.
- Never act on `ripwire --dead-code` for `src/`. Helpers called only from `.astro` frontmatter show up as dead.
- Keep logic in `.ts` modules (`src/lib/`, `src/data/`, `src/scripts/`) so the call graph sees definitions. This is also the security rule for ast-grep: frontmatter is outside every rule.
- For Astro consumers, use ast-grep (`--lang html`) for template usage and `rtk rg`/`rtk tgrep` for frontmatter.
- Serena's newer releases ship an `astro` language server ("subsumes typescript/javascript for .astro projects; requires npm"). Switching `.serena/project.yml` to it gives semantic coverage of `.astro` files. Do that as a deliberate config change, not as a side effect.

### Serena lifecycle

- The daemon is a per-repo HTTP server at `http://127.0.0.1:9141/mcp`, started by project sync (`docs/agents/mcp-servers.md`). Check it with `rtk mcp.sh -m serena status` where `mcp.sh` is on `PATH`.
- Connection refused means `UNAVAILABLE`. Say so, then use ripwire, ast-grep, and tgrep or `rtk rg` for symbol lookups.
- Without `node_modules`, the TypeScript server cannot resolve imports, so results are `PARTIAL`. Run `npm ci` first when exact references matter.
- Newer Serena releases rewrite `.serena/project.yml` on start (a schema migration that renames `languages:` to `language_servers:`). Do not commit that rewrite by accident. Restore it with `rtk git restore .serena/project.yml`, or commit it as its own reviewed change.

### ast-grep practice

- Always pass `--lang`. Test a new pattern on a known match first. `<Header />` under `src/layouts/` (in `BaseLayout.astro`) is a reliable positive control for `html`, and `safeJsonLd($$$A)` in `tests/charset.test.mts` is one for `typescript`. Exit 1 with no output means no match, or a pattern that parsed as a different node than you meant. A pattern that does not parse prints `Pattern contains an ERROR node` on stderr and still exits 0 (checked on ast-grep 0.42.1 and 0.50), so read stderr.
- The global CLI can be newer than the version pinned in `package.json`. Ad hoc searches may use the global binary. Rule verification must use the pinned engine (`npm run lint:sg`, or `./node_modules/.bin/sg` after `npm ci`). The two parse Astro differently: the pinned 0.42.1 sees no self-closing tags in `src/layouts/BaseLayout.astro` (0.50 sees 17), so the `<Header />` control matches only under 0.50, and `no-set-html-directive` flags the two `set:html` sites only under 0.50 (checked 2026-10-26).
- The ast-grep MCP server (`dump_syntax_tree`, `test_match_code_rule`, `find_code`, `find_code_by_rule`) is fine for exploration. Claude Code pre-approves these four read tools (see Enforcement); Codex still asks for each call, so batch your questions there.

### tgrep index

- The index lives in `.tgrep/` at the repo root (or worktree root) and is gitignored.
- The husky post-checkout (branch checkouts only), post-merge, and post-rewrite hooks run `scripts/tgrep-refresh.sh`, which rebuilds the index in the background and returns at once. It does nothing when tgrep is not installed or `SKIP_TGREP_INDEX=1` is set. While a rebuild holds the lock (`tgrep-refresh.lock` in the git dir; ten minutes old counts as stale), a new request makes that rebuild run once more, so a rebase's post-checkout and post-rewrite both land. It never fails the git command.
- Manual rebuilds write index files and prompt (USMR 14.92): use `rtk tgrep index .` after a large edit. Check the age with `rtk tgrep status .`.
- Use `rtk rg` for files you edited this session unless `tgrep serve .` is running.

## Enforcement

USMR 14.85 turns the routing rules into settings. `.claude/settings.json` denies the blocked commands in every Claude Code permission mode, and `.codex/rules/search.rules` forbids them in Codex once the project is trusted. `tests/search-tool-mandate.test.mts` checks both, plus the tgrep hooks.

| Blocked                                            | Use instead                                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `grep -rn`, `egrep`, `fgrep`, bare `rg`, Grep tool | `rtk rg -n '<regex>' <path>`; `rtk tgrep '<regex>' .` for repeated sweeps                       |
| `find . -name '<glob>'`                            | `rtk rg --files -g '<glob>' <path>`                                                             |
| `git grep`, `rtk git grep`, `rtk grep`             | `rtk rg -n '<regex>'`; for tracked files only, `rtk git ls-files` then `rtk rg` on those paths  |
| A text search for callers or use sites             | `rtk ripwire . --callers=SYM` / `--uses=SYM` for `.ts`, plus `rtk rg` over `.astro` and `.mdx`  |
| A regex for code shape                             | `rtk ast-grep run --lang <lang> --pattern '<pat>' <path>`, or the ast-grep MCP `find_code` tool |

The read-only forms of `rtk rg`, `rtk tgrep`, `rtk ripwire .` (alone or immediately followed by a long flag), `rtk ast-grep run` and `scan`, and the ast-grep MCP read tools (`dump_syntax_tree`, `find_code`, `find_code_by_rule`, `test_match_code_rule`) are pre-approved. USMR 14.92 keeps the following literal forms behind a prompt because they can run a program, write files, select configuration, or start a server:

| Tool     | Flags that prompt                                                                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rg       | `--pre`, `--hostname-bin`, `--search-zip` / standalone `-z` (starts decompressors); arbitrary short-flag clusters remain a gap |
| tgrep    | `index` (writes index files), `serve` (a persistent server), including global options before either subcommand; `--index-path` |
| ast-grep | `-U` / `--update-all`, standalone `-i` / `--interactive` (the interactive/update rules also catch `-iU` and `-Ui`), `-c` / `--config` (alternate configuration), `--custom-languages` (native libraries) |
| ripwire  | `--run-trace`, `--replace-symbol-body`, `--insert-before-symbol`, `--insert-after-symbol`, `--edit-plan`, `--note-add`, `--quality-baseline`, `--quality-delta`, `--quality-ack`, `--baseline`, `--index-out`, `--export`, `--pin-census`, `--html`, `--cache=`, `--mcp`, `--listen`, `--allow-remote-edits` |

A ripwire run on a git URL is not pre-approved (it clones over the network). An immediate second positional root also loses pre-approval. A root supplied after a long flag can still match the allow glob; an argument-aware hook must validate the complete argv and resolved paths before this can be treated as a root boundary. No hook is implemented in USMR 14.92.

Claude Code evaluates deny rules before ask rules and ask before allow rules, regardless of specificity. Its Bash `*` matches text including spaces; it does not normalize tool arguments or short-flag clusters. Compound commands are split by the client, and a matching subcommand can require a prompt. Ask rules suffice for the matching forms above; no new deny rule is needed. See the official [permission precedence](https://code.claude.com/docs/en/permissions#manage-permissions), [wildcard syntax](https://code.claude.com/docs/en/permissions#wildcard-patterns), [compound-command handling](https://code.claude.com/docs/en/permissions#compound-commands), and [Bash rule limits](https://code.claude.com/docs/en/permissions#bash-rule-limits). `bypassPermissions` skips permission prompts; these ask rules are not an enforcement boundary in that mode.

The ask list is a conservative list of known spellings. A general clustered `-z` check cannot be expressed precisely with whole-text `*` globs without prompting unrelated read-only patterns containing `z`; use separate short flags pending the argument-aware hook. Ast-grep's `run -r` / `--rewrite` preview remains pre-approved, while `scan -r` means `--rule`. Do not broaden the interactive ask to `*-i*`, which also matches the read-only `--inline-rules` form. Tgrep subcommand globs can likewise match literal query text. The ripwire quality-delta gate conservatively includes the read-only committed-revision form. Re-check flag semantics with each tool's help when it changes.

Codex mirrors only representable argv prefixes: direct tgrep `index`/`serve`, those subcommands after leading `--hidden`, ast-grep `-c`/`--config` immediately after `run`/`scan`, and standalone ripwire `--mcp`/`--quality-delta` immediately after `.`. There are no allow rules granting unsandboxed access. Prefix rules cannot match arbitrary later flags, arbitrary attached `=value` suffixes, clustered short flags, or distinguish extra roots from option values. Codex also cannot fully parse scripts with redirects, variables, or globs. Neither client's string rules are a sandbox; the proposed hook and filesystem/network sandbox enforce different boundaries.

## Where static analysis stops here

Links across these boundaries are strings or conventions. Search them as text before claiming "unused", "no callers", or "safe to rename".

| Boundary                            | Example                                                                                     | Search for                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Astro and MDX component usage       | `<TrustChainIsland client:visible />` in `src/pages/`, `<Card>` in `src/content/`           | The tag with ast-grep `--lang html`, plus `rtk rg '<Name[ />]'` over `src/`                          |
| Astro frontmatter imports and calls | `safeJsonLd(...)` in `src/components/SeoTags.astro`                                         | `rtk rg 'name\(' src --glob '*.astro'`                                                               |
| CSS classes                         | Global `.ui-*` utilities in `public/assets/theme.css`, scoped classes in `.astro` `<style>` | The class string in `.astro`, `.tsx`, `.mdx`, tests, and `class:list` expressions                    |
| CSS custom properties               | `--accent`, `--nd-*` in `public/assets/theme.css`                                           | `var(--name` in CSS, `.astro`, `.tsx` style objects; `tests/lint-orphan-tokens.test.mts`             |
| Content collections                 | `getEntry('pages', 'vision')`, `getCollection('writing')`                                   | Collection and entry IDs against `src/content.config.ts` and `src/content/` file names               |
| Glossary terms                      | `t("OIDC")`                                                                                 | The term key in `src/data/glossary.ts`                                                               |
| npm scripts                         | `npm run lint:sg:ci`                                                                        | Script names in `package.json`, `.github/workflows/`, docs; `tests/lint-orphan-npm-scripts.test.mts` |
| Build paths                         | `BUILD.reports.playwright.html`                                                             | Keys in `build.config.json`, generated `lighthouserc.json` / `lychee.toml`, and `build.config.ts`    |
| Test discovery                      | `testMatch`, vitest `include`, the node:test file list                                      | `playwright.config.ts`, `vitest.config.ts`, and the `test:node` script                               |
| DOM ids and data attributes         | `data-theme`, `data-hero-font`, `id="main-content"`                                         | Inline scripts in `src/layouts/BaseLayout.astro`, tests, and CSS attribute selectors                 |
| Routes                              | `src/pages/platform/index.astro` serves `/platform`                                         | `href` strings, `public/_redirects`, `src/lib/indexation.ts`, sitemap config in `astro.config.ts`    |

## Evidence

- Tag each code-intelligence claim `SUPPORTED`, `PARTIAL`, or `UNAVAILABLE`, and name the tool. A claim that crosses a boundary above stays `PARTIAL` until that boundary has been searched.
- "Unused" or "dead" needs two independent lanes: ast-grep or Serena, plus a text search (`rtk rg` or `rtk tgrep`) over code, config, tests, and docs. ripwire alone never supports an absence claim.
- These changes need `SUPPORTED` evidence before you make them: deleting or renaming a component, export, CSS class, token, route, or npm script; and touching `set:html`, JSON-LD, CSP, or SRI code.

## Recipes

### Is this CSS class still used?

1. `rtk rg -n 'class-name' src tests public` covers markup, `class:list` expressions, template literals, tests, and the stylesheet.
2. For a structural check, run an ast-grep YAML rule through `find_code_by_rule` (language `html` for `.astro`) with `kind: attribute_value` and `regex: '(^|\s)class-name(\s|$)'`. A plain `--pattern` cannot match part of an attribute value, and `\bclass-name\b` also matches `class-name-suffix`, because a hyphen is a word boundary.
3. Before deleting, check the Playwright specs, which select elements by class: `rtk rg -n '\.class-name' tests`.

### Who calls this TypeScript helper?

1. `rtk ripwire . --callers=helper --legend=compact` for `.ts`/`.tsx`/`.mjs` callers.
2. `rtk rg -n 'helper\(' src --glob '*.astro' --glob '*.mdx'` for Astro and MDX callers that ripwire cannot see.
3. Serena `find_referencing_symbols` when it is up and `node_modules` is installed.

### Rename an exported symbol

Follow `~/.agents/TOOLS.md` §6. Here, also search `.astro` and `.mdx` callers as text, update `DESIGN.md` and `docs/` citations, and re-run `npm run lint:sg` plus the affected vitest gates.
