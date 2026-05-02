# Adversarial Domain-Completeness Review — `add-brand-assets-and-writing-pipeline`

Dimension: DOMAIN COMPLETENESS only. Hunting gaps against the user's stated intent: (A) icons + ALL artifacts adopted, (B) GitHub markdown writing pipeline rendered on PR-merge-to-main.

## Findings

### F1 — DESIGN.md §4.14 variant coverage incomplete (HIGH)

Citations: `specs/site-brand-gallery/spec.md:10`; DESIGN.md §4.14 lines 423–435.
DESIGN.md enumerates 13 distinct variants (Avatar twilight/paper/transparent, Favicon 16/32 bold, Favicon 48 classic, Apple-touch 180, OG twilight, OG paper, Monochrome, Wordmark horizontal, Wordmark stacked, Cropped, Filled). The gallery requirement only mandates 8 (`glyph-classic, glyph-tight, glyph-filled, glyph-monochrome, glyph-cropped, wordmark-horizontal, wordmark-stacked, og-card`). Missing: **avatar-twilight**, **avatar-paper**, **avatar-transparent**, **favicon-bold**, **apple-touch**, **og-paper**. The user said "make sure ALL artifacts are getting adopted" — six fall through.
**Remediation:** Edit `specs/site-brand-gallery/spec.md` Scenario "All variants present" to list all 13 variants from DESIGN.md §4.14, OR explicitly justify each omission in `design.md`. Update tasks 4.1 + 2.1 (the `BrandSvgs` interface lists only 5 glyphs + 2 wordmarks; missing `avatar-*` and `og-paper`).

### F2 — `brand-svgs.ts` interface omits avatar/OG-paper/favicon-bold variants (HIGH)

Citations: `design.md:42-48` (the `GlyphVariant` union).
The TypeScript type `GlyphVariant = "classic" | "tight" | "filled" | "monochrome" | "cropped"` excludes the **bold** favicon variant DESIGN.md §4.14 calls "load-bearing" for ≤32px (where the outer ring vanishes from anti-aliasing). Without `bold`, `scripts/generate-favicons.mjs` cannot honor the §4.14 sizing rule. Same gap for `avatar.{twilight,paper,transparent}` (composite tiles, not raw glyphs) and `ogCard` `theme: "paper"` (only `twilight`/`midnight` typed; `paper` missing).
**Remediation:** Extend `GlyphVariant` to include `bold`; add `Avatar` factory taking `{glyph, background, size}`; add `paper` to `ogCard` theme union. Add a Phase 2.1a sub-task.

### F3 — Tweaks panel (DESIGN.md §4.10) entirely uncovered (MEDIUM)

Citations: `proposal.md:48-58` (Out of Scope omits Tweaks).
DESIGN.md §4.10 specifies a hidden design-QA Tweaks panel that toggles theme/accent/font/density/grid/writing-widget-placement. The base redesign change must own this, but neither change explicitly claims it. Result: Tweaks falls between two changes — the user said "all artifacts adopted" and §4.10 is an artifact.
**Remediation:** Either (a) add explicit "Out of Scope: Tweaks panel — owned by `update-site-marketing-redesign`" with a citation to that change's task ID, or (b) verify that change covers it and note in proposal cross-reference. Confidence: this is a coordination gap, not necessarily a deliverable gap.

### F4 — Source `brand-icons.html` itself: adopted or discarded? (MEDIUM)

Citations: `proposal.md:15` (extracts constants only).
The proposal extracts `SRC.classic/tight/filled` constants and `wmHorizontal`/`wmStack` builders from `brand-icons.html` into `brand-svgs.ts`. But the gallery HTML's _layout, copy-button JS, sectioning, and category labels_ are also artifacts. The new `/brand` route is described as recreating the gallery, but no requirement says it MUST be visually faithful to `brand-icons.html`. Future drift between the two galleries goes undetected.
**Remediation:** Add task 4.1a: "Visual parity smoke test against `new-design/extracted/src/pages/brand-icons.html` reference screenshot," OR explicitly state the HTML mock is discarded after extraction.

### F5 — OG card pipeline duplication risk (HIGH)

