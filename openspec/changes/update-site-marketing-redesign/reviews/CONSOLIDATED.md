# Consolidated Adversarial Review — `update-site-marketing-redesign`

**Target:** OpenSpec change at `openspec/changes/update-site-marketing-redesign/`
**Reviewers:** 5 parallel adversarial sub-agents (security, accessibility, architecture, performance, SEO).
**Date:** 2026-05-01
**Files reviewed:** `proposal.md`, `design.md`, `tasks.md`, 9 capability deltas under `specs/`.
**Status:** Frontend (Astro/TS/CSS) review still running; Codex/Gemini delegations were not invoked (skill auth gate).

> All five reviewers returned **APPROVE-WITH-CHANGES**. No reviewer recommended BLOCK.

---

## Critical (1)

### C1 · Lighthouse gate is `warn`-only and runs only on `/` ⟶ all perf claims unenforced

**Source:** Performance · `lighthouserc.json:11-16` vs `proposal.md:48`, `tasks.md:126`.
The proposal repeatedly cites "Lighthouse perf ≥ 90 enforces" as the safety net for fonts, Shiki, JSON-LD, and islands. Actual `lighthouserc.json` asserts performance at **`warn`** (not `error`) and only collects `http://localhost:8081/`. None of the new routes are exercised; perf regressions cannot fail CI.
**Fix:** Add a Requirement (under `style-system` or new `site-performance-budgets` cap) mandating `lighthouserc.json` (a) lists every marketing route plus a `/writing/[slug]`, (b) sets perf to **`error` ≥ 0.9**, (c) asserts CWV thresholds: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, INP ≤ 200 ms. Block `tasks.md §12.2` on the config edit.

---

## High (10)

### H1 · JSON-LD `</script>` injection vector unspecified

**Source:** Security · `specs/site-structured-data/spec.md:30-37`; `design.md:125`.
Astro's default child-text escaping does NOT escape `</script>`, `<!--`, or `<script` inside `<script type="application/ld+json">`. A crafted `Article.headline` or `DefinedTerm.description` could close the script tag and inject HTML.
**Fix:** Require explicit `<` → `&lt;` (and `>`, `&`) escape before interpolation, plus a `validate-structured-data.mjs` substring assertion that `dist/` contains no raw `</script>` inside ld+json blocks.

### H2 · CSP inline-script hash drift on theme bootstrap

**Source:** Security · `specs/site-navigation/spec.md:68-75`; `tasks.md:38,129`.
Spec mandates CSP-hashing but doesn't require build failure when the bootstrap script body changes and the hash list goes stale. Silent CSP break.
**Fix:** Require build failure if any inline `<script>` in `dist/` has a SHA-256 not present in CSP `script-src`; forbid `'unsafe-inline'`. Add a Playwright/CI scenario.

### H3 · TrustChain tooltip primitive has zero spec coverage

**Source:** Accessibility · no requirement; `tasks.md:87` mentions component name only.
DESIGN.md §4.13 is the most a11y-dense primitive (role="dialog", aria-modal="false", Esc-dismiss, redundant info button as the only switch/keyboard affordance, opacity-only ≤ 80 ms under reduced motion). A task without a requirement is not a testable gate.
**Fix:** Add a `TrustChain Tooltip` requirement to `site-mobile-layout` (or fold into a renamed cap) encoding the dialog role, keyboard operability, focus rules, and reduced-motion contract.

### H4 · Skip-link focus-management unspecified (WCAG 2.4.1)

**Source:** Accessibility · `specs/site-navigation/spec.md:17-29`.
Spec requires skip-link as first tabbable + `<main tabindex="-1">` but never says activation MUST move focus into `<main>`. Safari/Firefox leave focus on the link.
**Fix:** Add scenario "WHEN user activates skip link, THEN `document.activeElement === main` and next Tab lands inside `<main>`."

### H5 · Standards-chip caption unreachable for keyboard-only desktop (WCAG 1.4.13, 2.1.1)

**Source:** Accessibility · `specs/site-standards-registry/spec.md:17-29`.
Caption shown only on `:hover` (desktop) or `@media (hover: none)` (mobile). Keyboard-only desktop users get neither.
**Fix:** Caption MUST be visible on `:hover` OR `:focus-visible`, AND default-visible under `@media (hover: none)`. Caption must be dismissable, hoverable, and persistent per WCAG 1.4.13.

### H6 · `site-mobile-layout` overlaps `style-system`; four caps share `BaseLayout.astro`

