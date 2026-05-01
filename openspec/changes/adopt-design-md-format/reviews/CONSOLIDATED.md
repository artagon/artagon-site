# Consolidated Adversarial Review — `adopt-design-md-format`

**Target:** OpenSpec change at `openspec/changes/adopt-design-md-format/`
**Reviewers:** 4 parallel adversarial sub-agents (architecture, supply-chain, DX, openspec-authoring).
**Date:** 2026-05-01
**Files reviewed:** `proposal.md`, `design.md`, `tasks.md`, 2 capability deltas (`design-system-format`, `style-system`).

> All four reviewers returned **APPROVE-WITH-CHANGES**. No reviewer recommended BLOCK. `openspec validate --strict` passes; findings are correctness/governance gaps the strict validator does not catch.

---

## Critical (1)

### C1 · ADDED-vs-MODIFIED mismatch on `style-system` delta

**Source:** OpenSpec authoring · `proposal.md:44,60`, `design.md:30` claim "MODIFIED"; `specs/style-system/spec.md:1` header is `## ADDED Requirements`.
The existing `openspec/specs/style-system/spec.md` has 3 requirements (Theme-Aware Fallback Tokens, UI Component Attribute Compatibility, Solid Card Variant); none mention DESIGN.md, so "Token Traceability to DESIGN.md" is genuinely new — `ADDED` is correct.
**Fix:** Update prose. Replace "MODIFIED" with "ADDED" in `proposal.md:44`, `proposal.md:60`, `design.md:30`. The delta header stays as-is.

---

## High (10)

### H1 · Precedence chain text contradicts itself

**Source:** Architecture (F2) + DX (F4) · `design-system-format/spec.md:73-85` says `DESIGN.md → openspec/specs/* → implementation` then says "spec SHALL be authoritative; DESIGN.md MUST be updated to match." Goals-section phrasing in `design.md:22-23` parses as DESIGN-wins; the requirement parses as spec-wins. Two readings produce divergent agent behavior on conflict.
**Fix:** Canonical phrasing: _"openspec/specs/\* governs behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change."_ Apply to Goals, Precedence Chain requirement, AGENTS.md update (Phase 5.3).

### H2 · Cross-change file edits to `update-site-marketing-redesign`

**Source:** Architecture (F3) + OpenSpec authoring (F4) · `tasks.md:56-61` Phase 4.1-4.3 edit `openspec/changes/update-site-marketing-redesign/{proposal,design,tasks}.md` directly. Decision #8's "no hard ordering" is unsafe: if the redesign rebases or lands first, Phase 4 produces conflicts on already-archived or stale content.
**Fix:** Replace Phase 4 in-place edits with a "depends-on" note. Either (a) explicitly order this change to land first and let the redesign's apply phase update its own paths, or (b) introduce a path indirection (symlink/alias) so neither change has to mutate the other. Delete tasks 4.1-4.3; keep 4.4 (re-validate) and 4.5/4.6 (cross-link in `openspec/project.md`).

### H3 · Drift detection requirement is duplicated across capabilities

**Source:** OpenSpec authoring (F3) · `specs/design-system-format/spec.md:110-117` ("Drift Detection — Best-Effort") AND `specs/style-system/spec.md:3-20` ("Token Traceability to DESIGN.md") both require `check:design-drift` to assert CSS-token-to-DESIGN.md tracing. Two specs owning the same enforcement creates a future ownership conflict when warn → error promotion ships.
**Fix:** Remove "Drift Detection (Best-Effort)" from `design-system-format`; drift is a CSS-token concern owned by `style-system`. Keep one home.

### H4 · Drift detection ships warn-only — load-bearing-but-toothless

**Source:** Architecture (F5) · `design.md:74-78`, `specs/design-system-format/spec.md:110-117` — warn-only "for one stable release cycle." A warning that gates nothing is operationally absent. Worse, the `style-system` ADDED requirement (H3) leans on this script for enforcement.
**Fix:** Either (a) ship at error-severity from day one with an explicit allow-list seeded from current orphans, or (b) remove the requirement entirely and file a follow-up `enforce-design-drift` change. Do not codify a warn-only enforcement contract.

### H5 · OKLCH↔hex hybrid has no enforcement primitive

**Source:** Architecture (F8) · `design.md:44-52` Decision #2 makes hex authoritative for the linter and OKLCH authoritative for brand. `design-system-format/spec.md:101-108` only requires a _doc table_. Edit OKLCH, forget hex re-derive, lint passes, brand drifts silently.
**Fix:** Add `scripts/check-oklch-hex-parity.mjs` invoked from `lint:design`. Re-derive hex from prose-cited OKLCH, fail on mismatch beyond a documented epsilon (e.g., 1 LSB per channel). Promote from doc convention to spec Requirement.

