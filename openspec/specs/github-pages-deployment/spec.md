# github-pages-deployment Specification

## Purpose

This capability defines the contracts that govern how the
artagon-site Astro build is deployed to GitHub Pages at
`artagon.com`. The deployment ships exclusively through the
Astro workflow at `.github/workflows/deploy.yml` (NOT the
default branch-based Jekyll pipeline); a `.nojekyll` marker
in `public/` plus a `_config.yml` Jekyll exclude block are
the safety belt for the case where a contributor accidentally
flips Pages source back to a branch build. The capability was
created by archiving the `fix-pages-build` change
(`openspec/changes/archive/2025-12-29-fix-pages-build/`) and
will be MODIFIED by `migrate-deploy-to-cloudflare-pages` once
that change archives (which adds Cloudflare Pages as a parallel
deploy target while keeping the GitHub Pages contract intact
during migration).

## Requirements

### Requirement: GitHub Pages deploys from the Astro workflow

The GitHub Pages site SHALL deploy from the Astro build workflow defined in `.github/workflows/deploy.yml`.

#### Scenario: Pages source is GitHub Actions

- **WHEN** GitHub Pages is configured for deployment
- **THEN** the Pages source is set to GitHub Actions and the Astro workflow is the authoritative build pipeline.

### Requirement: Published site bypasses Jekyll

The published site SHALL include a `.nojekyll` marker file.

#### Scenario: Jekyll is disabled for published assets

- **WHEN** the Pages site is served
- **THEN** Jekyll processing is bypassed and the static assets are served as built.

### Requirement: Jekyll fallback excludes Astro sources

The repository SHALL include a Jekyll configuration that excludes Astro source directories from Pages builds if branch-based builds are enabled.

#### Scenario: Branch-based build is still enabled

- **WHEN** GitHub Pages runs a branch-based build
- **THEN** Jekyll ignores Astro sources and the build completes without front matter errors.

### Requirement: Pages source setting is documented

Project documentation SHALL state that the GitHub Pages source must be set to GitHub Actions and reference the Astro deploy workflow.

#### Scenario: Maintainers verify Pages configuration

- **WHEN** a maintainer reviews deployment documentation
- **THEN** they can confirm the Pages source setting and the workflow responsible for deployments.

### Requirement: Independent cache purge during the migration soak

The GitHub Pages workflow SHALL use `CLOUDFLARE_CACHE_PURGE_TOKEN` and `CLOUDFLARE_DNS_ZONE_ID` for its optional post-deploy DNS-zone cache purge. The token SHALL have Zone.Cache Purge permission for that zone and SHALL remain separate from the dedicated Cloudflare Pages account's `CLOUDFLARE_API_TOKEN`. Missing purge credentials SHALL produce a workflow warning and a run-summary entry. Configured purges SHALL fail on HTTP errors, malformed JSON, or a response whose `success` field is not `true`. The deploy job SHALL have a ten-minute timeout.

The purge SHALL target HTML plus non-content-hashed assets using a manifest prepared by the build job: every emitted file outside `_astro/`, including `/assets/theme.css`, plus HTML directory/index aliases. It SHALL NOT purge the entire DNS zone. The purge step and its two credentials SHALL be retired after the migration's seven-day soak window when the GitHub Pages workflow is retired. Purge acceptance SHALL NOT be treated as proof of fresh origin content.

#### Scenario: Purge is scoped to HTML plus non-content-hashed assets

- **GIVEN** the build emits HTML pages, non-content-hashed assets including `/assets/theme.css`, and content-hashed bundles under `_astro/`
- **WHEN** the deploy requests a cache purge
- **THEN** it purges HTML plus non-content-hashed assets (every emitted file outside `_astro/`) and HTML directory/index aliases on `https://artagon.com/`, leaving other hosts and content-hashed `_astro/` bundles outside the purge.

#### Scenario: Missing soak credentials are visible

- **GIVEN** either purge secret is absent
- **WHEN** the GitHub Pages deploy completes
- **THEN** the purge is skipped with a workflow warning and a run-summary entry.

#### Scenario: Purge credentials remain independent

- **GIVEN** Cloudflare Pages uses its dedicated account token
- **WHEN** the GitHub Pages soak workflow purges its DNS-zone cache
- **THEN** it uses only the separate cache-purge token and DNS-zone ID.

#### Scenario: Unsuccessful configured purge fails deployment

- **GIVEN** both purge secrets are present
- **WHEN** the purge returns an HTTP error, malformed JSON, or `success: false`
- **THEN** the purge step fails rather than reporting success.

#### Scenario: Soak window ends

- **GIVEN** the seven-day migration soak is complete
- **WHEN** the GitHub Pages workflow is retired
- **THEN** its purge step and the two purge credentials are retired with it.