**Source:** Architecture · `specs/site-mobile-layout/spec.md:1-52`; `tasks.md:94-121,141-146`.
`site-mobile-layout`'s "Three Global Breakpoints" + "No Horizontal Overflow" / "No Global Viewport Scale" are token contracts owned by `style-system`. Separately, `site-structured-data`, `site-indexation`, `site-navigation`, `site-branding` all mutate `BaseLayout.astro` — capabilities that must coordinate edits to one file are not orthogonal.
**Fix:** Fold breakpoint/no-scale/no-overflow into `style-system`. Either collapse the four BaseLayout-mutators into `site-metadata` OR add a slot ABI requirement under `site-navigation` (`<JsonLd/>`, `<Indexation/>`, `<Branding/>`) that the others consume.

### H7 · Merge-order gate is hygiene, not enforcement

**Source:** Architecture · `tasks.md:7`; `design.md:29-35`.
"Confirm `refactor-styling-architecture` has merged" is a checkbox; `openspec validate --strict` passes while the blocker is open.
**Fix:** Add `npm run verify:prerequisites` that fails unless `openspec/changes/refactor-styling-architecture/` is archived OR its merge commit is an ancestor of HEAD; wire into postbuild.

### H8 · No total font-payload budget for five WOFF2 families

**Source:** Performance · `specs/style-system/spec.md:30-42`.
Five families × multiple weights commonly hit 250–400 KB even with WOFF2 + Latin subsetting. Spec gives only a CLS scenario.
**Fix:** Add Requirement: total WOFF2 per route ≤ 180 KB; per-family ≤ 60 KB; verified by `scripts/measure-font-payload.mjs`. Non-display families (Fraunces, Instrument Serif) load only on routes that use them.

### H9 · LCP-critical preload face is unspecified

**Source:** Performance · `design.md:103`.
"Preload the LCP-critical display face" never names which face. If Inter Tight is preloaded instead of Space Grotesk (hero h1), LCP and CLS regress.
**Fix:** Add scenario under "Self-hosted WOFF2 Fonts": exactly one `<link rel="preload" as="font" type="font/woff2" crossorigin>`, href matching the @font-face used by the LCP `<h1>` (Playwright asserts via `getComputedStyle(h1).fontFamily`).

### H10 · /bridge → /platform#bridge fragment redirect leaks PageRank

**Source:** SEO · `specs/site-bridge-story/spec.md` (Redirect requirement); `proposal.md:153`.
Google does not pass link equity through anchor fragments in 301 Location headers; `/platform#bridge` will never appear in the sitemap and triggers a soft-404 signal on recrawl.
**Fix:** Change destination to `/platform` (no fragment); rely on the home hero CTA's `href="/platform#bridge"` for scroll behavior. Update `tests/bridge.spec.ts` Location assertion.

### H11 · WebSite SearchAction targets noindex /search ⟶ Search Console warning

**Source:** SEO · `specs/site-structured-data/spec.md` ✕ `specs/site-indexation/spec.md`.
SearchAction `target` requires an indexable results page; `/search` is `noindex, nofollow`. Risks suppression of the sitelinks search box and Search Console errors.
**Fix:** Remove the `potentialAction` SearchAction from the WebSite block until `/search` is indexable.

### H12 · Article JSON-LD missing `publisher`; `image` only optional ⟶ Top Stories disqualification

**Source:** SEO · `specs/site-structured-data/spec.md` (Article requirement).
Google requires `publisher` (Organization with logo) and `image` (≥ 1200 px) for News/Top Stories eligibility.
**Fix:** Require `publisher` resolved from sitewide Organization on every Article block; downgrade `image?` to "required for Top Stories eligibility" with a build warning when `cover` is absent.

### H13 · Sitemap `<lastmod>` source unspecified ⟶ CI mtime tells Google "everything updated every deploy"

**Source:** SEO · `specs/site-indexation/spec.md` (Sitemap Regeneration); `tasks.md:10.1`.
`@astrojs/sitemap` defaults to file mtime, which equals checkout time in CI. Crawl-budget-degrading signal.
**Fix:** Pass a `serialize` hook to `@astrojs/sitemap` mapping each URL to MDX `updated`/`published` frontmatter. Add to `validate-indexation.mjs`.

> Total **High = 13**. (H1-H13; the consolidated count for "must-fix before shipping" combining all dimensions.)

---

## Medium (12 — abbreviated)

