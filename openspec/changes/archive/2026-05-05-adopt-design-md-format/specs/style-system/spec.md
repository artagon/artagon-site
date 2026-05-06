## ADDED Requirements

### Requirement: Token Traceability to DESIGN.md

Every `--color-*`, typography, spacing, and rounded token defined in `public/assets/theme.css` MUST trace to a token declared in the root `DESIGN.md` YAML frontmatter (or be on the explicit allow-list documented in `docs/design-md.md`). `npm run check:design-drift` MUST verify the trace at **error severity**; CI MUST fail on any unallow-listed orphan. The allow-list seeds from current orphans at adoption time and each entry MUST cite a one-paragraph rationale.

#### Scenario: New token defined in both files

- **WHEN** a contributor adds `--color-warning: #B8422E` to `theme.css`
- **THEN** the same token name appears under `colors:` in `DESIGN.md` frontmatter, and `check:design-drift` passes.

#### Scenario: Untraced token fails the build

- **WHEN** a contributor adds a token to `theme.css` without updating `DESIGN.md` and the token is not on the allow-list
- **THEN** `check:design-drift` exits non-zero with a finding naming the orphaned token, the `theme.css` line, and the suggested DESIGN.md placement; the build fails.

#### Scenario: Allow-list bypass for legacy or experimental tokens

- **WHEN** an experimental token is intentionally not in DESIGN.md and is added to the allow-list under `docs/design-md.md` with a rationale paragraph
- **THEN** `check:design-drift` does not flag that token but logs the allow-list match for audit; the build passes.

#### Scenario: Allow-list entry without rationale fails

- **WHEN** a contributor adds a token to the allow-list without a rationale paragraph
- **THEN** `check:design-drift` rejects the allow-list entry and exits non-zero, naming the missing rationale.
