# github-pages-deployment Specification

## Purpose
TBD - created by archiving change fix-pages-build. Update Purpose after archive.
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

