# DX Review — adopt-design-md-format

Dimension: DEVELOPER-EXPERIENCE / CONTRIBUTOR WORKFLOW / TOOLING ERGONOMICS

---

## F1 — Color token edit ritual is undocumented

**Severity: High**
**Citation:** tasks.md:48 (3.3), tasks.md:65 (5.1), design.md:46–52 (Decision #2)

Adding one new color token requires: (1) edit OKLCH prose, (2) re-derive sRGB hex, (3) add hex to YAML frontmatter, (4) update `theme.css`, (5) verify `check:design-drift` still passes, (6) verify `contrast-ratio` warning is not newly tripped if the token is used in a component. This is a 5-step ritual spread across at least three files. None of the tasks create a "how to add a token" section in `docs/design-md.md` — task 5.1 mentions the hybrid policy but not the step-by-step sequence.

**Remediation:** Add a "Adding a new color token" checklist to `docs/design-md.md` as an explicit section. Six numbered steps with file paths. Can be done inside task 5.1 without new tasks.

---

## F2 — No watch mode or pre-commit hook for lint:design

**Severity: High**
**Citation:** tasks.md:22–23 (2.3), design.md:68–72 (Decision #5)

`lint:design` is wired into `postbuild` only. A contributor running `npm run dev` gets no feedback until they run a full build. There is no `lint:design --watch` task and no pre-commit hook. The spec and tasks are silent on both. A contributor could author a broken `{colors.nonexistent}` ref, iterate for an hour in dev, and discover it only when CI fails.

**Remediation:** Add task 2.3a: "Add `lint:design` to the project's pre-commit hook (via `lint-staged` or a bare `.husky/pre-commit` shell step) scoped to changes touching `DESIGN.md`." If `@google/design.md` supports `--watch`, add a `lint:design:watch` script. Document both in task 5.1.

---

## F3 — broken-ref JSON output is not human-readable in CI

**Severity: Medium**
**Citation:** design.md:10 (linter rules), design-system-format/spec.md:33–37 (Lint Gate requirement)

The spec requires `error`-severity findings to fail the build, and `warning`s to surface in the run log. It does not specify output format. If the upstream CLI emits raw JSON on error, contributors reading CI logs see machine output. The spec also lacks any requirement for a formatter wrapper (e.g., a `--reporter pretty` flag or a thin script that maps `broken-ref` to a human sentence with the offending component name and file location).

**Remediation:** In task 2.2, specify `lint:design` script as `npx @google/design.md lint --reporter pretty DESIGN.md` (or add a thin wrapper) if the CLI supports it. If not, add a task 2.2a noting the formatter gap and accepting the raw output explicitly so it is a documented decision rather than an accidental omission.

---

## F4 — Precedence chain phrasing is contradictory for AI agents

**Severity: Medium**
**Citation:** design.md:22–23 (Goals), design-system-format/spec.md:75–76 (Precedence Chain requirement)

The Goals section states precedence as `DESIGN.md → openspec/specs/* → implementation` implying DESIGN.md wins. The spec requirement states "when DESIGN.md and an openspec spec disagree, the spec SHALL be authoritative." An agent reading only the Goals block will treat DESIGN.md as the top authority; one reading only the Precedence Chain requirement will treat openspec specs as top authority. These are not equivalent and will produce divergent agent behavior on a conflict.

**Remediation:** Align the phrasing in one pass. Suggested canonical form: "openspec/specs/\* governs behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change." Add this phrasing to task 5.3 (AGENTS.md update) explicitly.

---

## F5 — spec:cache regeneration is not in any contributor checklist

**Severity: Medium**
**Citation:** tasks.md:84 (7.7), design.md:63–64 (Decision #4)

CI fails if the committed spec cache diverges from a fresh run. A contributor bumping `@google/design.md` in `package.json` must remember to also run `npm run spec:cache && git add openspec/.cache/design-md-spec.md`. This requirement is described in design.md Decision #4 and surfaced in task 7.7 as a quality gate, but there is no checklist item in `docs/design-md.md` or a pre-commit hook that runs `spec:cache` automatically when `package.json` changes.

**Remediation:** Add to task 5.1: include a "Bumping @google/design.md version" checklist in `docs/design-md.md` that lists `npm run spec:cache && git add openspec/.cache/design-md-spec.md` as a required step. Optionally add a lint-staged hook that runs `spec:cache` when `package.json` is staged.

---

## F6 — Phase 3.4 section reorganization is a single task for 761 lines

**Severity: Medium**
**Citation:** tasks.md:49 (3.4)

Reorganizing 761 lines of prose across 8+ canonical sections is described in one task line. This produces a single enormous diff that loses `git blame` on moved content, makes code review impractical, and blocks any parallel edits to DESIGN.md during the sprint. There is no instruction to use `git mv` semantics or to split the move into a format-only commit followed by content edits.

**Remediation:** Split task 3.4 into: 3.4a (bulk section rename and move, structure-only commit, no prose changes), 3.4b (prose edits within newly-ordered sections). Add a note: "Commit 3.4a with message `refactor(design): reorder sections, no content changes` to preserve blame legibility."

---

## F7 — OKLCH conversion table has no auto-derivation script

**Severity: Low**
**Citation:** tasks.md:48 (3.3), design.md:47–52 (Decision #2)

The conversion table committed to `docs/design-md.md` will drift as tokens evolve unless it is regenerated mechanically. The spec mandates the table exists for re-derivation, but no script or `npm run` command converts OKLCH to hex. Contributions that add OKLCH tokens must manually compute hex, which is error-prone at high chroma.

**Remediation:** Add task 3.3a: "Add `scripts/oklch-to-hex.mjs` that reads OKLCH triples from DESIGN.md prose (or a sidecar `.oklch.yaml`) and outputs hex equivalents for pasting into frontmatter." Wire as `npm run derive:hex`. Low priority but prevents table staleness. Document in task 5.1.

---

## F8 — New contributor onboarding gap: lint:design is invisible after clone

**Severity: Low**
**Citation:** tasks.md:65–67 (5.1–5.3), proposal.md:19

A contributor running `git clone && npm install && npm run dev` will never see `lint:design` mentioned. The script exists in `package.json` but nothing in the dev startup flow (README, `npm run` help, or a dev welcome message) points to it. They discover it only when CI fails or they read AGENTS.md.

**Remediation:** Task 5.2 (README update) should include a one-line `npm run` cheat-sheet that lists `lint:design` alongside `lint:sg:ci`. No new tasks required; expand the scope of 5.2.

---

## Summary

| #   | Severity | Must-Fix |
| --- | -------- | -------- |
| F1  | High     | Yes      |
| F2  | High     | Yes      |
| F3  | Medium   | No       |
| F4  | Medium   | Yes      |
| F5  | Medium   | Yes      |
| F6  | Medium   | No       |
| F7  | Low      | No       |
| F8  | Low      | No       |

Must-fix count: **4** (F1, F2, F4, F5)

All remediations target `tasks.md` additions or `docs/design-md.md` content expansions. No architectural changes required.

**Verdict: APPROVE-WITH-CHANGES** — 4 must-fix items, all addressable within existing tasks by adding checklist items and one pre-commit hook task. The core adoption design is sound; the DX gaps are in documentation and feedback-loop coverage, not in the architecture of the change.
