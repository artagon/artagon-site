## ADDED Requirements

### Requirement: Docs Surface Adoption Gate

Starlight and Tailwind MUST NOT be added to artagon-site until the owner records a decision ADR in `docs/decisions/` that supersedes ADR 0001 for the chosen scope, and the `agent-skills` stack-contract gate is updated in the same change.

#### Scenario: Adding Starlight before the decision fails

- **WHEN** a contributor adds `@astrojs/starlight` to `package.json` before the superseding ADR exists
- **THEN** `npm run verify:stack` exits 1

### Requirement: Docs CSP Parity

A Starlight docs surface, once adopted, MUST keep `script-src` free of `'unsafe-inline'`, MUST hash every inline script it emits, and MUST pass a release gate that loads a docs page containing code blocks and search with zero Content Security Policy violations.

#### Scenario: A docs page with code blocks loads without CSP violations

- **WHEN** the release gate opens a built docs page with Expressive Code blocks and the search dialog
- **THEN** the browser reports zero CSP violations and `script-src` contains no `'unsafe-inline'`
