# Round-2 Amendment Verification — `update-site-marketing-redesign`

**Validator:** `openspec validate update-site-marketing-redesign --strict` → **green** (`Change ... is valid`).
**Frontend review file:** not present under `reviews/` (only 5 dimensions + CONSOLIDATED).
**Files amended:** `proposal.md`, all 9 spec deltas. **NOT amended:** `design.md`, `tasks.md`.

## Must-Fix Verification (14 items)

| ID | Original Fix (1 line) | Landed at | Status |
|----|-----------------------|-----------|--------|
| C1 | Lighthouse perf gate at `error ≥ 0.9` + CWV thresholds, all marketing routes | `proposal.md:54` (risk + mitigation prose) and `proposal.md:62` (Impact list); **not** a Requirement under `style-system/spec.md`; `tasks.md:126` still reads `perf ≥ 90` only | PARTIAL ⚠ |
| H1 | JSON-LD `</script>` escape + validator substring assertion | `site-structured-data/spec.md:46-57` "JSON-LD Safety and Script-Tag Escape" requirement + crafted-MDX scenario | ADDRESSED ✓ |
| H2 | CSP build-fail when inline-script SHA-256 drifts; forbid `unsafe-inline` | `site-navigation/spec.md:92-104` "CSP Inline-Script Hash Drift Gate" + 2 scenarios | ADDRESSED ✓ |
| H3 | TrustChainTooltip `role=dialog`, Esc, redundant info button, reduced-motion opacity-only | `site-mobile-layout/spec.md:55-72` "TrustChainTooltip Accessibility" + 3 scenarios | ADDRESSED ✓ |
| H4 | Skip-link activation moves focus into `<main>` (WCAG 2.4.1) | `site-navigation/spec.md:17-34` "Skip Link is First Focusable Element with Focus Move" + activation scenario | ADDRESSED ✓ |
| H5 | StandardChip caption on `:focus-visible`; default-visible on `(hover: none)` | `site-standards-registry/spec.md:17-34` (StandardChip Primitive amended) + "Keyboard-only desktop user reaches caption" scenario | ADDRESSED ✓ |
| H6 | Fold breakpoint/no-scale into style-system OR add `BaseLayout` slot ABI | Slot-ABI mitigation only in `proposal.md:55` risk text; **no** `style-system` requirement absorbing breakpoints (`site-mobile-layout/spec.md:12` still owns `--bp-sm/-md/-lg`); **no** site-navigation requirement codifying `<JsonLd/>`, `<Indexation/>`, `<Branding/>` slots | PARTIAL ⚠ |
| H7 | `npm run verify:prerequisites` script gates merge order | `proposal.md:45` mitigation prose + `proposal.md:78` lists `scripts/verify-prerequisites.mjs`; **not** in any spec requirement; `tasks.md:7` still hand-waved checkbox | PARTIAL ⚠ |
| H8 | Total font-payload budget ≤ 180 KB / family ≤ 60 KB enforced by script | `style-system/spec.md:49-61` "Font Payload Budget" + 2 scenarios | ADDRESSED ✓ |
| H9 | Preload exactly one face matching the LCP `<h1>`, Playwright-pinned | `style-system/spec.md:44-47` "LCP-critical face is preloaded by name" scenario added under Self-hosted WOFF2 Fonts | ADDRESSED ✓ |
| H10 | `/bridge` 301 → `/platform` (no fragment); home CTA keeps `#bridge` | `site-bridge-story/spec.md:36-43` "Hero CTA on Home" (keeps `#bridge`) + `:45-57` "Legacy /bridge Redirect (no fragment)" with bare-path Location assertion | ADDRESSED ✓ |
| H11 | Remove WebSite `potentialAction` SearchAction | `site-structured-data/spec.md:5` ("MUST NOT include `potentialAction`...") + `:12-15` "WebSite has no SearchAction" scenario | ADDRESSED ✓ |
| H12 | Article `publisher` required; `image` flagged for Top Stories | `site-structured-data/spec.md:19` requires publisher with logo; `:26-29` "Publisher is present and resolved" scenario; `:31-34` non-fatal warning on missing cover | ADDRESSED ✓ |
| H13 | `lastmod` from MDX `updated`/`published` via `serialize` hook, not mtime | `site-indexation/spec.md:14` ("CI file mtime is forbidden...") + `:26-29` and `:31-34` parity scenarios | ADDRESSED ✓ |

**Score:** 10 ADDRESSED ✓ / 4 PARTIAL ⚠ / 0 MISSING ✗ / 0 REGRESSION.

## Regressions and Untouched Files

| Concern | Finding |
|---------|---------|
| Bridge fragment fan-out (CTA must keep `#bridge`, redirect must drop it) | Both intents preserved at `site-bridge-story/spec.md:36` (CTA keeps `/platform#bridge`) and `:45,52` (Location is `/platform`, NOT `/platform#bridge`). No find-and-replace regression. |
| Solid Card Variant detail loss | `style-system/spec.md:144-151` keeps the original `Solid Card Variant` MODIFIED entry intact; new variants split into ADDED `Card Variant Set` (`:72-84`). Clean. |
| Phase 4 cross-change tasks | `tasks.md` Phase 4 (4.1-4.7) is the in-change content-collections phase, unrelated to cross-change refactor. No deletion. |
| `design.md` not amended | Decisions #1, #5, #10, #13 in design.md still describe the *old* state: Decision #5 makes no mention of slot-ABI; Decision #10 says "Preload only the LCP-critical display face" without naming Space Grotesk; Decision #13 still claims `JSON.stringify` + Astro safe interpolation suffices (no `</script>` escape note). Prose is now drifted from the amended specs. |
| `tasks.md` not amended | No tasks for: `verify:prerequisites` (H7), `lighthouserc.json` perf=error and CWV thresholds (C1), `measure-font-payload.mjs` (H8), font-payload route enumeration, JSON-LD `</script>` escape test (H1), Article publisher build-warning (H12), sitemap `serialize` hook (H13), CSP orphan-hash gate (H2), TrustChainTooltip a11y test (H3). Task 12.2 still reads `perf ≥ 90` (warn-equivalent), task 10.1 just says "filter and lastmod source" without forbidding mtime. New requirements have no acceptance signals. |
| BaseLayout slot ABI (H6) | Mentioned in proposal risk only; no requirement in `site-navigation` defining `<JsonLd/>`, `<Indexation/>`, `<Branding/>` slot contract. Architectural decision unenforced. |
| C1 placement | Lives only as proposal-prose risk + impact bullet, not as a `style-system` (or new `site-performance-budgets`) requirement with scenarios. A reader who skips proposal risks loses the gate; `lighthouserc.json` edits are not tied to a spec scenario. |

## Verdict

**AMENDMENTS-PARTIAL** — 4 must-fix items remain (C1, H6, H7 needed spec-level requirements; design.md/tasks.md drift untouched). All 10 high-impact spec deltas (H1-H5, H8-H13) are correctly encoded; no regressions detected. Recommend a follow-up amendment that (a) adds a `Lighthouse CI Performance Gate` requirement under `style-system` with route enumeration + CWV scenarios, (b) adds a `BaseLayout Slot ABI` requirement under `site-navigation`, (c) adds a `Prerequisite Verification` requirement (in proposal-supporting cap or `site-content`), and (d) syncs `tasks.md` acceptance signals + `design.md` decisions #5, #10, #13 to the amended specs.

