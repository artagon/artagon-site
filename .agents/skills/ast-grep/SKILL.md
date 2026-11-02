---
name: ast-grep
description: >-
  Structural code search, rewrite previews, and the project linter in
  artagon-site, through `rtk ast-grep run`, `rtk ast-grep scan`, and
  `npm run lint:sg`. Use for code-shape
  questions, anti-patterns, component usage in Astro templates, codemods, and
  writing or checking rules in rules/security/. Covers the sgconfig.yml language
  mapping, positive controls, Astro frontmatter blindness, the pinned engine,
  and the flags that prompt. For YAML rules and syntax-tree dumps, see the
  ast-grep-mcp skill.
---

# ast-grep in artagon-site

ast-grep matches syntax, not text, so formatting and comments do not change a result. It is also the project linter: there is no ESLint.

## Language mapping

`sgconfig.yml` maps files to languages. Always pass `--lang`.

| Files                                | `--lang`                   |
| ------------------------------------ | -------------------------- |
| `.astro`, `.html`                    | `html` (the template only) |
| `.ts`, `.mts`, `.cts`, `.mjs`, `.js` | `typescript`               |
| `.tsx`, `.jsx`                       | `tsx`                      |
| `.css`                               | `css`                      |
| `.yml`, `.yaml`                      | `yaml`                     |
| `.json`                              | `json`                     |
| `.sh`, `.bash`, `.bats`, `.envrc`    | `bash`                     |

Astro frontmatter (the `---` block) is not parsed as TypeScript, so no pattern or rule sees it. Search frontmatter with `rtk rg -g '*.astro'`, and keep logic in `src/lib/*.ts`.

## Prove the pattern first

Exit `1` with no output means no match, and so does a pattern that parsed as a different node than you meant. A pattern that does not parse prints `Pattern contains an ERROR node` on stderr and still exits `0`, sometimes matching far more than you meant. Read stderr, and run a new pattern on a known match first:

```bash
rtk ast-grep run --lang html --pattern '<Header />' src/layouts  # matches src/layouts/BaseLayout.astro (global 0.50)
rtk ast-grep run --lang typescript --pattern 'safeJsonLd($$$A)' tests/charset.test.mts
rtk ast-grep run --lang html --pattern '<Header />' --debug-query=pattern src/layouts  # how the pattern parsed
```

## Search

```bash
rtk ast-grep run --lang typescript --pattern 'createHash($A)' src scripts tests  # plain calls only, not crypto.createHash(...)
rtk ast-grep scan --inline-rules '{id: create-hash, language: typescript, rule: {any: [{pattern: "createHash($A)"}, {pattern: "$O.createHash($A)"}]}}' src scripts tests  # both forms
rtk ast-grep run --lang html --globs '**/*.astro' --pattern '<TrustChainIsland $$$A />' src  # component usage
rtk ast-grep run --lang tsx --pattern 'useEffect($$$A)' src
rtk ast-grep run --lang typescript --pattern 'safeJsonLd($$$A)' --json=stream tests  # one JSON match per line
rtk ast-grep scan --inline-rules '{id: class-token, language: html, rule: {kind: attribute_value, regex: "(^|\\s)ui-card-badge(\\s|$)"}}' src  # a class in a plain attribute; class:list needs rtk rg
```

- `$X` matches one node, `$$$X` zero or more, and `$_` one node without capturing. A metavariable used twice must match the same text both times.
- ast-grep does not resolve types: `$X.foo()` matches every receiver.
- A call pattern matches one call shape. `createHash($A)` misses the member call `crypto.createHash(...)`; match both with an `any` rule, as above.
- `--globs` overrides the ignore files, so always pass a path such as `src` with it.
- A pattern must be valid code on its own. When it is not, or you need `kind`, `regex`, `inside`, or `has`, write a rule (`scan --inline-rules`, or the ast-grep-mcp skill).

## Rewrite

```bash
rtk ast-grep run --lang typescript --pattern 'oldCall($$$A)' --rewrite 'newCall($$$A)' src  # preview: prints a diff, writes nothing
rtk ast-grep run --lang typescript --pattern 'oldCall($$$A)' --rewrite 'newCall($$$A)' -U src  # asks first: writes files
```

After a rewrite, review `rtk git diff`, then run `npm run lint:sg` and the focused tests. Receivers of other types match too; revert those by hand. For a few call sites, use the native edit tool instead.

## Project linter

- After you write `.ts`, `.mjs`, `.js`, or `.astro`, run `npm run lint:sg` and fix every error-severity finding. CI runs `npm run lint:sg:ci`. On macOS, `./node_modules/.bin/sg scan` avoids the npm WouldBlock bug.
- The repo pins `@ast-grep/cli` 0.42.1. The global `ast-grep` (0.50 here), `rtk ast-grep scan`, and the MCP server can be newer. They are fine for exploring, but verify rule changes with the pinned engine.
- The two engines parse Astro differently. Under 0.42.1, `<Header />` matches nothing in `src/layouts/BaseLayout.astro` (it sees 0 self-closing tags there; 0.50 sees 17), and `no-set-html-directive` misses both `set:html` sites that 0.50 flags. `rtk ast-grep run` and `rtk ast-grep scan` reach the global engine; `npx` and npm scripts reach the pinned one. Run html searches with the global engine, and do not read a clean `npm run lint:sg` as proof that an html rule matched.
- New security rules are YAML files in `rules/security/`, with a row in the AGENTS.md "Rules in force" table; `tests/lint-sg-rules-doc-sync.test.mts` keeps the two 1:1. Rule authoring and known gaps: `docs/agents/static-analysis.md`.
- Never suppress a finding without approval. `npm run lint:sg:fix` rewrites files, so ask first.

## Flags that prompt

Claude Code pre-approves only `rtk ast-grep run` and `rtk ast-grep scan`. These still ask, because they write files, select alternate configuration, or load native code: `-U` / `--update-all`, standalone `-i` / `--interactive`, `-c` / `--config`, and `--custom-languages`. USMR 14.92 adds the configuration gate, including attached short values. Codex mirrors `-c` / `--config` immediately after `run` or `scan`; later options are not prefix rules.

The `run` rewrite preview (`-r` / `--rewrite`) stays pre-approved: it prints a diff until interactive or update mode is selected. On `scan`, `-r` means `--rule` instead. The existing interactive/update rules catch `-iU` and `-Ui`; a general clustered-flag or quoted-argument check needs an argument-aware hook. Do not replace the interactive rule with a broad `*-i*` pattern: it also catches the read-only `--inline-rules` examples above. Keep short options separate.

```bash
rtk ast-grep scan --update-all  # asks first: applies every rule fix
rtk ast-grep scan --config <path>  # asks first: selects alternate configuration
rtk ast-grep scan -c <path>  # asks first: same configuration gate
```
