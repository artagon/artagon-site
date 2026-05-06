# Architecture Review — adopt-design-md-format (Claude)

Scope: architecture only. Confidence floor 80%.

## Findings

### F1 — Capability split is defensible but boundary leaks (Medium)

`specs/design-system-format/spec.md:1-118` carves a new capability for "format compliance" while `specs/style-system/spec.md:3-20` retains "token semantics." The split is justified (format contract vs. token meaning have different change cadences and external dependencies), but the new spec embeds component semantics ("nav, footer, glow-tag, ... `backgroundColor` and `textColor` properties" — `design-system-format/spec.md:47,57`) which is style-system territory. **Remediation:** move the required-components list and property contract into `style-system`; keep `design-system-format` purely about file shape, frontmatter presence, and lint-gate behavior.

### F2 — Precedence chain is contradictory as written (High)

`design-system-format/spec.md:73-85` declares `DESIGN.md → openspec/specs/* → implementation`, then says "the spec SHALL be authoritative for behavior; DESIGN.md MUST be updated to match." This is not a precedence chain — it is a two-layer model where specs win. A reviewer reading the first sentence will reach the wrong conclusion. **Remediation:** rewrite as "specs are authoritative; DESIGN.md is the canonical token/visual artifact and MUST stay synchronized; implementation derives from both." Drop the arrow notation or invert it.

### F3 — Cross-change merge ordering is unsafe (High)

`design.md:89-93` Decision #8 claims "no hard ordering" with `update-site-marketing-redesign`, but `tasks.md:56-61` Phase 4 mutates that change's proposal/design/tasks files. If the redesign lands first, Phase 4 becomes a 3-file edit on already-archived content; if the redesign rebases mid-flight, Phase 4 produces non-trivial conflicts on `tasks.md` line numbers (8.1, 8.6 cited). **Remediation:** add an explicit ordering decision (this change lands first, OR redesign authors the path indirection now via a symlink/alias) and remove the "either order" claim.

### F4 — style-system gains a hard dependency on a non-spec file (Medium)

`specs/style-system/spec.md:3-20` requires every theme token to "trace to ... `DESIGN.md` YAML frontmatter." `DESIGN.md` is not an OpenSpec artifact — it lives outside `openspec/specs/`. This couples a spec to a sibling capability's governed file, creating: style-system → DESIGN.md → design-system-format → (extends) style-system. The cycle is logical, not textual, but it means a `design-system-format` archive cannot precede `style-system` without dangling refs. **Remediation:** rephrase the style-system requirement to depend on the `design-system-format` capability ("tokens MUST satisfy the Token Traceability requirement of design-system-format"), not on the file directly.

### F5 — Drift detection as warn-only is load-bearing-but-toothless (High)

`design.md:74-78` and `design-system-format/spec.md:110-117` ship drift detection as warn-only "for one stable release cycle." A warning that gates nothing is operationally equivalent to absent. Worse, the `style-system` MODIFIED requirement (F4) leans on this script for enforcement. **Remediation:** either (a) ship at error-severity with an explicit allow-list seeded from current orphans, or (b) remove the requirement from this change entirely and file a follow-up `enforce-design-drift` change. Do not codify a warn-only enforcement contract.

### F6 — Section-order schema is brittle to upstream growth (Medium)

`design-system-format/spec.md:60-71` hard-codes the 8-section canonical order. Upstream is `alpha`; expanding to 10 sections in a future bump silently invalidates our spec text without breaking the lint. **Remediation:** reference the upstream spec by version pin instead of enumerating sections inline ("sections MUST follow the order defined by the pinned upstream spec at `openspec/.cache/design-md-spec.md`"). Single source of truth.

### F7 — Committed spec cache is acceptable but CI gates are duplicative (Low)

`tasks.md:78,84` Phase 7.1 (`lint:design exits 0`) and 7.7 (`git diff --exit-code` on the cache) are independent invariants — the first checks DESIGN.md against the pinned CLI; the second checks the cached spec against the same pinned CLI. They are not redundant, but the failure modes overlap and contributors will not know which to fix first. **Remediation:** document the diagnosis order in `docs/design-md.md` (cache-first, then DESIGN.md) and consolidate both into one `npm run check:design` orchestrator.

### F8 — OKLCH/hex hybrid has no enforcement primitive (High)

`design.md:44-52` Decision #2 makes hex authoritative for the linter and OKLCH authoritative for brand. `specs/design-system-format/spec.md:101-108` only requires a conversion _table in docs_ — not a check. A contributor edits OKLCH in prose, forgets to re-derive hex, lint passes, brand drifts silently. **Remediation:** add a `check:oklch-hex-parity` script invoked from `lint:design` that re-derives hex from prose-cited OKLCH and fails on mismatch beyond a documented epsilon. Make the parity check a Requirement, not a doc convention.

### F9 — Rollback ordering claim is wrong (Medium)

`proposal.md:54` and `design.md:103` both claim "per-step rollback is independent." Phase 4 (path edits to redesign) cannot be reverted independently of Phase 3 (DESIGN.md promotion) — reverting Phase 3 leaves Phase 4's path edits pointing at a missing file. **Remediation:** state rollback ordering explicitly: revert Phase 4 before Phase 3; revert Phase 6 (drift script) before Phase 2 (devDep).

### F10 — Upstream alpha→beta watchdog is a Decision, not Open Question (Low)

`design.md:110` leaves alpha-graduation handling as an open question with a "Proposed: No" auto-bump. No mechanism is specified to _detect_ graduation. **Remediation:** add Decision #9 "Weekly drift CI job (already proposed in Decision #1) also tags upstream version-tag changes and opens a tracking issue." Promote from Open Question to Decision.

## Verdict

**APPROVE-WITH-CHANGES** — must-fix count: **5** (F2, F3, F5, F8, F4).
F1, F6, F9 are should-fix; F7, F10 are nice-to-have.
