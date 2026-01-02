# Copilot Review Instructions (OpenSpec Compliance)

Start with `openspec/AGENTS.md`. Reviews must be grounded in the active OpenSpec change.

Review steps:
1. Verify the PR references a spec issue (label `spec`).
2. Identify the active change in `openspec/changes/<change-id>/`.
3. Read `proposal.md`, `tasks.md`, and the spec deltas in `openspec/changes/<change-id>/specs/`.
4. Check that every acceptance criteria item is implemented or explicitly deferred.
5. Flag scope creep: any work not described by the spec or proposal.
6. Confirm tests cover the spec requirements and note missing coverage.
7. Call out breaking changes not described in the spec.

Spec compliance ratings:
- Full: all acceptance criteria are met with appropriate tests.
- Partial: most criteria are met, gaps clearly listed.
- Minimal: only a small subset is met.
- None: no meaningful alignment with the spec.

Structured review format (use this in comments):

Spec Reference: <issue link or "missing">
OpenSpec Change: <change-id or "unknown">
Compliance Rating: <full|partial|minimal|none>

Acceptance Criteria Coverage:
- [ ] Item 1 ... (status)
- [ ] Item 2 ... (status)

Scope Creep:
- <list any out-of-scope changes>

Missing Tests:
- <list missing tests tied to criteria>

Breaking Changes:
- <list and confirm spec coverage>

Notes:
- <additional context or suggestions>
