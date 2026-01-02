# Copilot Context

This repository uses OpenSpec for spec-driven development. Start with the authoritative workflow in `openspec/AGENTS.md`.

Required references:
- `openspec/AGENTS.md`
- `openspec/project.md`
- `openspec/contributing.md`
- `.github/copilot-instructions.md`
- `.github/copilot-review-instructions.md`

When reviewing or implementing a change:
1. Run `openspec list` to identify the active change.
2. Read `openspec/changes/<change-id>/proposal.md`, `tasks.md`, and the spec deltas under `openspec/changes/<change-id>/specs/`.
3. Confirm the parent spec issue (label `spec`) and align implementation with acceptance criteria.
4. Use `openspec/specs/` as the source of truth for current behavior.
5. Update `.agents/context/glossary.md` with a concise branch summary.
6. Check CI status and address Copilot review comments before marking work complete.

Branch naming for OpenSpec work: `feature/site(<spec#>)-<feature-short-name>`.
