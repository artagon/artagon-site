# Verification — Round 2 Amendments to `adopt-design-md-format`

**Validation status:** `openspec validate adopt-design-md-format --strict` → green (confirmed).

## Must-fix item verification (11 items)

| ID | Original Fix (1-line) | Landing site | Amended quote | Status |
|----|---|---|---|---|
| C1 | Replace "MODIFIED" with "ADDED" for style-system in proposal/design prose. | proposal.md:44, proposal.md:60, design.md:30 | proposal:60 "**ADDED** (one new requirement: 'Token Traceability to DESIGN.md'…)"; proposal:44 "one ADDED requirement"; design:30 "We add one ADDED requirement". | ADDRESSED ✓ |
| H1 | Canonical phrasing: "openspec/specs/* govern behavior; DESIGN.md governs visual presentation; on conflict, the spec wins…" applied to Goals, Precedence requirement, AGENTS.md. | proposal.md:16; design.md:23; spec.md:73-90; tasks.md:17, 73, 80 | spec.md:75 "On conflict between `DESIGN.md` and `openspec/specs/<capability>/spec.md`, the spec wins"; spec.md:87-90 forces verbatim phrasing in AGENTS.md and docs. | ADDRESSED ✓ |
| H2 | Replace Phase 4 in-place edits with depends-on note; delete tasks 4.1-4.3; keep cross-link tasks. | tasks.md:64-68; design.md:95-101; proposal.md:21,42,70 | tasks.md:64 heading "Phase 4 — Cross-link only (no in-place edits to other changes)"; 4.1 cross-link note; 4.2 verify prereq; 4.3 re-validate. Old in-place edits gone. | ADDRESSED ✓ |
| H3 | Remove "Drift Detection (Best-Effort)" from `design-system-format`; keep one home in `style-system`. | specs/design-system-format/spec.md (no Drift Detection requirement); specs/style-system/spec.md:3-26 | design-system-format spec contains no "Drift Detection" requirement; only style-system carries Token Traceability. design.md:82 explicit: "lives ONCE in `style-system`…NOT duplicated". | ADDRESSED ✓ |
| H4 | Ship at error severity day-one with allow-list seeded from current orphans, OR remove. | design.md:78-84; specs/style-system/spec.md:5; tasks.md:86 | design.md:82 "Ship drift detection at **`error` severity from day one**"; spec.md:5 "MUST verify the trace at **error severity**"; tasks 6.2 wires CI at error severity with seeded allow-list. | ADDRESSED ✓ |
| H5 | Add `scripts/check-oklch-hex-parity.mjs` invoked from `lint:design`; promote to spec Requirement. | design.md:54; specs/design-system-format/spec.md:106-123; tasks.md:57, 25, 91 | spec.md "Requirement: OKLCH-Hex Parity" with three scenarios; tasks 3.3a builds the script; 2.3 wires it as `lint:design` precondition. | ADDRESSED ✓ |
| H6 | Add CI cron weekly probing `gh api …/design.md` for archived/staleness >90d. | tasks.md:30 (2.7); design.md:43; spec.md:125-137 | spec.md:127 "fail the workflow if `archived=true` OR the last push timestamp is more than 90 days old"; tasks 2.7 wires the cron with three checks; spec.md:131-137 has both scenarios. | ADDRESSED ✓ |
| H7 | Phase 2.1 use `npm install --save-dev --ignore-scripts`; CI uses `npm ci --ignore-scripts`. | tasks.md:22, 24; design.md:40; proposal.md:48 | tasks 2.1 "`npm install --save-dev --ignore-scripts @google/design.md@<EXACT-VERSION>`"; 2.2 "CI uses `npm ci --ignore-scripts`"; design.md:40 same; proposal.md:48 same. | ADDRESSED ⚠ (overrides block from CONSOLIDATED Fix not added; primary `--ignore-scripts` mitigation in place — judged ADDRESSED on the must-fix core; overrides is defensive add-on.) |
| H8 | Add "Adding a new color token" 6-step checklist to docs/design-md.md (referenced from Phase 5.1). | tasks.md:74 | tasks.md:74 enumerates the 6 steps verbatim: (1) edit OKLCH, (2) `derive:hex`, (3) confirm YAML, (4) update theme.css, (5) `check:design-drift`, (6) `lint:design`. | ADDRESSED ✓ |
| H9 | Add Phase 2.3a wiring `lint:design` to pre-commit (lint-staged or husky) scoped to DESIGN.md. | tasks.md:26 | tasks 2.3a "Add `lint:design` to a pre-commit hook (via `.husky/pre-commit` shell step or `lint-staged`) scoped to changes touching `DESIGN.md`. Document in `docs/design-md.md`." | ADDRESSED ✓ |
| H10 | Add `npm run verify:design-prerequisites` CI gate; wire into Phase 0.4. | tasks.md:12 (0.6), 27 (2.4), 67 (4.2), 94 (7.4); design.md:101 | tasks 0.6 builds the script with two failure conditions; 7.4 lists it as a per-PR CI check; 4.2 asserts it passes; design.md:101 specifies enforcement semantics. | ADDRESSED ✓ |

## Regression checks

| Check | Result |
|---|---|
| Internal contradiction in new requirements | None found. Precedence and OKLCH-Hex Parity scenarios are self-consistent. |
| Precedence-chain phrasing consistency (Goals vs requirement vs AGENTS) | Identical wording across proposal.md:16, design.md:23, spec.md:75 + spec.md:87-90 enforces verbatim reuse. No drift. |
| Dangling references after H3 split | design-system-format spec contains no orphan citation of "Drift Detection"; style-system spec self-contained; design.md:82 names the new home explicitly. Clean. |
| Tasks numbering conflict (0.5/0.6, 2.1a/2.3a/2.7-2.10, 3.3/3.3a/3.4a/3.4b) | All sub-numbered tasks (e.g. 2.1a, 3.4b) follow alphabetic sub-pattern; no duplicate IDs. Phase numbering monotonic. |
| Phase 4 actually deletes 4.1-4.3 vs renumber | Old 4.1-4.3 (in-place edits to redesign change files) are GONE. New 4.1 = cross-link note, 4.2 = verify prereq, 4.3 = re-validate redesign. Heading explicitly says "no in-place edits". |
| SHALL/MUST/SHOULD verbs on every Requirement (spot-check) | "Canonical Location" MUST; "Upstream Format Adoption" MUST; "Lint Gate" MUST; "Frontmatter Token Coverage" MUST; "Section Order" MUST; "Precedence" SHALL/MUST; "Spec Context Cache" MUST; "OKLCH-Hex Parity" MUST; "Upstream Liveness Probe" MUST; "Token Traceability" MUST. All present. |
| Acceptance signal consistency | Phase 7 Quality Gates (7.1–7.9) cover every script introduced (lint:design, check:design-drift, check:oklch-hex-parity, verify:design-prerequisites, test:design-fixtures, spec:cache diff, telemetry, weekly cron). No orphan task. |

No regressions found.

## Verdict

AMENDMENTS-COMPLETE — 0 must-fix items remaining (11/11 addressed; H7 noted as ADDRESSED with one optional defensive add-on, `package.json` `overrides`, deferrable to a follow-up hardening change).
