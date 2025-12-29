## Why

Local quality checks were unreliable due to LHCI server readiness warnings and link checks failing on unstable external URLs. This change documents the stabilized local workflows and link hygiene that keep CI checks deterministic.

## What Changes

- Add a dedicated LHCI local server script that emits a deterministic READY signal.
- Update Lighthouse CI configuration to use the local server script.
- Align Lychee configuration with current CLI schema for reliable parsing.
- Replace external subdomain links and hard-coded endpoints with internal routes or placeholders.
- Remove external reference URLs in icon documentation and drop the SearchAction JSON-LD block.
- Update OpenSpec workflow documentation and agent context docs to reflect the new issue and branch requirements.

## Impact

- Affected specs: `specs/check-site-quality/spec.md`, `specs/manage-site-links/spec.md`, `specs/openspec-workflow/spec.md`
- Affected code: `scripts/lhci-serve.mjs`, `lighthouserc.json`, `lychee.toml`, `README.md`, `src/pages/index.astro`, `src/pages/docs/index.astro`, `src/pages/faq/index.astro`, `src/data/faq.ts`, `src/components/SeoTags.astro`, `scripts/icons/README.md`, `scripts/icons/VERIFICATION.md`
