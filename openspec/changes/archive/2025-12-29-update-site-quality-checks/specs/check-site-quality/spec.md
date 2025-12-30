## ADDED Requirements

### Requirement: Lighthouse CI Ready Signal

The system SHALL start the Lighthouse CI local server via `scripts/lhci-serve.mjs`, and the server SHALL emit a `READY` line once it can serve `http://localhost:8081/`.

#### Scenario: LHCI starts audits after readiness

- **WHEN** `npx -y @lhci/cli@0.14.x autorun --config=lighthouserc.json` runs after `npm run build`
- **THEN** the configured server prints `READY` before Lighthouse audits begin

### Requirement: Lychee Configuration Compatibility

The link checker SHALL use a Lychee configuration compatible with current CLI schema, including numeric `timeout` and `retry_wait_time`, accepted status codes, and exclusions for local build artifacts.

#### Scenario: Lychee loads config and checks sources

- **WHEN** running `lychee --config lychee.toml './**/*.md' './public/**/*.html' './src/**/*.astro'`
- **THEN** Lychee parses the configuration successfully and checks links while excluding `dist`, `node_modules`, and localhost URLs
