## ADDED Requirements

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
