# Copilot Instructions (OpenSpec Workflow)

This repository uses OpenSpec. Follow the authoritative workflow in `openspec/AGENTS.md`.

Core rules:
- Specs live in GitHub Issues labeled `spec` and as deltas under `openspec/changes/`.
- Built behavior lives in `openspec/specs/`.
- Proposals and tasks live in `openspec/changes/<change-id>/`.
- Link every implementation PR to its parent spec issue.

Before you code or review:
1. Run `openspec list` to identify the active change.
2. Read `openspec/changes/<change-id>/proposal.md` and `openspec/changes/<change-id>/tasks.md`.
3. Read the spec deltas in `openspec/changes/<change-id>/specs/` and the base spec in `openspec/specs/`.
4. Follow the conventions in `openspec/project.md` and `openspec/contributing.md`.

Key directories:
- `src/pages/`: Astro route pages.
- `src/components/`: reusable components.
- `src/components/ui/`: OpenSpec UI primitives.
- `public/assets/`: static CSS, images, icons.
- `openspec/`: OpenSpec workflow sources (specs, changes, guidance).
- `scripts/`: build and validation scripts.
- `docs/`: project documentation.

Implementation expectations:
- Keep changes scoped to the spec and proposal. Flag anything out of scope.
- Update `openspec/changes/<change-id>/tasks.md` as items are completed.
- Prefer existing UI utilities and components over ad-hoc CSS.
- Add or update tests to cover acceptance criteria when applicable.

Good vs bad patterns:
- Good: "PR references Spec #22, updates tasks.md, and implements every acceptance criteria item."
- Good: "Uses existing UI components and tokens instead of new one-off styles."
- Bad: "Adds new features not mentioned in the spec or proposal."
- Bad: "Changes global CSS utilities without updating specs or tasks."

For review guidance, follow `.github/copilot-review-instructions.md`.
