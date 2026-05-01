# SEO Review — update-site-marketing-redesign

Reviewer: claude-sonnet-4-6 (adversarial SEO + structured data + indexation)
Date: 2026-05-01
Files reviewed: proposal.md, design.md, tasks.md, all 9 specs/\*/spec.md

---

## Content Audit Report

| Category                | Score | Issues Found                                | Recommendations                                              |
| ----------------------- | ----- | ------------------------------------------- | ------------------------------------------------------------ |
| Redirect integrity      | 4/10  | Fragment redirect leaks PageRank signal     | 301 to /platform, rely on in-page anchor                     |
| Canonical hygiene       | 5/10  | No UTM param-stripping rule                 | Self-canonical to stripped URL in BaseLayout                 |
| Structured data quality | 5/10  | Article missing publisher + image required  | Add publisher org block; treat image as required             |
| Indexation policy       | 7/10  | /search noindex conflicts with SearchAction | Remove SearchAction or make /search indexable                |
| Sitemap lastmod         | 5/10  | Source undefined; CI mtime is unreliable    | Bind lastmod to MDX published/updated frontmatter            |
| Rich-result eligibility | 4/10  | DefinedTerm oversold as rich-result trigger | Document as entity signal only; add FAQPage where applicable |
| OG image cache hygiene  | 6/10  | No cache-busting on generated OG assets     | Hash in filename for satori-generated images                 |
| Heading hierarchy       | 7/10  | h1→h2→h3 ladder in spec only implicitly     | Promote to explicit spec requirement with lint enforcement   |
| RSS feed validation     | 6/10  | No W3C validation gate in pipeline          | Add validator step to CI                                     |
| hreflang                | 5/10  | x-default self-ref deferred with no note    | Add x-default self-ref as zero-cost follow-up task           |

---

## Findings

### F1 — Critical: 301 to Fragment Bypasses Canonical Signal

**Files:** specs/site-bridge-story/spec.md (Redirect requirement), proposal.md (Risks)

Google does not pass link equity through anchor fragments in redirect Location headers. A 301 from `/bridge` to `/platform#bridge` delivers users to the right scroll position but Google treats the canonical target as `/platform#bridge` — a URL that, with `trailingSlash: 'never'` and no hash normalization, is never in the sitemap and triggers a soft-404 signal on recrawl. The spec scenario asserts the 301 Location header IS `/platform#bridge` verbatim, locking in the fragment-bearing destination.

**Remediation:** Change the 301 destination to `/platform` (no fragment) in `public/_redirects`. Preserve the scroll behavior using a `<meta http-equiv="refresh">` shim on a thin server-side redirect page or rely on the hero CTA `href="/platform#bridge"`. The Playwright scenario in `tests/bridge.spec.ts` should assert Location is `/platform`, not `/platform#bridge`.

---

### F2 — High: WebSite SearchAction Target is Noindex — Search Console Warning Risk

**Files:** specs/site-structured-data/spec.md (Sitewide Organization and WebSite JSON-LD), specs/site-indexation/spec.md (Noindex requirement)

The WebSite `potentialAction` SearchAction target points to `/search`, which the indexation spec simultaneously marks `noindex, nofollow`. Google's Sitelinks Search Box feature requires the `target` URL to be a live, indexable search results page. Pointing a SearchAction at a noindex route will generate a Search Console warning and is likely to cause Googlebot to suppress the sitelinks search box entirely.

**Remediation:** Either (a) remove the `potentialAction` SearchAction from the WebSite block entirely until a public search results page is indexable, or (b) remove noindex from `/search` if it renders meaningful results. Option (a) is lower risk for this change scope.

---

### F3 — High: Article JSON-LD Missing publisher and image is Optional — Top Stories Risk

**Files:** specs/site-structured-data/spec.md (Article and BreadcrumbList requirement)

Google's Article structured data guidelines for News and Top Stories eligibility treat `image` (≥ 1200 px wide, 1:1/4:3/16:9 aspect ratio) and `publisher` (Organization with `logo`) as required for feature eligibility, not optional. The spec lists `image?` as optional and is silent on `publisher`. A writing post that omits `cover` frontmatter will generate a `publisher`-less, `image`-less Article block that will fail Google's Rich Results Test.

**Remediation:** (1) Require `publisher` on every Article block, resolved from the sitewide Organization object. (2) Downgrade `image?` to "required for Top Stories eligibility" with a build warning (not hard fail) when a post lacks `cover`. Add `publisher` to the `validate-structured-data.mjs` required-field check list.

---

### F4 — High: Sitemap lastmod Source Unspecified — CI mtime is Unreliable

**Files:** specs/site-indexation/spec.md (Sitemap Regeneration), tasks.md task 10.1

The sitemap spec requires regeneration on build but does not specify what `<lastmod>` resolves to. `@astrojs/sitemap` defaults to the file's mtime, which in CI is the checkout timestamp of the build — not the editorial last-modified date. This means Google will see every page as updated on every deploy, degrading crawl budget efficiency.

**Remediation:** In `astro.config.mjs`, pass a `serialize` hook to `@astrojs/sitemap` that maps each URL to its MDX `updated` frontmatter (falling back to `published`). Add this to task 10.1 acceptance criteria. The `validate-indexation.mjs` script should assert that `<lastmod>` for writing posts matches the most recent of `published`/`updated` frontmatter values.

---

### F5 — Medium: DefinedTerm Oversold as Rich-Result Trigger

**Files:** specs/site-standards-registry/spec.md (DefinedTerm JSON-LD Emission), specs/site-structured-data/spec.md (DefinedTerm on Standards Page), design.md Decision 13

