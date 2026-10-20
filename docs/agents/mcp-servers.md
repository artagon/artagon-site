# MCP servers

Project MCP servers are declared per client:

- `.mcp.json` for Claude Code.
- `.codex/config.toml` for Codex. Codex loads it only when the project is trusted.
- Gemini CLI reads `.gemini/settings.json`, which sync does not manage.

The `serena` entries are rendered by `sync-mcp.sh --project <repo-root> --include serena --agent claude --agent codex` from the artagon-cli-mcp plugin in the artagon-scripts repo. Shared servers such as `context7` come from each client's user-level config through the local MCP controller, not from this repo. The localhost URLs resolve only on a machine that runs that controller.

## Active servers

| Server            | Purpose                                                        | How to use                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `context7`        | Current docs for Astro, MDN, Playwright, and other libraries   | Call `resolve-library-id`, then `query-docs` with the specific topic. Served from user-level config.                                                           |
| `serena`          | LSP-backed symbol navigation and symbol-aware edits            | Named components, functions, hooks, types, references. Per-repo HTTP daemon at `http://127.0.0.1:9141/mcp`; if it refuses connections, re-run project sync.    |
| `ast-grep`        | Tree-sitter structural search and rule testing                 | Syntactic patterns in Astro (as HTML), TS/TSX, JS, CSS, YAML, JSON, Bash.                                                                                      |
| `playwright`      | Browser automation for rendered pages, screenshots, DOM        | Exploratory work and long-running browser sessions. Runs the globally installed `playwright-mcp` (version not pinned here).                                   |
| `chrome-devtools` | Performance traces, Lighthouse, network and console inspection | Claude only. Runs the globally installed `chrome-devtools-mcp` (version not pinned here).                                                                      |

## Playwright lanes

- Use `playwright-cli` for agent browser verification and generating new Playwright specs. The repo pins its behavior through `.playwright/cli.config.json` and writes session output under `.build/reports/playwright-cli/`.
- Use the `playwright` MCP server for exploratory work and long-running interactive sessions.
- Use the Playwright test runner for the automated suite and CI.

## context7

```
resolve-library-id: "astro"       → /withastro/astro
resolve-library-id: "playwright"  → /microsoft/playwright
query-docs: /withastro/astro      "content collections getEntry"
query-docs: /microsoft/playwright "locators"
```

Use it for Astro APIs, MDX, Playwright selectors, and any library whose API may have moved since training. Astro 5 → 6 changed real surface area. Keep queries generic: no private source, names, or credentials.

## Serena tools

| Capability                                               | MCP tool                                       |
| -------------------------------------------------------- | ---------------------------------------------- |
| Find a component, function, hook, class, or type by name | `find_symbol`                                  |
| Find callers, references, or usages                      | `find_referencing_symbols`                     |
| Inspect a file or module outline                         | `get_symbols_overview`                         |
| Replace a function, component, or method body            | `replace_symbol_body`                          |
| Insert code before or after a known symbol               | `insert_before_symbol` / `insert_after_symbol` |
| Rename a symbol                                          | `rename_symbol`                                |
| Store durable project knowledge                          | `write_memory` / `read_memory`                 |

Install dependencies (`npm ci`) before LSP-dependent work so the TypeScript, Astro, and CSS servers can resolve imports. Lifecycle and fallbacks: `docs/agents/code-intelligence.md`.

## ast-grep MCP tools

| Capability                        | MCP tool               |
| --------------------------------- | ---------------------- |
| Inspect a snippet's syntax tree   | `dump_syntax_tree`     |
| Test a rule against a snippet     | `test_match_code_rule` |
| Search the codebase for a pattern | `find_code`            |
| Search with a YAML rule           | `find_code_by_rule`    |

Inspect the AST before writing a non-trivial pattern.

## Adding servers

- Add project-specific stdio servers to both `.mcp.json` and `.codex/config.toml`. Sync keeps entries it does not manage.
- Do not hand-edit the `serena` entry, and do not add controller-managed servers (`context7`, `tavily`, and the rest) here. Re-run project sync instead.
- Preview sync with `--dry-run` first. A non-dry sync needs explicit operator approval.
