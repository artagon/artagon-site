## MODIFIED Requirements

### Requirement: CODEOWNERS Dual-Review for Generator-Adjacent Files

`CODEOWNERS` MUST identify trusted reviewers for the SSoT generator surface: `build.config.json`, `build.config.ts`, `scripts/sync-build-config.mjs`, and every file in `.github/workflows/`. Changes to generator inputs can affect workflow output, so ownership routing MUST cover both surfaces.

Under the owner policy chosen on 2026-10-26, branch protection on `main` MUST require a pull request. While the repository has only one human maintainer, protection MUST set `required_approving_review_count: 0` and `require_code_owner_reviews: false`, and CODEOWNERS MUST remain advisory. A sole maintainer cannot satisfy two approvals or approve their own PR. When a second human reviewer exists, branch protection MUST restore `required_approving_review_count: 2` and `require_code_owner_reviews: true`; generator-adjacent changes MUST then require approval from two distinct human reviewers before merge.

**Team handle policy.** CODEOWNERS MUST name real trusted individual maintainers or existing organization teams; it MUST NOT contain phantom team handles that fail open. The existing `@artagon/owners` and named-maintainer routing MUST remain advisory during the sole-maintainer period. A team handle and an individual handle for the same person MUST NOT count as two distinct human reviewers when dual review is restored.

The drift gate's CI write-block (sync refuses to write under `GITHUB_ACTIONS=true`) remains a defense-in-depth complement to the review policy, not a substitute.

#### Scenario: Sole-maintainer build.config.json edit requires a PR without approvals

- **GIVEN** the repository has only one human maintainer
- **WHEN** a contributor changes `build.config.json`
- **THEN** branch protection requires a pull request with zero required approvals and no required code-owner review
- **AND** CODEOWNERS provides advisory reviewer routing without blocking the sole maintainer's PR.

#### Scenario: Sole-maintainer workflow edit uses the same policy

- **GIVEN** the repository has only one human maintainer
- **WHEN** a contributor changes any file under `.github/workflows/`, whether human-authored or sync-regenerated
- **THEN** branch protection requires a pull request with `required_approving_review_count: 0` and `require_code_owner_reviews: false`
- **AND** CODEOWNERS remains advisory for that workflow change.

#### Scenario: Second human reviewer restores dual review

- **GIVEN** a second human reviewer exists
- **WHEN** the repository's review policy is applied to generator-adjacent changes
- **THEN** protection requires two approvals and a code-owner review before merge
- **AND** the approvals MUST come from two distinct human reviewers rather than two handles for the same person.

#### Scenario: Phantom team detection

- **GIVEN** a CODEOWNERS entry names an organization team
- **WHEN** the ownership configuration is verified and that team does not exist
- **THEN** verification fails and the entry MUST be replaced with existing trusted reviewer handles before the change is accepted.