### H6 · Bus-factor / Google Labs deprecation risk on upstream

**Source:** Supply-chain (F1) · Verified facts: `@google/design.md@0.1.1` published 2026-04-21, only 2 versions ever. Repo has 17 commits across 7 contributors total. Top contributor `davideast` has 7 commits. Google Labs has historical deprecation pattern (Stadia, Domains, Jamboard). `design.md:39` proposes a weekly drift check but it only catches schema text changes — not repo archival or npm unpublish.
**Fix:** Add a CI cron job hitting `gh api repos/google-labs-code/design.md` weekly; fail if `archived=true` OR last push >90 days. Pair with H7 (exit strategy).

### H7 · Maintainer/publisher decoupling — npm publish capability separated from authorship

**Source:** Supply-chain (F3) · npm maintainers are `google-wombot`, `ofrobots`, `mrdoob` (Three.js author, personal email). `mrdoob` holds publish rights but has zero commits in the repo's top contributors. Account compromise → malicious `0.1.2` republish would affect any contributor running ad-hoc `npm install` outside the lockfile.
**Fix:** Phase 2.1 must use `npm install --save-dev --ignore-scripts @google/design.md@<X>`. CI uses `npm ci --ignore-scripts`. Add an `overrides` block in `package.json` to harden against transitive replacement.

### H8 · Color-token edit ritual is a 5-step undocumented procedure

**Source:** DX (F1) · Adding one color requires: (1) edit OKLCH prose, (2) re-derive sRGB hex, (3) add hex to YAML frontmatter, (4) update `theme.css`, (5) verify drift + contrast checks. None of the tasks document the sequence in `docs/design-md.md`.
**Fix:** Add an "Adding a new color token" checklist to `docs/design-md.md` with six numbered steps and file paths. Inside Phase 5.1, no new task needed.

### H9 · No watch mode or pre-commit hook for `lint:design`

**Source:** DX (F2) · `lint:design` runs only in `postbuild`. Contributors running `npm run dev` get no feedback until they run a full build or push. A broken `{colors.nonexistent}` ref iterates silently.
**Fix:** Add Phase 2.3a: "Add `lint:design` to the project's pre-commit hook (lint-staged or `.husky/pre-commit`) scoped to `DESIGN.md` changes." Add a `lint:design:watch` script if upstream supports it. Document in Phase 5.1.

### H10 · Merge-order safety with `update-site-marketing-redesign` is not enforceable

**Source:** Architecture (F3) — same root cause as H2 — but distinct in that no automated check verifies the prerequisite. Even if H2's "depends-on" note replaces the file edits, there's no CI gate.
**Fix:** Add `npm run verify:design-prerequisites` that fails if `update-site-marketing-redesign` is in flight AND the redesign's tasks reference `new-design/extracted/DESIGN.md` paths. Wire into Phase 0.4.

---

## Medium (8 — abbreviated)

| ID  | Dim          | Summary                                                                                                                               | Fix one-liner                                                                     |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| M1  | OpenSpec     | `design-system-format` capability covers 8 concerns (file location, frontmatter, lint, sections, precedence, cache, OKLCH-doc, drift) | Once H3 lands, concerns drop to 6; document boundary in archived `Purpose`        |
| M2  | OpenSpec     | 4 Open Questions ship as "Proposed:" — should be Decisions                                                                            | Promote to Decisions #9-12 with rationale, or drop to follow-up changes           |
| M3  | OpenSpec     | Tasks 2.5, 6.3, 8.4 use "decide", "defer if", "scaffold placeholder" — soft acceptance violates `config.yaml` task contract           | Tighten each to a binary acceptance signal                                        |
| M4  | Supply-chain | Published npm `package.json` lacks `license` field (GitHub claims Apache-2.0; npm metadata empty)                                     | File upstream issue; pin upstream LICENSE SHA in `docs/design-md.md` for auditors |
| M5  | Supply-chain | Postinstall risk currently zero but unbounded — no `--ignore-scripts` flag in tasks                                                   | Phase 2.1 + CI use `npm ci --ignore-scripts`                                      |
| M6  | Supply-chain | Spec-cache check is text-only, not behavior gate                                                                                      | Add fixture-based behavior tests under `tests/fixtures/design-md/{good,bad}.md`   |
| M7  | Supply-chain | "Weekly drift check" stated in design.md, no owning task in tasks.md                                                                  | Add Phase 2.7 — `.github/workflows/design-md-drift.yml` cron                      |
| M8  | DX           | `broken-ref` JSON output is not human-readable in CI                                                                                  | Specify a `--reporter pretty` flag (if upstream supports) or wrapper script       |

