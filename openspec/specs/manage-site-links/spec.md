# manage-site-links Specification

## Purpose

This capability defines the contracts that govern how internal and
external links / URLs / endpoint references are authored across
the artagon-site marketing surfaces. Marketing CTAs MUST link to
internal routes (`/docs`, `/play`, `/get-started`); code examples
MUST use placeholder variables (`$TOKEN_ENDPOINT`,
`$OPENID_CONFIGURATION_URL`) rather than hard-coded external URLs;
public copy MUST avoid hard-coded external subdomain references in
favor of internal routes or generic terms; the SeoTags JSON-LD
output MUST omit the `WebSite SearchAction` block until a stable
non-redirecting search endpoint exists. The capability was created
by archiving the `update-site-quality-checks` change
(`openspec/changes/archive/2025-12-29-update-site-quality-checks/`),
which consolidated the link-hygiene contracts that the broader
quality-checks scope first introduced. Lychee (the link checker
configured at `lychee.toml`) operationalizes part of this contract
at CI time.

**KNOWN SPEC DRIFT (pt395 archaeology — SearchAction now ships)**:
The "Omit SearchAction JSON-LD" Requirement below mandates that
the SeoTags output ship "without a SearchAction block" — that
Scenario reflects the pre-USMR state when no `/search` route
existed. Under USMR Phase 5.5.16-pt152 the `/search` route
shipped (`src/pages/search/index.astro`) AND the SearchAction
target was rewritten to `${SITE}/search?q={search_term_string}`
(non-redirecting per `astro.config.ts` `trailingSlash: "never"`).
The live `src/components/SeoTags.astro:179-194` correctly emits
the SearchAction block under the Requirement's "unless" clause
("unless a stable non-redirecting search endpoint is available").
The Scenario at line 64-67 needs a follow-up amendment (separate
OpenSpec proposal) to either add the `/search` route as a
qualifier OR drop the unconditional "without a SearchAction"
assertion. Per OpenSpec discipline, pt395 is doc-scope (Purpose
backfill) only and does NOT modify the Requirement / Scenario
text — Requirements changes go through proposals, not direct
edits.

## Requirements

### Requirement: Internal Product CTAs

Marketing pages SHALL use internal routes for docs, playground, and onboarding calls to action.

#### Scenario: Homepage and docs shell use internal routes

- **WHEN** a visitor views the homepage or docs shell
- **THEN** primary CTAs link to `/docs`, `/play`, and `/get-started`

### Requirement: Endpoint Examples Use Placeholders

Code examples SHALL use placeholder variables for service endpoints instead of hard-coded external URLs.

#### Scenario: Quickstart examples display placeholders

- **WHEN** rendering quickstart code samples
- **THEN** examples include `$TOKEN_ENDPOINT` and `$OPENID_CONFIGURATION_URL` placeholders

### Requirement: Public Copy Avoids External Subdomains

Public-facing copy SHALL avoid hard-coded external subdomain URLs and use internal routes or generic references instead.

#### Scenario: FAQ copy stays domain-neutral

- **WHEN** rendering FAQ answers or marketing copy
- **THEN** references to docs, console, or playground avoid explicit subdomain URLs

### Requirement: Icon Docs Avoid External References

Icon documentation SHALL avoid external reference URLs and provide self-contained guidance.

#### Scenario: Icon verification docs are self-contained

- **WHEN** reading `scripts/icons/README.md` or `scripts/icons/VERIFICATION.md`
- **THEN** no external resource hyperlinks are required to follow the guidance

### Requirement: Omit SearchAction JSON-LD

SEO metadata SHALL omit the WebSite SearchAction JSON-LD block unless a stable non-redirecting search endpoint is available.

#### Scenario: SeoTags renders without SearchAction

- **WHEN** `src/components/SeoTags.astro` renders JSON-LD
- **THEN** it includes Organization and Service schemas without a SearchAction block
