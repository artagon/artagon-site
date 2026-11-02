## ADDED Requirements

### Requirement: Sanitizer-aware Astro HTML enforcement survives rule cleanup

The repository SHALL repair/replace the implementation of rules/security/no-set-html-directive.yml while retaining its file, rule identity and enabled guard. In the same PR it SHALL retain and strengthen tests/lint-set-html-safejsonld.test.mts, its tracked-Astro discovery and CI execution so accepted sanitizer calls resolve to the canonical safeJsonLd export from src/lib/charset.ts in their effective scope. A matching function name alone SHALL NOT establish safety. Local definitions, shadowed bindings, rebound values, wrong-module imports and unresolved sanitizer bindings SHALL be rejected.

The combined controls SHALL provide equivalent or stronger coverage before the existing guard changes; no standalone retirement, disablement or intermediate coverage gap is permitted. If equivalence cannot be demonstrated with the actual pinned linter and strengthened source gate, the original guard SHALL remain unchanged and PR 11 SHALL NOT land. The cleanup SHALL NOT broaden the accepted output grammar or add an allowlist/suppression. It SHALL narrow acceptance where necessary to reject spoofed bindings while preserving genuine sanitizer direct/const/conditional/null forms supported by the existing grammar. Unsafe direct values, unsafe conditional branches and unsafe interpolated output SHALL fail.

Every active rule contract and current guidance claim SHALL be reconciled in that same PR: the USMR site-structured-data JSON-LD requirement/scenario, design paragraph and task 12.8; the branding site-branding safe-composition scenario; openspec/config.yaml; .agents/skills/ast-grep/SKILL.md; AGENTS.md; DESIGN.md §9.4.1; and the rule/test/reference docs enumerated in design.md D5. Existing task IDs/states and historical review evidence SHALL be preserved. Rule inventory documentation SHALL match the resulting enforced rule set, and affected active changes SHALL pass strict validation.

This requirement SHALL NOT permit direct HTML injection into FAQ answer Markdown or weaken the existing site-content requirement.

#### Scenario: Valid small JSON-LD is accepted
- **GIVEN** a tracked Astro fixture containing a valid small JSON-LD script whose set:html output follows the existing grammar and whose safeJsonLd binding resolves to src/lib/charset.ts
- **WHEN** the resulting lint/security gates run
- **THEN** the fixture passes rather than being rejected merely because the set:html attribute exists.

#### Scenario: Unsafe output remains rejected
- **GIVEN** separate tracked Astro controls containing an unsafe direct value, a conditional with an unsafe output branch, and unsafe interpolated output
- **WHEN** the resulting lint/security gates run
- **THEN** every control fails and identifies the offending use.

#### Scenario: Sanitizer lookalikes are rejected
- **GIVEN** separate tracked Astro controls calling a locally defined, shadowed, rebound or wrong-module function named safeJsonLd, alongside a genuine canonical-import control
- **WHEN** the actual strengthened tracked-source gate and pinned linter run
- **THEN** each lookalike is rejected with its offending use identified, the genuine control passes, and an unresolved binding is rejected rather than treated as safe.

#### Scenario: No coverage gap while repairing the rule
- **GIVEN** a candidate replacement that accepts a genuine safe fixture but fails to reject any unsafe or spoofed-binding control caught by the original combined guards
- **WHEN** PR 11 is evaluated for landing
- **THEN** the equivalence gate fails, the original guard remains in place and the PR does not land.

#### Scenario: Enforcement ownership and inventory stay synchronized
- **GIVEN** a security-reviewed repair/replacement with equivalent or stronger combined controls in the same PR
- **WHEN** the full tracked-source gate, pinned linter, rule-documentation sync checks and affected active-change validations run
- **THEN** the named rule and strengthened sanitizer gate still execute, required negative controls remain effective, and all active contracts and current guidance describe the actual controls.

