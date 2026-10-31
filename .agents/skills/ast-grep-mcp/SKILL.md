---
name: ast-grep-mcp
description: >-
  The ast-grep MCP server in artagon-site: dump_syntax_tree,
  test_match_code_rule, find_code, and find_code_by_rule. Use to learn node
  kinds, to prove a YAML rule on snippets before you run it, and to run kind,
  regex, or relational rules (such as a CSS class token inside Astro attributes)
  that a plain pattern cannot express. Covers the absolute project_folder,
  worktrees, the unpinned engine, and reporting repo-relative paths.
---

# ast-grep MCP server in artagon-site

Claude Code loads the server from `.mcp.json`, and `.claude/settings.json` enables it (`enabledMcpjsonServers`) and pre-approves all four tools. Codex loads it from `.codex/config.toml` once the project is trusted. Call the tools directly; never wrap the server in a shell command or `rtk`.

The server is `ast-grep-mcp-server` from `PATH`, not pinned here, and it runs the global `ast-grep` (0.50 here), not the pinned 0.42.1 engine. Every tool only reads. There is no rewrite tool: for codemods, use the CLI (the ast-grep skill).

## Tools

| Tool                   | Arguments                                                               | Use                                                                                       |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `dump_syntax_tree`     | `code`, `language`, `format`: `cst` (default), `ast`, or `pattern`      | See the node kinds in a snippet, or how ast-grep reads a pattern, before you write a rule |
| `test_match_code_rule` | `code`, `yaml`                                                          | Prove a YAML rule on snippets; reads no files                                             |
| `find_code`            | `project_folder`, `pattern`, `language`, `max_results`, `output_format` | Pattern search                                                                            |
| `find_code_by_rule`    | `project_folder`, `yaml`, `max_results`, `output_format`                | Rule search: `kind`, `regex`, `inside`, `has`, `not`, `all`, `any`                        |

## Rules for this repo

- `project_folder` must be an absolute path: the checkout root (`rtk git rev-parse --show-toplevel`) or a folder under it. In a git worktree, pass the worktree, not the main checkout.
- Started from the repo root, the server picks up `sgconfig.yml`, so `.astro` files parse as `html`: `find_code` with pattern `<Header />` and language `html` finds `src/layouts/BaseLayout.astro`.
- Always set `language`, and set `max_results` (20 is a good start). There is no globs argument: narrow the search with a deeper `project_folder` such as `src/components`.
- Use `output_format: "json"` when you need metavariable captures or exact ranges.
- Results print absolute paths. Report them as repo-relative paths.
- Add `stopBy: end` to `inside` and `has` so the search walks the whole tree.
- "No matches found" means no match or a rule that does not fit the code. Prove the rule on a snippet that must match before you trust an empty result.

## From question to rule

1. Run `dump_syntax_tree` on a small real snippet (`format: cst`) to find the node kinds, such as `attribute_value` or `self_closing_tag` in `html`.
2. Write the rule. Run `test_match_code_rule` with code that must match and code that must not.
3. Run `find_code_by_rule` on the narrowest folder, then confirm each hit in source.
4. If it should become a lint rule, add the YAML under `rules/security/`, add its row to the AGENTS.md "Rules in force" table, and verify with `npm run lint:sg` (the pinned engine) and `tests/lint-sg-rules-doc-sync.test.mts`. `docs/agents/static-analysis.md` covers authoring.

## Example: where is a CSS class used in templates?

```yaml
id: class-token
language: html
rule:
  kind: attribute_value
  regex: '(^|\s)ui-card(\s|$)'
```

This matches `class="ui-card hero"` and `class="x ui-card"` but not `class="ui-card-badge"`. A `\bui-card\b` regex would match `ui-card-badge` too, because a hyphen is a word boundary. The rule sees plain attribute values only: search `class:list={…}` expressions, `.tsx`, tests, and CSS with `rtk rg` (the ripgrep skill).
