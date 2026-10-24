# Design contract and precondition gates

The precedence rule and the three-artifact change discipline are in `AGENTS.md` under "Design contract and change discipline". This page holds the supporting detail.

## Sources of truth

- `DESIGN.md` at the repo root is the canonical visual identity contract, in the [google-labs-code/design.md](https://github.com/google-labs-code/design.md) format (alpha). Its upstream commit and npm pins are listed in the `AGENTS.md` "Symbolic references" table. The live capability spec that governs it is `openspec/specs/design-system-format/spec.md`; it was first authored in the archived `openspec/changes/archive/2026-05-05-adopt-design-md-format/` proposal.
- `openspec/.cache/design-md-spec.md` is a committed mirror of the upstream format spec, refreshed by the weekly `design-md-drift.yml` workflow.
- `docs/design-md.md` is the authoring and maintenance guide: precedence chain, adding a token, bumping the upstream version, the OKLCH↔hex hybrid policy, upstream attribution, and the `check:design-drift` allow-list.

Edits to `DESIGN.md` trigger `npm run lint:design` in postbuild and in the pre-commit hook, plus a PR-scoped workflow that posts the diff as a PR comment.

## Why the discipline exists

This codebase has a documented failure mode: DESIGN.md prose drifts from the implementation (the historical `--brand-teal → --ok` discrepancy), and OpenSpec changes claim work that has not shipped. Multi-agent reviews catch the drift only when all three artifacts are touched in the same diff.

## Precondition gates

| Gate                          | What it actually checks                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:oklch-hex-parity`      | DESIGN.md frontmatter hex values against the prose-cited OKLCH triples; fails on more than 1 LSB of drift per channel. Runs before `lint:design`.                                                                                                                                                                                                                                                                                                        |
| `lint:tokens`                 | Raw color literals (hex, rgb, rgba, hsl, hsla, oklch, oklab) in tracked `.css` and `.mdx` files, found through `git ls-files`. `public/assets/theme.css` gets a token-aware scan: raw colors are allowed on `--token:` declaration lines only. `DESIGN.md` is allow-listed because it carries the canonical literals. It does not scan `.astro`, `.ts`, or `.tsx` (ast-grep covers Astro `<style>` blocks), and it does not validate `var()` references. |
| `lint:design`                 | The design.md format linter; part of postbuild.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `lint:design-md-uniqueness`   | Exactly one tracked `DESIGN.md`, at the repo root (file paths, not token names). See bead `site-2m1.28` for the `new-design/` allow-list gap.                                                                                                                                                                                                                                                                                                            |
| `verify:design-prerequisites` | While `update-site-marketing-redesign` is in flight (its directory is not archived), fails if its `tasks.md` still cites `new-design/extracted/DESIGN.md` paths. After that change archives, it exits 0.                                                                                                                                                                                                                                                 |

Known gaps from the 2026-10-20 review (beads under epic `site-2m1`):

- `lint:tokens` exits 0 when a tracked file cannot be read (`site-2m1.20`).
- Untracked files are invisible to `lint:tokens` because it walks `git ls-files`. CI is unaffected; locally, re-run the gate after `git add`.
- No gate scans `.ts`/`.tsx` for raw colors, so a React `style={{ color: "#fff" }}` passes every color gate (`site-2m1.48`).
- Documentation drift between `build.config.json`, generated configs, and docs is tracked in `site-2m1.46`.
