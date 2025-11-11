# Artagon Web (Astro)

> **Motto:** Verified, Private, Attested

## CI Status
> Replace `OWNER/REPO` in badge URLs after pushing.

[![Deploy](https://github.com/OWNER/REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/deploy.yml)
[![Link Check](https://github.com/OWNER/REPO/actions/workflows/link-check.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/link-check.yml)
[![Lighthouse CI](https://github.com/OWNER/REPO/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/lighthouse.yml)

This is an Astro-based static site for **Artagon** with homepage, docs shell, console shell, and the Vision page, plus SRI/CSP hardening and CI.

## Develop
```bash
npm install
npm run dev
```

## Build & Preview
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
Push to `main`; Actions will build & deploy to Pages. Set custom domain to `artagon.com` and **Enforce HTTPS**. HSTS is configured at the CDN or origin (see `deploy/`).

## DocSearch (Algolia) — optional
- Component is embedded in `/search`; fill `public/docsearch.json`.

## Release bundles on tags
Tag like `v0.1.0` → a zip of `dist/` is attached to the GitHub release.

## Subresource Integrity (SRI) & CSP
`npm run build` triggers postbuild scripts:
- `scripts/sri.mjs` injects sha256 SRI + `crossorigin` for JS/CSS.
- `scripts/csp.mjs` inserts a CSP `<meta>` with hashes of inline scripts.
Disable CDN JS/CSS minify to avoid SRI mismatches.

### OG image composer (SVG → PNG)
```bash
./scripts/make-og-from-template.sh "Artagon — Identity that can prove it" "Passkeys • VCs • Attestation • Policy" public/assets/og-image.png --logo public/assets/logo-lockup.png
```

## Agents
See `.agents/` for context, guardrails, workflows, and machine-readable config.