Plus from Architecture: F1 (capability boundary leaks; required-components belong in style-system), F6 (section-order enumerated inline instead of referenced from cache), F9 (rollback ordering claim is wrong — Phase 4 must revert before Phase 3), F4 (style-system gains hard dependency on a non-spec file).

DX F5 (spec-cache regen not in any contributor checklist) — Medium, must-fix per DX reviewer's count.

---

## Low (8 — abbreviated)

| ID  | Dim          | Summary                                                                                                                        |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| L1  | Architecture | Spec-cache + lint:design CI gates are duplicative on failure modes; document diagnosis order                                   |
| L2  | Architecture | Upstream alpha→beta watchdog is an Open Question, not a Decision                                                               |
| L3  | OpenSpec     | Decisions #5 and #7 are non-decisions (no real alternatives)                                                                   |
| L4  | OpenSpec     | No stale `openspec/AGENTS.md` references — clean                                                                               |
| L5  | Supply-chain | Lockfile attestation present but not cited in proposal                                                                         |
| L6  | Supply-chain | `diff:design` not gated on PRs touching DESIGN.md                                                                              |
| L7  | Supply-chain | No exit strategy if upstream is abandoned (vendor `vendor/design.md/` if archived >90 days)                                    |
| L8  | Supply-chain | Telemetry not verified or disabled (no `DO_NOT_TRACK=1` / `--offline` assertion)                                               |
| L9  | Supply-chain | Secondary bus factor on `@json-render/*` (single maintainer)                                                                   |
| L10 | DX           | Phase 3.4 reorganizes 761 lines in one task — git blame loss, review impractical; split into 3.4a (structure) + 3.4b (content) |
| L11 | DX           | No `derive:hex` script for OKLCH→hex conversion                                                                                |
| L12 | DX           | `lint:design` is invisible to fresh contributors after `git clone && npm run dev`                                              |

---

## Cross-dimensional patterns

- **Drift detection is overspecified-and-undertools'd.** H3 (duplicated requirement) + H4 (warn-only) + H5 (OKLCH parity uncovered) + L11 (no derive script) + DX-F7 (conversion table will drift) all converge on "drift is the real correctness story" — this is the single highest-value cleanup pass.
- **Cross-change coupling with the redesign is fragile.** H2 + H10 + supply-chain F7 (weekly drift check) all want CI-level prerequisite enforcement, not "review hygiene."
- **OpenSpec authoring keeps the validator green but reviewers find drift.** C1 + H3 + M2 + M3 — strict validate is a floor, not a ceiling. The architecture-review and openspec-authoring sub-agents independently flagged the same ADDED/MODIFIED inconsistency from different angles.
- **Supply-chain risk profile is real but mechanical.** All 6 supply-chain must-fixes are tasks.md additions (CI jobs, install flags, fixtures) — no architectural reshape. The bus-factor finding (H6) is the only one that points at a structural risk; the rest are defensive hygiene.

---

## Summary

| Dimension           | Critical | High   | Medium | Low    | Verdict                                                   |
| ------------------- | -------- | ------ | ------ | ------ | --------------------------------------------------------- |
| Architecture        | 0        | 4      | 3      | 2      | APPROVE-WITH-CHANGES (5 must-fix: F2, F3, F4, F5, F8)     |
| Supply-chain        | 0        | 2      | 4      | 5      | APPROVE-WITH-CHANGES (6 must-fix: F1, F2, F3, F4, F6, F7) |
| DX                  | 0        | 2      | 3      | 2      | APPROVE-WITH-CHANGES (4 must-fix: F1, F2, F4, F5)         |
| OpenSpec authoring  | 1        | 2      | 3      | 2      | APPROVE-WITH-CHANGES (3 must-fix: F1, F3, F4)             |
| **Total (deduped)** | **1**    | **10** | **8**  | **12** | **APPROVE-WITH-CHANGES**                                  |

Net unique must-fix items (Critical + High, deduped across dimensions): **11**.

---

## Recommendation

Apply the **11 must-fix amendments** as a follow-up edit pass on `proposal.md`, `design.md`, `tasks.md`, and `specs/style-system/spec.md`. After amendments, re-run `openspec validate --strict adopt-design-md-format`. The 8 mediums and 12 lows can batch into a single follow-up commit on the same change branch.

No reviewer recommends rejecting the change. The proposal is structurally sound; gaps are enforcement rigor, cross-change coupling, and authoring-text consistency — not direction errors.

The 1 Critical (C1, ADDED/MODIFIED mismatch) is a 3-line text fix that should ship before this review even closes.