Citations: `proposal.md:38` (`og-image.png` static); redesign `site-branding` (per-slug satori OG generation).
The redesign's `site-branding` capability generates per-slug OG images via satori at build time. This change adds `scripts/generate-logo-pngs.mjs` that emits a single static `og-image.png` (1200×630). These are two pipelines for OG: a per-page dynamic one and a default static one. Spec is silent on how they interact: does the satori pipeline use the static `og-image.png` as fallback? Does `og-image.png` become the default for routes without a per-slug override?
**Remediation:** Add a sentence to `site-branding` delta: "The static `og-image.png` from `scripts/generate-logo-pngs.mjs` serves as the site-wide default OG image; per-slug satori-generated images override it on routes that opt in." Or state they're mutually exclusive and pick one.

### F6 — Diagrams in remote MDX explicitly excluded (CRITICAL)

Citations: `proposal.md:56` ("Remote-source diagrams" out of scope); DESIGN.md §4.12 lines 510–520.
DESIGN.md §4.12 mandates Mermaid + D2 + SVG diagrams for the long-form reader. This change ships the writing pipeline but excludes "remote-source diagrams" — meaning a contributor at `artagon/content` who writes a post with ` ```mermaid ` will either fail the build (no Mermaid compiler runs on remote MDX) or silently render the fenced block as code. The user's "render in widget" promise breaks for any post containing a diagram. Critical because §4.12 explicitly names this as the long-form reader's load-bearing capability.
**Remediation:** Either (a) lift the exclusion — make Mermaid/D2 work for both local and remote (the same `astro:mdx` pipeline already processes remote MDX, so this is mostly free), or (b) add a Zod validation rule that rejects remote posts containing fenced `mermaid`/`d2` blocks with a precise error pointing at `docs/writing-pipeline.md`, AND surface this restriction prominently in `docs/writing-pipeline.md`. As-written, the pipeline silently degrades.

### F7 — End-to-end PR-merge → visible-deploy contract not specified (HIGH)

Citations: `specs/site-writing-pipeline/spec.md:36-53`.
The spec defines individual steps (dispatch validation, clone, build) but no end-to-end requirement: latency target, visible signal of success, or failure-recovery. User said "when PR is merged to main and deployed." A contributor who merges has no way to know "is it live yet?" — no status check, no deploy URL surfaced back to the content repo, no visible build-id on the rendered page. The spec gives steps; it doesn't promise the outcome.
**Remediation:** Add a Requirement "End-to-End Merge-to-Visible Latency": "From PR-merge in `artagon/content` to live `/writing/[slug]` page MUST complete within 10 minutes (P95)" + a Scenario asserting the deployed page footer contains a `<meta name="artagon:build-sha">` matching `WRITING_REMOTE_REF`. Plus a status-check posted back to the content-repo PR comment.

### F8 — Local dev parity with CI undefined (MEDIUM)

Citations: `proposal.md:25` ("run `npm run fetch:content` locally"); tasks Phase 5.
Spec says local dev runs `npm run fetch:content` to populate `.cache/`, but doesn't enforce parity. A site contributor on a branch never running fetch sees a different site than CI. Bug class: WYSIWIG drift. There's no `dev:full` or `predev` hook calling fetch.
**Remediation:** Add task 5.4a: wire `predev` lifecycle hook in `package.json` to call `npm run fetch:content` (no-op when env empty). Add Scenario: "WHEN a developer runs `npm run dev` with `WRITING_REMOTE_REPO` set, THEN remote posts appear in dev-server output."

### F9 — Bootstrapping/empty-state not addressed (MEDIUM)

Citations: `specs/site-writing-pipeline/spec.md:78-85` (graceful fallback covers empty REPO, not empty posts).
On day-1, `artagon/content` may have zero posts. The Graceful Local-Only Fallback requirement covers `WRITING_REMOTE_REPO=""` but not `repo-exists-but-zero-posts`. If both local AND remote are empty, the home Writing widget hides per §4.11 — but does the build succeed? Does `/writing` index render an empty state, 404, or build-error?
**Remediation:** Extend Scenario "Empty env produces working build" with a parallel "Zero-post case": when both local and remote yield zero entries, `/writing` renders an empty-state page (not 404), the home widget hides, and `feed.xml` emits an empty-but-valid feed.

### F10 — "Edit on GitHub" UX flow undefined (LOW)

Citations: `specs/site-writing-pipeline/spec.md:55-67`.
Spec correctly pins `https://github.com/${repo}/blob/${commit}/${path}` for stability. But that URL displays the file at a specific commit (read-only) — clicking GitHub's "Edit" pencil from a non-branch SHA spawns a fork-and-PR flow. User-facing wording "Edit on GitHub" is misleading; the user lands in fork-territory, not branch-edit-territory. Acceptable but undocumented.
**Remediation:** Either rename to "View source on GitHub" + add separate "Suggest edit" link pinned to `main` HEAD of the same path, or document the fork flow in `docs/writing-pipeline.md`.

