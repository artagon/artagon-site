# OpenSpec Authoring & Governance Review — adopt-design-md-format

Reviewer: Claude (Opus 4.7). Dimension: OpenSpec authoring quality + governance fit only. `rtk openspec validate adopt-design-md-format --strict` returns "is valid"; findings below are correctness/governance concerns the validator does not catch.

## Findings

### F1. ADDED vs MODIFIED mismatch on `style-system` delta — Critical

- File: `specs/style-system/spec.md:1` ("## ADDED Requirements") vs `proposal.md:60` and `proposal.md:44` (both call this a "MODIFIED" requirement). The proposal also says "this change adds one MODIFIED requirement to `style-system`," but the delta header says `ADDED`. Existing `openspec/specs/style-system/spec.md` has only three requirements (Theme-Aware Fallback Tokens, UI Component Attribute Compatibility, Solid Card Variant); none mention DESIGN.md, so "Token Traceability to DESIGN.md" is genuinely a new requirement and `ADDED` is technically correct.
- Remediation: Keep the delta as `## ADDED Requirements` and fix the proposal — replace "MODIFIED" with "ADDED" in `proposal.md:44` ("adds one MODIFIED requirement"), `proposal.md:60` ("style-system — **MODIFIED**"), and `design.md:30` ("one MODIFIED requirement (token traceability)"). Otherwise reviewers chase a non-existent extension of an existing requirement.

### F2. Capability name overloaded — Medium

- File: `proposal.md:17`, `specs/design-system-format/spec.md`. `design-system-format` covers eight concerns: file location, frontmatter coverage, lint gate, section order, precedence, spec cache, OKLCH-hex doc, drift detection. That's a capability composed of two distinct concerns — (a) the DESIGN.md file contract, (b) drift enforcement against `style-system`. Drift detection arguably belongs under `style-system` (which is where it lives in the ADDED requirement F1).
- Remediation: Either (a) accept current naming and document the boundary in `Purpose` once the capability lands, or (b) split the "Drift Detection (Best-Effort)" requirement out of `design-system-format` since it's already represented by the `style-system` ADDED requirement — the duplication creates two homes for the same drift concern.

### F3. Drift detection requirement is duplicated — High

- File: `specs/design-system-format/spec.md:110-117` ("Drift Detection (Best-Effort)") and `specs/style-system/spec.md:3-20` ("Token Traceability to DESIGN.md"). Both require `check:design-drift` to assert CSS tokens trace to DESIGN.md tokens. Two specs owning the same enforcement creates a future "which spec wins" problem when the warning is promoted to error.
- Remediation: Remove the "Drift Detection (Best-Effort)" requirement from `design-system-format` and rely solely on the `style-system` requirement, OR drop the `style-system` ADDED block entirely and keep drift in `design-system-format`. Recommend the former — drift is about tokens-in-CSS, which is `style-system`'s domain.

### F4. Cross-change file edits — High

- File: `tasks.md:56-61` (Phase 4.1–4.6) edits `openspec/changes/update-site-marketing-redesign/{proposal,design,tasks}.md`. Per `openspec/contributing.md`, each change owns its files; the redesign is in-flight and not yet validated/approved. Editing another active change's text inside this change's apply phase makes the redesign's diff non-deterministic depending on merge order, contradicting Decision #8's "no hard ordering" claim.
- Remediation: Replace Phase 4 file-edit tasks with a "depends-on" note in `proposal.md` ("update-site-marketing-redesign Phase 8.1/8.6 path references will be updated by that change post-merge of this one") and delete tasks 4.1–4.3. Keep 4.4 (re-validate) and 4.5/4.6 as cross-link notes in `openspec/project.md` only.

### F5. Open Questions left as "Proposed" — Medium

- File: `design.md:107-110`. Four open questions ship with "Proposed:" answers (bun adoption, DTCG commit, contrast-ratio gate, version auto-bump). Per `openspec/contributing.md` design rules, design.md exists to document decisions made; "Proposed" answers indicate unresolved policy.
- Remediation: Promote each "Proposed" to a numbered Decision under `## Decisions` (e.g., Decision #9 "Stay on npm; no bun adoption"; Decision #10 "DTCG export ephemeral; not committed") with one-line rationale, OR remove the Open Questions section entirely. Leaving unresolved policy in `design.md` invites scope creep at apply time.

### F6. Tasks without acceptance signals — Medium

- File: `tasks.md:24` (2.5 "Decide: gitignored or committed"), `tasks.md:74` ("Optional: ast-grep rule … Defer if too noisy"), `tasks.md:91` ("File a follow-up `bump-design-md-to-beta` change scaffold (empty proposal placeholder)"). These have soft acceptance ("decide", "defer if", "scaffold placeholder") that the Phase 0 contract in `openspec/config.yaml:46` ("Each task lists files touched + acceptance signal") explicitly disallows.
- Remediation: 2.5 → "Run `npx @google/design.md spec --format markdown > openspec/.cache/design-md-spec.md` and `git add` it" (Decision #4 already chose committed). 6.3 → split into "add rule" or "skip with rationale in docs/design-md.md". 8.4 → either remove or change to "create empty `openspec/changes/bump-design-md-to-beta/proposal.md` with `## Why` header only".

### F7. Decision #5 and #7 are not decisions — Low

- File: `design.md:69-72` (Decision #5 — `lint:design` in postbuild) and `design.md:80-87` (Decision #7 — License attribution). Both describe what we'll do without alternatives considered. #5 mentions "could run anywhere" but doesn't pose prebuild as a real alternative; #7 has no alternative at all (Apache-2.0 attribution is required, not chosen).
- Remediation: Demote #7 to a sentence under `## Context` ("Format spec is Apache-2.0; attribution lives in docs/design-md.md and package-lock.json"). For #5, add one sentence on why prebuild was rejected ("prebuild would block `astro build` on a CI-only concern"). Low priority — cosmetic.

### F8. Stale reference vector — Low

- File: searched proposal.md/design.md/tasks.md — no `openspec/AGENTS.md` references found. Clean.
- Remediation: None needed.

## Verdict

**APPROVE-WITH-CHANGES** — must-fix count: **3** (F1, F3, F4). F2/F5/F6 are recommended; F7/F8 are optional. Proposal validates strict, but the ADDED/MODIFIED inconsistency, drift-requirement duplication, and cross-change file edits will confuse future reviewers and complicate merge ordering. Fix the three Highs and this is mergeable.
