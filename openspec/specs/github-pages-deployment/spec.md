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
