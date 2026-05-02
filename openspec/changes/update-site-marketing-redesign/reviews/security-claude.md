# Security Review — update-site-marketing-redesign

Scope: SECURITY only. Confidence ≥80% under existing posture (SRI/CSP postbuild, ast-grep, static Astro).

---

## High

### H1. JSON-LD `</script>` injection vector unspecified
**Location**: `specs/site-structured-data/spec.md:30-37`; `design.md:125`
The spec mandates `JSON.stringify` + Astro interpolation and forbids `set:html` — necessary but **insufficient**. Astro's default escaping inside `<script type="application/ld+json">` does NOT escape literal `</script>` (or `<!--`, `<script`) embedded in MDX-authored fields like `Article.headline`, `DefinedTerm.description` (from `longSummary`), or author bios. A crafted `"</script><img src=x onerror=alert(1)>"` would terminate the script tag and execute. Content is committed-MDX (low likelihood) but policy belongs in spec.
**Remediation**: In Requirement: JSON-LD Safety add: "JSON-LD payloads MUST escape `<` as `<` (and `>`, `&`) before interpolation. `scripts/validate-structured-data.mjs` MUST assert no raw `</script>` substring appears in any emitted JSON-LD block in `dist/`."

### H2. CSP inline-script hash drift on theme bootstrap
**Location**: `specs/site-navigation/spec.md:68-75`; `tasks.md:38,129`; `design.md:153`
Spec requires CSP-hashing but does not require build failure when the bootstrap body changes and the hash list is stale. Editing the script without rerunning `csp.mjs` silently breaks CSP in browsers honoring meta CSP; theme flicker is the only signal.
**Remediation**: Add to Theme Toggle: "Build MUST fail if any inline `<script>` in `dist/` has a SHA-256 not present in the CSP `script-src` directive. `scripts/csp.mjs` MUST NOT emit `'unsafe-inline'` for `script-src`. A scenario MUST verify editing the bootstrap without rerunning hashing fails CI."

## Medium

### M1. `/bridge` redirect map not constrained to internal targets
**Location**: `specs/site-bridge-story/spec.md:45-57`; `tasks.md:79`
Spec lists source patterns but not destination scope. `public/_redirects` is shared with `site-indexation`; a future contributor could add an external destination, creating an open-redirect surface.
**Remediation**: Add: "All destinations in `public/_redirects` MUST be same-origin (begin with `/`). `scripts/validate-indexation.mjs` MUST parse `public/_redirects` and fail build if any destination contains `://` or starts with `//`."

### M2. Sitemap-exclusion and noindex lists can drift
**Location**: `specs/site-indexation/spec.md:3-29`
Three requirements separately enumerate `/console`, `/search`, `/play`, `/404`; robots.txt requirement (line 33) lists only three. No single source. A new app-shell route added to noindex but forgotten in the sitemap filter would leak via `sitemap-index.xml`.
**Remediation**: Add: "Non-indexable routes MUST be defined once (e.g., `src/lib/indexation.ts` `NOINDEX_ROUTES`) consumed by sitemap filter, `BaseLayout.astro` `indexable` prop, `robots.txt` generation, and `validate-indexation.mjs`. Build MUST fail if any consumer diverges."

### M3. Satori OG: frontmatter `cover` shape unconstrained
**Location**: `specs/site-branding/spec.md:30-43`; `specs/site-content/spec.md:81-94`
Zod schema accepts `cover` as optional `string` with no restriction. If satori later fetches URLs from `cover`, an absolute URL becomes SSRF against the GitHub Actions build network. Threat low (committed MDX), but defense-in-depth belongs in schema.
**Remediation**: Constrain in Type-Safe Content Schemas: "`cover?: string` MUST match Zod `.regex(/^\.\/assets\//)`; absolute URLs and `..` traversal rejected at build time."

## Low

### L1. `StandardChip` `rel` not lint-enforced
**Location**: `specs/site-standards-registry/spec.md:17-29`
Text says `rel="noopener noreferrer"` but the only scenario asserts `window.opener` is null — modern browsers enforce that by default. A future refactor dropping `rel` would still pass.
**Remediation**: Add scenario: "**WHEN** a build-time check inspects every `<a target=\"_blank\">` in `dist/` **THEN** it MUST carry both `noopener` and `noreferrer` tokens in `rel` (order-independent)."

### L2. localStorage theme bootstrap reflection
**Location**: `specs/site-navigation/spec.md:68-75`
Pre-paint script reads `localStorage.theme` and applies it to `<html data-theme>`. If implementation uses string concatenation into `setAttribute` (or `innerHTML`), an extension writing `localStorage.theme = 'x" onmouseover=alert(1) data-x="'` could inject attributes. Spec mandates no allow-list.
**Remediation**: Add: "Bootstrap MUST validate `localStorage.theme` against allow-list `['twilight','midnight']`; unknown values fall back to `twilight`. Script MUST NOT use `innerHTML`, `outerHTML`, `document.write`, or string-concatenated attribute construction."

---

## Verdict

APPROVE-WITH-CHANGES — 6 must-fix items (H1, H2, M1, M2, M3, L2).
