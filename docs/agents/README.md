# Agent reference docs

Root `AGENTS.md` holds the rules every agent needs on every task. `CLAUDE.md` and `GEMINI.md` are symlinks to it. These pages hold the reference detail behind those rules. Read the matching page before you work in its area.

| Page                                           | Covers                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [code-intelligence.md](./code-intelligence.md) | ripwire, Serena, ast-grep, tgrep, and ripgrep recipes; this repo's analysis boundaries; evidence labels |
| [mcp-servers.md](./mcp-servers.md)             | Project MCP servers, context7 usage, Serena and ast-grep MCP tools, adding servers                      |
| [design-contract.md](./design-contract.md)     | DESIGN.md pins and mirrors, and the precondition gates behind the change discipline                     |
| [static-analysis.md](./static-analysis.md)     | ast-grep linter configuration, rule authoring, and known rule-coverage gaps                             |
| [testing.md](./testing.md)                     | The three test runners, browser isolation, device matrix, snapshots, and test hot-spots                 |
| [review-workflow.md](./review-workflow.md)     | Multi-agent review lenses, tiers, custom briefs, and multi-model reviews through NTM                    |
| [accessibility.md](./accessibility.md)         | WCAG floor and the project's accessibility contracts                                                    |

Build artifacts and the `build.config.json` source of truth are in [`docs/build-artifacts.md`](../build-artifacts.md).

Rules for these pages:

- `AGENTS.md` wins when a page disagrees with it. Fix the page in the same change.
- Backticked repo paths in these pages must exist. `tests/lint-agents-md-path-citations.test.mts` checks `AGENTS.md` and every `docs/agents/*.md`.
- Cite sections, not line numbers. Line numbers go stale with the next edit.
