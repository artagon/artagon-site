# OpenSpec Authoring & Governance Review — `add-brand-assets-and-writing-pipeline`

`rtk openspec validate add-brand-assets-and-writing-pipeline --strict` → **green** (confirmed via bash).

Findings the validator does not catch:

---

### F1. MODIFIED-vs-ADDED inconsistency on `site-content` & `site-branding`

**Severity: High** | `proposal.md:74-75`, `specs/site-content/spec.md:1`, `specs/site-branding/spec.md:1`

Proposal §Impact says `site-content` is **MODIFIED** and `site-branding` is **MODIFIED**. Both delta files use `## ADDED Requirements` only — there is no `## MODIFIED Requirements` block extending an existing requirement. Same pattern bug as `adopt-design-md-format`. **Caveat:** the prerequisite `update-site-marketing-redesign` itself uses `## ADDED Requirements` for these caps and has not archived, so neither cap exists in `openspec/specs/` yet — the requirements added here truly are net-new.
**Remediation:** change proposal Impact lines to `**ADDED-TO**` (extends-but-doesn't-mutate) or rename to "ADDED requirements within an existing capability"; align language with `adopt-design-md-format`'s post-review fix.

### F2. `site-content` Purpose drift unprotected

**Severity: Medium** | `openspec/specs/site-content/spec.md:3`

Existing `site-content/spec.md` has `Purpose: TBD - created by archiving change refactor-content-collections. Update Purpose after archive.` Both this change and the redesign add requirements to `site-content` without updating Purpose. After both archive, the cap will have 7+ requirements behind a "TBD" purpose.
**Remediation:** Add a Phase 10 task to rewrite `site-content` Purpose at archive time covering local + remote authoring.

### F3. Two changes both ADD-to `site-content` — archive ordering brittle

**Severity: High** | tasks.md:7, design.md:115-117

Redesign ADDs `repo` to writing schema; this change ADDs `path`+`commit`. If redesign archives without also touching the schema requirement label this change extends, the merged spec ends with two separate "Optional Remote-Source Frontmatter Fields"-like requirements (one from redesign, one from here) instead of one coherent block. `verify:writing-prerequisites` only checks archival presence, not schema-coherence.
**Remediation:** Convert this change's frontmatter requirement to `## MODIFIED Requirements` referencing the redesign's exact requirement header (`Per-route Frontmatter Contract` for writing) so the archive merger replaces in place.

### F4. `verify:writing-prerequisites` is referenced but unverified

**Severity: Medium** | tasks.md:7, tasks.md:50, design.md:117

Phase 0.1 says the script "checks both" prerequisites; Phase 5.6 builds it last. Phase 0 thus assumes a script that doesn't exist until Phase 5 — Phase 0 cannot pass on a fresh clone. Also, no test fixture proves the script fails when only one prerequisite is archived.
**Remediation:** Move 5.6 to Phase 0 (write the script first), and add a unit test: "script exits 1 when redesign-archived but design-md-archived missing".

### F5. `site-brand-gallery` is under-scoped for a separate capability

**Severity: Low** | proposal.md:13, design.md, `specs/site-brand-gallery/`

A single tooling route with copy-SVG buttons is borderline as a stand-alone capability; per `openspec/contributing.md` the 10-minute understandability test is preserved here, but `site-branding` already owns favicon/wordmark generation — folding the gallery into `site-branding` would reduce capability sprawl.
**Remediation:** Acceptable as-is, but document in design.md why a separate cap was preferred (currently no rationale).

### F6. Decision #6 (Webhook flow) is description, not a decision

**Severity: Low** | design.md:90-103

Decisions #6 and #9 lack alternatives-considered. #6 just describes the dispatch flow; #9 just declares ordering. Per Decision-record norms, a "decision" needs an option set ("we picked X over Y because Z").
**Remediation:** Add 1-sentence "Alternative considered: GitHub App webhook (rejected: extra infra)" lines to #6, #9.

### F7. Open Questions claim is overstated

**Severity: Low** | design.md:134-136

design.md says "All four prior Open Question candidates were decided". The four candidates are not enumerated in the proposal (no "Open Questions" section in proposal.md). Reader has no way to verify which questions were resolved.
**Remediation:** Either inline-list the four candidates with their resolutions, or remove the parenthetical claim.

### F8. MDX allowlist enforcement asserts but doesn't verify

**Severity: Medium** | `specs/site-writing-pipeline/spec.md:69-77`

Requirement says "Posts referencing unknown components MUST fail the build at parse time" — Astro's MDX integration's `components` config does not actually reject unknown JSX; it just leaves it un-rendered. The scenario "uses `<UntrustedThirdPartyWidget>`" claims a parse-time error, but Astro/MDX renders unknown capitalized JSX as a build warning at most without a custom plugin.
**Remediation:** Add a task to install/configure a remark/rehype plugin (e.g. `remark-mdx-disable-explicit-jsx` or a custom AST walker) that hard-fails on JSX nodes outside the allowlist; cite the plugin in the Requirement.

### F9. Glyph parity snapshot has no DESIGN.md change-detection

**Severity: Medium** | `specs/site-branding/spec.md:40-47`, tasks.md:21

Snapshot is committed JSON. Spec says "updating the snapshot MUST require a coordinated DESIGN.md change" but no test/script verifies that snapshot updates were accompanied by DESIGN.md edits. CI cannot detect "snapshot regenerated, DESIGN.md untouched."
**Remediation:** Add a CI check: `git diff --name-only origin/main...HEAD | grep -q brand-glyph-snapshot.json && git diff --name-only origin/main...HEAD | grep -q DESIGN.md` (or a `husky` pre-commit equivalent).

### F10. Scenario in F1's site-branding spec uses a forbidden idiom

**Severity: Medium** | `specs/site-branding/spec.md:14-15`

The scenario describes `Footer.astro` doing `set:html` while the same scenario admits "set:html itself is forbidden by no-set-html-directive". The scenario contradicts itself — readers cannot tell what the legal idiom is.
**Remediation:** Rewrite the scenario showing the canonical pattern (e.g., `<Fragment is:raw>` or a wrapper component) without referencing the banned directive.

### F11. `/brand` MUST-be-added phrasing is ambiguous against `as const` constant

**Severity: Low** | `specs/site-brand-gallery/spec.md:26-28`

"MUST be added to `NOINDEX_ROUTES`" — `NOINDEX_ROUTES` is `as const` per the redesign. Spec doesn't say WHO adds it (this change's PR vs. a runtime concat).
**Remediation:** Reword: "The literal `'/brand'` MUST be present in the `NOINDEX_ROUTES` tuple in `src/lib/indexation.ts` after this change lands."

### F12. Acceptance signal weakness: tasks 0.3, 1.2, 1.3, 8.x

**Severity: Low** | tasks.md:9, 14-15, 67-69

Tasks 0.3 (`Confirm CODEOWNERS includes…`), 1.2/1.3 (`Update project.md`/`config.yaml`), and Phase 8 doc tasks lack falsifiable signals (no command exits 0, no specific file fragment to grep). "Confirm" and "Update" are weak verbs.
**Remediation:** Replace with `grep -q '/brand' .github/CODEOWNERS && echo OK` style assertions.

---

## Verdict

**APPROVE-WITH-CHANGES** — Must-fix count: **4**

Must-fix: F1 (MODIFIED-vs-ADDED label), F3 (schema-extension archive ordering), F4 (verify-prerequisites bootstrap order), F8 (MDX allowlist actual enforcement). F2/F5/F6/F7/F9/F10/F11/F12 are non-blocking polish.
