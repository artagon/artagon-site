---
name: ripwire
description: >-
  ripwire in artagon-site: find where to start on a task, and trace callers,
  callees, use sites, blast radius, and affected tests for TypeScript and
  JavaScript with `rtk ripwire .`. Use before reading many files, before
  changing a .ts or .mjs symbol, and before claiming a change is safe. Covers
  what ripwire cannot see here (.astro, .mdx, .css, HTML), the pre-approved call
  form, the flags that write files or start servers, and how the user-level
  ripwire-* skills apply in this repo.
---

# ripwire in artagon-site

ripwire 0.5 parses source with tree-sitter and ranks symbols. It needs no build and no daemon. In this repo it sees `.ts`, `.mts`, `.tsx`, `.js`, and `.mjs`, plus JSON, TOML, and YAML keys and Markdown headings. It cannot parse `.astro` (frontmatter or template), `.mdx`, `.css`, or HTML, and 0.5 has no option to change that.

## Call form

Run `rtk ripwire . <verb> --legend=compact` from the checkout root. Claude Code pre-approves `rtk ripwire . …`. Any other root is not pre-approved, and a git URL as the root clones over the network.

```bash
rtk ripwire . --help-task="<task>" --legend=compact  # names one verb for the task; advice only
rtk ripwire . --for="<task>" --legend=compact  # ranked starting points
rtk ripwire . --callers=SYM --legend=compact  # one-hop callers; write FILE:NAME when names repeat
rtk ripwire . --callees=SYM --legend=compact
rtk ripwire . --uses=SYM --legend=compact  # use sites with a role per row
rtk ripwire . --impact=SYM --legend=compact  # transitive blast radius
rtk ripwire . --path=A,B --legend=compact  # shortest call path from A to B
rtk ripwire . --affected=src/lib/charset.ts --legend=compact  # tests that reach a changed file
rtk ripwire . --expand=src/lib/charset.ts:safeJsonLd --top-k=0  # one symbol's body
rtk ripwire . --outline=src/lib/charset.ts:safeJsonLd --top-k=0  # its control-flow skeleton
rtk ripwire . --edit-check=SYM --legend=compact  # did the contract change against git HEAD?
rtk ripwire . --situ  # blast radius and tests for the working-tree diff; prose, so no --legend
rtk ripwire . --quality-delta  # what the diff made worse; read the rows, not just the exit code
rtk ripwire . --skipped --legend=compact  # why a file is not in the index
rtk ripwire . --doctor  # tool health
rtk ripwire . --scan-skills=.agents/skills  # injection and exfiltration scan of skill files
```

Without `--top-k=0`, `--expand` and `--outline` also print the ranked map. `--legend=compact` works only on the XML verbs; `--situ` prints prose and fails with it.

## What it misses here

- Astro and MDX callers. `rtk ripwire . --uses=safeJsonLd` lists only `tests/charset.test.mts`; the production callers are `src/components/SeoTags.astro` and `src/pages/faq/index.astro`. For any symbol that a page, component, layout, or MDX file can reach, add `rtk rg -n -g '*.astro' -g '*.mdx' 'SYM\(' src` (the ripgrep skill) and, for component tags, ast-grep with `--lang html` (the ast-grep skill). Report the ripwire result as `PARTIAL` until you have.
- Never act on `--dead-code` in `src/`. Helpers called only from `.astro` frontmatter show up as dead.
- CSS classes, custom properties, content-collection IDs, and routes are strings. Search them as text; `docs/agents/code-intelligence.md` lists each boundary.
- Keep logic in `.ts` modules (`src/lib/`, `src/data/`) so ripwire, and ast-grep rules, can see it.

## Reading results

- Every count is a floor (`counts_floor="1"`), never a total. An empty result does not prove absence.
- A row with `amb=K`, or a high `graph_ambiguous=`, is a guess about which symbol was meant. Confirm it in source or with Serena.
- If a symbol you know exists is missing, run `--skipped`, then `--doctor`, and treat the result as `PARTIAL`.
- ripwire alone never supports "unused", "dead", or "no callers". That needs ast-grep or Serena plus a text search.
- `--quality-delta` exits `2` only when a symbol that already existed got worse (a major, unacknowledged finding). Rows for new symbols print but never gate, so exit `0` means "nothing that existed got worse", not "clean". If a `.ripwire_quality_baseline` pinned at another commit exists, the run deletes it and compares against git HEAD instead.

## Flags that prompt

These run commands, write files, or start servers, so Claude Code asks first. Use them only when the user asks: `--run-trace`, `--replace-symbol-body`, `--insert-before-symbol`, `--insert-after-symbol`, `--edit-plan`, `--note-add`, `--quality-baseline`, `--quality-ack`, `--baseline`, `--index-out`, `--export`, `--pin-census`, `--html`, `--cache=`, `--listen`, and `--allow-remote-edits`. Make edits with the native edit tool, not ripwire's edit verbs.

```bash
rtk ripwire . --note-add='SYM: text'  # asks first: writes .ripwire_notes
rtk ripwire . --quality-baseline  # asks first: writes .ripwire_quality_baseline
```

## The user-level ripwire-\* skills

When they are installed, `ripwire-router` and the other `ripwire-*` skills help you pick a verb. In this repo the rules above win: prefix `rtk`, use `.` as the root, leave the writing flags alone without approval, and pair every caller result with a text search over `.astro` and `.mdx`. This repo does not configure the ripwire MCP server, so use the CLI.
