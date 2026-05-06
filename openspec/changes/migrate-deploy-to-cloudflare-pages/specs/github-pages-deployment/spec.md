## MODIFIED Requirements

### Requirement: GitHub Pages deploys from the Astro workflow

The GitHub Pages site SHALL continue to deploy from the Astro build workflow defined in `.github/workflows/deploy.yml` for the duration of the parallel-deploy soak window (Phases 5-7 of `migrate-deploy-to-cloudflare-pages`). After the soak window, this requirement is REMOVED via a follow-up OpenSpec change `archive-github-pages-deployment`.

During the soak window, BOTH the GitHub Pages workflow AND the Cloudflare Pages workflow MUST run on every push to `main`, depositing identical `.build/dist` content to both targets. This invariant lets DNS cutover and rollback be a registrar-only operation with no code change.

#### Scenario: Both workflows run in parallel during soak

- **WHEN** a commit lands on `main` during the soak window
- **THEN** both `.github/workflows/deploy.yml` (Cloudflare Pages) and `.github/workflows/deploy-github-pages.yml` (renamed from the existing GH Pages workflow) succeed; both targets serve identical content.

#### Scenario: Pages source is GitHub Actions

- **WHEN** GitHub Pages is configured for deployment
- **THEN** the Pages source is set to GitHub Actions and the renamed Astro workflow (`deploy-github-pages.yml`) is the authoritative GH-Pages build pipeline during soak.

### Requirement: Pages source setting is documented

Project documentation SHALL state that the GitHub Pages source must be set to GitHub Actions and reference the Astro deploy workflow. After the parallel-deploy soak window, the documentation SHALL also state that GitHub Pages is the FALLBACK target during DNS rollback, not the production target.

#### Scenario: Maintainers verify Pages configuration during soak

- **WHEN** a maintainer reviews `docs/deploy.md` during the soak window
- **THEN** the document explicitly identifies Cloudflare Pages as the production deploy target (DNS-pointed) and GitHub Pages as the rollback target (DNS-pointed via revert).
