## Why

GitHub Pages is attempting to run the default Jekyll build against Astro source files, which fails on `.astro` front matter and blocks deployments after merges.

## What Changes

- Ensure GitHub Pages deploys from the Astro build artifact produced by `.github/workflows/deploy.yml`.
- Prevent Jekyll processing of published assets by adding a `.nojekyll` marker.
- Add a safe Jekyll fallback configuration that excludes Astro sources if branch builds remain enabled.
- Document the required Pages source setting (GitHub Actions) for maintainers.

## Impact

- Affected specs: github-pages-deployment
- Affected code: `public/.nojekyll`, `_config.yml`, documentation for Pages settings
- Affected systems: GitHub Pages repository settings