The spec and design both frame DefinedTermSet / DefinedTerm emission as producing "rich results." As of late 2025/early 2026, Google's Rich Results Test recognizes DefinedTerm as a valid schema.org type but does not render a triggered SERP feature for it. Its value is entity disambiguation and Knowledge Graph reinforcement, not a direct SERP enhancement. The spec scenario names only structure validation, which is correct, but the framing in design.md §13 ("for rich results") sets false implementation success criteria.

**Remediation:** Replace "for rich results" framing in design.md and any spec rationale with "entity signal / Knowledge Graph." For actual rich results, add a `FAQPage` block to `/faq` and a `HowTo` or `FAQPage` block to `/platform` where the content supports it. These are proven triggered features.

---

### F6 — Medium: UTM / Query-String Canonicalization Not Specified

**Files:** specs/site-navigation/spec.md (Per-route Metadata Emission), specs/site-indexation/spec.md (Trailing-slash Policy)

The canonical spec requires a path-only canonical URL, but neither the navigation spec nor the indexation spec addresses query-string parameters. A UTM-tagged inbound link (`/platform?utm_source=hn`) will be crawled with the query string. Without an explicit instruction in `BaseLayout.astro` to strip query params from the emitted `<link rel="canonical">`, multiple variants of the same page can accumulate as separate URLs in Google's index.

**Remediation:** Add to the Per-route Metadata Emission requirement: canonical MUST be constructed from `Astro.url.pathname` only (not `Astro.url.href`) to ensure query strings are never reflected in the canonical tag. Add a lint-meta check that the canonical value contains no `?`.

---

### F7 — Medium: OG Image Cache-Busting Missing for Updated Posts

**Files:** specs/site-branding/spec.md (Per-slug Open Graph Images), tasks.md task 11.5

The OG image pipeline generates per-slug images via satori. X/Twitter and LinkedIn aggressively cache OG images keyed to URL. When a post's `cover` is updated, the old image remains cached at the same path indefinitely. The spec is silent on cache-busting strategy.

**Remediation:** For satori-generated images, embed a content hash in the filename (e.g., `/og/use-cases-[hash].png`) and update the `og:image` meta accordingly each build. For custom `cover` assets, use Astro's built-in asset hashing. Add to the generate-og-images.mjs acceptance criteria.

---

### F8 — Medium: h1→h2→h3 Heading Ladder in Design Only, Not Spec-Enforced

**Files:** design.md §4.12 (referenced but not in specs), specs/site-mobile-layout/spec.md (Single H1)

The single-h1 rule is spec-enforced via `lint-meta.mjs`. However the h1→h2→h3 sequential ladder for writing posts (noted in design.md) is not a spec requirement and not in any lint gate. Google's quality rater guidelines and documentation cite heading hierarchy as a comprehension signal; skipped heading levels (h1 → h3) generate accessibility and SEO flags.

**Remediation:** Add a requirement to specs/site-content/spec.md: writing posts MUST NOT skip heading levels; `lint-meta.mjs` or a dedicated heading-order check in `validate-indexation.mjs` should enforce the ladder in built HTML.

---

### F9 — Low: RSS Feed Has No W3C Validation Gate

**Files:** specs/site-indexation/spec.md (RSS link rel=alternate), tasks.md task 4.6

The RSS feed is emitted via `@astrojs/rss` but no validation step against the W3C Feed Validator (or feedvalidator.org schema) is wired into CI. Malformed `<guid>`, missing absolute `<link>`, or incorrect date format are the most common causes of feed rejection by aggregators and RSS readers.

**Remediation:** Add task 4.6a: add `scripts/validate-rss.mjs` that parses `dist/writing/feed.xml` and asserts each `<item>` has an absolute `<link>`, a `<guid isPermaLink="true">`, and a parseable RFC-822 `<pubDate>`. Wire into the Phase 12 quality gates.

---

### F10 — Low: hreflang x-default Fully Deferred Without Minimal Self-Reference Note

**Files:** proposal.md (Out of Scope — Internationalization)

The proposal correctly defers full i18n, but for a monolingual English site, a single `<link rel="alternate" hreflang="x-default" href="https://artagon.com/{path}">` self-reference per page is valid, zero-cost, and signals to Google that this is the canonical locale. The proposal does not acknowledge this option, which means follow-up implementors may skip it entirely.

**Remediation:** Add a note to the i18n out-of-scope clause: "Follow-up `add-i18n-foundations` SHOULD add at minimum `hreflang='x-default'` self-reference tags even before multi-locale support ships." No action needed in this change.

---

## Summary

| Severity | Count | IDs            |
| -------- | ----- | -------------- |
| Critical | 1     | F1             |
| High     | 3     | F2, F3, F4     |
| Medium   | 4     | F5, F6, F7, F8 |
| Low      | 2     | F9, F10        |

Must-fix before shipping (Critical + High): **4 findings** (F1, F2, F3, F4).

---

## Verdict

APPROVE-WITH-CHANGES — 4 must-fix items.

F1 and F2 are spec-level defects that will produce measurable Google Search Console errors on launch. F3 and F4 are silent quality degradations that cost crawl budget and Top Stories eligibility. None of the four requires architectural rework; all are contained to `public/_redirects`, `BaseLayout.astro`, `validate-structured-data.mjs`, and `astro.config.mjs` sitemap configuration. The Lighthouse SEO >= 95 threshold is achievable after these fixes. Medium and low findings are improvements; none is a blocker.