### F11 — Future-dated / scheduled posts not handled (MEDIUM)

Citations: `specs/site-content/spec.md:1-21` (no `published <= today` enforcement).
Redesign schema has `published`. Spec doesn't say whether future-dated posts are: (a) skipped at build, (b) rendered immediately, or (c) build-fail. Common case: contributor merges post on Monday with `published: Friday`; current spec implies it goes live Monday. This breaks editorial scheduling.
**Remediation:** Add Requirement to `site-content` delta: "Posts with `published > buildDate` MUST be excluded from collections (returned by `getCollection`) but MUST NOT fail the build." Or explicitly state "future-dated posts publish immediately on merge — scheduling is out of scope."

### F12 — Tag filtering and RSS-remote behavior unspecified (LOW)

Citations: redesign `site-content/spec.md:24-27` (RSS); this change silent on remote-RSS.
Redesign emits `/writing/feed.xml`. This change doesn't say whether remote posts appear in the feed. They almost certainly should. Also: tag-based filtering on home widget / `/writing` index is not addressed; remote posts will have `tags[]`.
**Remediation:** Add Scenario to `site-writing-pipeline`: "Remote posts MUST appear in `/writing/feed.xml` indistinguishable from local posts (only `<link>` differs)." Tag filtering can defer; surface as known-gap.

### F13 — Writing widget extends only one of 6 placements (MEDIUM)

Citations: `proposal.md:28` (`home-hero-strip-with-fetch-meta`); DESIGN.md §4.11 lines 360–367 (placements `h1/a/b/c/d/off`).
DESIGN.md §4.11 has 6 placements; this change adds remote-source meta to one (`h1` strip). Placements `a`, `b`, `c`, `d` (featured rail, 3-up cards, editorial split, dated ticker) are silent. If a marketing page later switches to placement `b`, does it show "Edit on GitHub"? Spec doesn't say.
**Remediation:** Generalize the requirement: "All Writing widget placements (`h1`, `a`, `b`, `c`, `d`) MUST detect remote-source posts and render the source-repo link uniformly. Placement `off` hides the widget regardless of source."

### F14 — `public/assets/logos/README.md` (the contract) — does it move? (LOW)

Citations: `proposal.md:38`.
The README at `new-design/extracted/public/assets/logos/README.md` is the 15-PNG contract. The change generates the PNGs but doesn't say whether the README itself is preserved (as the contract authority) at `public/assets/logos/README.md` or replaced by `docs/brand-assets.md`. Two paths to one contract is drift-bait.
**Remediation:** Add task 8.2a: "Copy `new-design/extracted/public/assets/logos/README.md` to `public/assets/logos/README.md` verbatim, then add a one-line cross-reference to `docs/brand-assets.md`." Or remove the README and have `docs/brand-assets.md` be authoritative — pick one.

### F15 — "All artifacts adopted" not enumerated explicitly (HIGH)

Citations: `proposal.md:11-29` (lists "Brand artifacts" + "Writing pipeline" but doesn't enumerate every new-design artifact).
The user said "make sure ALL artifacts are getting adopted." Proposal lists what IS in scope but never inventories `new-design/extracted/` against the change. Items potentially missed (verified by directory listing): `new-design/extracted/src/data/roadmap.ts` (typed roadmap data — does redesign cover it?), `new-design/extracted/scripts/` (build scripts), `new-design/extracted/explorations/` and `migration/` directories. None are addressed.
**Remediation:** Add an Appendix to `proposal.md`: "Inventory of `new-design/extracted/`" with each top-level item marked Adopted-In-This-Change, Adopted-In-Redesign, or Not-Applicable. Use it as the audit trail for "all artifacts."

---

## Verdict

**APPROVE-WITH-CHANGES** — Must-fix count: **5** (F1, F2, F5, F6, F7). High-value optional fixes: F3, F4, F13, F15. Pipeline architecture is sound; gaps are in completeness of artifact enumeration (icons F1/F2/F15) and end-to-end pipeline guarantees (F5/F6/F7). F6 in particular breaks a load-bearing DESIGN.md §4.12 promise and should not ship as-stated.
