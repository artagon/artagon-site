# Performance Review — update-site-marketing-redesign

Reviewer: Claude (Opus 4.7), dimension: PERFORMANCE only.

## Findings

### [Critical] Lighthouse gate is `warn` and runs only on `/`
`lighthouserc.json:11-16` vs `proposal.md:48`, `tasks.md:126`. Proposal cites "Lighthouse perf ≥ 90 enforces" as the safety net for fonts, Shiki, JSON-LD, and islands. Actual config asserts `categories:performance` at level `warn` and only collects `http://localhost:8081/`. None of the new routes are exercised; perf regressions cannot fail CI.

Fix: Requirement (under `site-content` or new `site-performance-budgets`) mandating `lighthouserc.json` (a) lists every marketing route plus a `/writing/[slug]`, (b) sets perf to `error` at `0.9`, (c) asserts CWV: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, INP ≤ 200 ms. Block `tasks.md §12.2` on the config edit.

### [High] No total font-payload budget for five WOFF2 families
`specs/style-system/spec.md:30-42`, `design.md:101-104`. Five families × multiple weights, even WOFF2 + Latin subsetting, commonly hits 250-400 KB. Spec gives only a CLS scenario.

Fix: Requirement "Font Payload Budget": total WOFF2 per route ≤ 180 KB; per-family ≤ 60 KB; verified by `scripts/measure-font-payload.mjs`. Non-display families (Fraunces, Instrument Serif) load only on routes using them.

### [High] LCP-critical preload face is unspecified
`design.md:103`. "Preload the LCP-critical display face" never names it. Hero h1 uses Space Grotesk; if Inter Tight is preloaded instead, LCP and CLS regress.

Fix: Scenario under "Self-hosted WOFF2 Fonts": exactly one `<link rel="preload" as="font" type="font/woff2" crossorigin>`, href matches the @font-face used by the LCP `<h1>` (Playwright asserts via `getComputedStyle(h1).fontFamily`).

### [High] No JSON-LD size ceiling on `/standards`
`specs/site-structured-data/spec.md:21-28`; 8 entries per `tasks.md §6.1`. `DefinedTermSet`×8 + Organization + WebSite inflates initial HTML 4-12 KB. No byte ceiling, no whitespace rule.

Fix: Requirement "JSON-LD Size Budget": aggregate ≤ 8 KB uncompressed; `JSON.stringify` without indent; `validate-structured-data.mjs` fails if exceeded. Cross-reference per-route HTML ≤ 60 KB gzip in `site-content`.

### [Medium] Shiki HTML weight per block unbounded
`specs/site-content/spec.md:47-54`. One `<span>` per token; 40-line snippet runs 8-15 KB, ×3 pillars on `/platform`.

Fix: Scenario under "Code Examples per Platform Pillar": each example ≤ 30 lines and ≤ 6 KB rendered HTML; build fails otherwise.

### [Medium] No JS-payload budget for islands
`specs/site-navigation/spec.md:31-43, 68-76`. `NavToggle` and `ThemeToggle` hydrate JS; only Lighthouse (at warn) catches bloat.

Fix: Requirement "Island JS Budget": per route ≤ 8 KB gzip; per-island ≤ 4 KB gzip; measured against `dist/_astro/`; forbid third-party deps in those islands.

### [Medium] Writing images lack format/size/lazy-load requirements
`specs/site-content/spec.md:81-93`. `design.md §4.12` mentions AVIF/WebP/intrinsic dims/`loading="lazy"`; the spec does not encode it. A 3 MB PNG `cover` would tank LCP on `/writing/[slug]`.

Fix: Requirement "Writing Image Pipeline": `astro:assets` `<Image>`/`<Picture>`; AVIF + WebP fallback; `loading="lazy"` below-fold; `decoding="async"`; intrinsic dims; per-source ≤ 300 KB; raw `<img>` with external/relative `src` fails build.

### [Medium] OG generation uncached and uncapped in spec
`specs/site-branding/spec.md:30-42`. `tasks.md:118` mentions caching; spec does not. Satori re-renders every build, linear with posts.

Fix: Scenario: per-slug OG cached on hash `(template-version, title, published, brand-colors-hash)`; per image ≤ 200 KB; generation ≤ 500 ms p95.

### [Medium] RSS body policy unspecified
`specs/site-content/spec.md:25-27`. Wiring `content: post.body` balloons `feed.xml` to MB.

Fix: Requirement "RSS Content Policy": `<description>` ≤ 500 chars; full body MUST NOT embed; `feed.xml` ≤ 256 KB.

### [Low] TrustChain animation lacks offscreen-pause
`design.md §3.5`, `tasks.md §8.3`. `prefers-reduced-motion` honored, but motion-OK users pay CPU offscreen.

Fix: Scenario in `site-mobile-layout`: pauses via IntersectionObserver when not intersecting; CSS-driven (no rAF); Playwright asserts via `Animation.getAnimations()`.

## Verdict

APPROVE-WITH-CHANGES — must-fix: 4 (Critical 1, High 3): (1) Lighthouse gate hardening + route coverage + CWV asserts; (2) font payload budget; (3) LCP-preload pin scenario; (4) JSON-LD size budget on `/standards`. Mediums/Low can defer to a follow-up `add-perf-budgets` change.