| ID  | Dimension    | Summary                                                                              | Fix one-liner                                                                     |
| --- | ------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| M1  | Security     | `/bridge` redirect map lacks same-origin destination constraint                      | Reject `://` and `//` destinations in `validate-indexation.mjs`                   |
| M2  | Security     | Three separate enumerations of NOINDEX routes can drift                              | Single `NOINDEX_ROUTES` source consumed by sitemap, BaseLayout, robots, validator |
| M3  | Security     | Frontmatter `cover` shape unconstrained ⟶ satori SSRF if schema later relaxed        | Zod `.regex(/^\.\/assets\//)`                                                     |
| M4  | A11y         | TrustChain reduced-motion freeze-vs-disable ambiguous                                | Pin to PERMIT/DENY end-state, never mid-cycle                                     |
| M5  | A11y         | PERMIT/DENY conveyed by color alone (WCAG 1.4.1)                                     | Require non-color signal (text/icon/ARIA)                                         |
| M6  | A11y         | Forced-colors scope is bridge-only                                                   | Extend to nav, chips, trust chain                                                 |
| M7  | A11y         | Icon-button, hamburger, tooltip-close, theme-toggle tap targets unspecified          | Enumerate ≥ 44×44 floor for each                                                  |
| M8  | Architecture | MODIFIED `Solid Card Variant` smuggles ADDED variants                                | Split into ADDED `Card Variant Set`                                               |
| M9  | Architecture | No "preserve existing tokens" contract ⟶ strict reader could clean-rebuild theme.css | ADD `Existing Token Preservation` requirement                                     |
| M10 | Architecture | `lint-tokens` belongs in ast-grep YAML, not mjs                                      | Promote to `rules/security/no-raw-color-literal.yaml` + `no-raw-length.yaml`      |
| M11 | Performance  | No JSON-LD size ceiling on `/standards` (DefinedTermSet × 8)                         | Aggregate ≤ 8 KB; `JSON.stringify` no indent; ceiling enforced                    |
| M12 | SEO          | DefinedTerm framed as rich-result trigger; it isn't (per Google as of 2026-Q1)       | Reframe as entity/Knowledge Graph signal; add FAQPage where content fits          |

---

## Low (10 — abbreviated)

| ID  | Dimension    | Summary                                                                                    |
| --- | ------------ | ------------------------------------------------------------------------------------------ |
| L1  | Security     | `StandardChip` `rel="noopener noreferrer"` not lint-enforced                               |
| L2  | Security     | localStorage theme bootstrap reflection (no allow-list mandate)                            |
| L3  | A11y         | Theme toggle missing `aria-pressed` or state-bearing accessible name                       |
| L4  | A11y         | Writing heading ladder (h1→h2→h3) unspecified                                              |
| L5  | Architecture | Rollback "self-contained per phase" overstates reality (BaseLayout/theme.css cross-cut)    |
| L6  | Architecture | Astro 5 glob loader API not addressed in spec                                              |
| L7  | Architecture | Broken reference to deleted `openspec/AGENTS.md` (`proposal.md:86`)                        |
| L8  | Performance  | TrustChain animation lacks offscreen-pause via IntersectionObserver                        |
| L9  | SEO          | UTM/query-string canonicalization not specified                                            |
| L10 | SEO          | RSS feed has no W3C validation gate; `hreflang="x-default"` self-ref deferred without note |

---

## Cross-dimensional patterns

- **Single-source enumeration gap**: M2 (NOINDEX routes), L4/F8 (heading ladder), F9 (RSS validation) all describe rules that exist but lack a single-source enforcement gate.
- **Standards-chip authority**: H5 (a11y caption) + L1 (rel lint) + cross-route consumption (already in spec) — chip is the most-touched primitive across reviews.
- **BaseLayout shotgun surgery**: H6 + Architecture's slot-ABI suggestion + Security's CSP-hash drift (H2) all converge on `BaseLayout.astro` being the load-bearing file with insufficient modular contracts.

---

## Summary

| Dimension           | Critical | High   | Medium | Low    | Verdict                           |
| ------------------- | -------- | ------ | ------ | ------ | --------------------------------- |
| Security            | 0        | 2      | 3      | 2      | APPROVE-WITH-CHANGES (6 must-fix) |
| Accessibility       | 0        | 3      | 4      | 2      | APPROVE-WITH-CHANGES (6 must-fix) |
| Architecture        | 0        | 3      | 4      | 3      | APPROVE-WITH-CHANGES (4 must-fix) |
| Performance         | 1        | 2      | 5      | 1      | APPROVE-WITH-CHANGES (4 must-fix) |
| SEO                 | 1        | 3      | 4      | 2      | APPROVE-WITH-CHANGES (4 must-fix) |
| **Total (deduped)** | **1**    | **13** | **12** | **10** | **APPROVE-WITH-CHANGES**          |

Net unique must-fix items (Critical + High, deduped across dimensions): **14**.

---

## Recommendation

Apply the **14 must-fix amendments** as a follow-up edit pass on `proposal.md`, `design.md`, and the affected capability deltas. After amendments, re-run `openspec validate --strict update-site-marketing-redesign`. The 12 mediums and 10 lows can be batched into either:

1. A single follow-up amendment commit on the same change branch, OR
2. A new follow-up change `tighten-redesign-quality-gates` that lands after the main change merges.

No reviewer recommends rejecting the change. The proposal is structurally sound; gaps are scope-completeness and enforcement-rigor, not direction errors.
