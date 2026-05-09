# Tasks — add-brand-assets-and-writing-pipeline

> Each task lists files touched and the acceptance signal. Tasks within a phase MAY parallelize; phases MUST land in order.

## Phase 0 — Pre-flight

- [ ] 0.1 Build `scripts/verify-writing-prerequisites.mjs` first (was Phase 5.6 — moved here so Phase 0.2 can actually run). Script fails non-zero if `update-site-marketing-redesign` OR `adopt-design-md-format` is not archived (checks `openspec/changes/archive/*-<change-id>/` directory presence). Add a unit-test fixture proving the script exits 1 when only one prerequisite is archived. Acceptance: `bash -c 'rtk node scripts/verify-writing-prerequisites.mjs; echo $?'` reports a deterministic exit code given the current archive state.
- [ ] 0.2 Confirm both prerequisite changes are archived: `npm run verify:writing-prerequisites` exits 0.
- [ ] 0.3 `openspec validate add-brand-assets-and-writing-pipeline --strict` passes.
- [ ] 0.4 Confirm CODEOWNERS includes `src/data/brand-svgs.ts`, `public/assets/logos/`, `.github/workflows/content-redeploy.yml`, and `docs/writing-pipeline.md`. Acceptance: `grep -q '/src/data/brand-svgs.ts' .github/CODEOWNERS && grep -q 'content-redeploy.yml' .github/CODEOWNERS`.
- [ ] 0.5 Tag `pre-brand-assets` git tag once `update-site-marketing-redesign` and `adopt-design-md-format` are both archived (multi-phase rollback baseline analogous to the redesign's `pre-redesign` tag). MUST `git push origin pre-brand-assets` so fresh CI clones see the tag. Acceptance: `git ls-remote --tags origin pre-brand-assets` returns a non-empty result.
- [ ] 0.6 **Consolidate the three prerequisite-verification scripts.** Build `scripts/verify-openspec-prereqs.mjs` taking `--change <id>` as the single source of truth for openspec ordering. Replace the three near-duplicate scripts (`verify:prerequisites` from the redesign, `verify:design-prerequisites` from `adopt-design-md-format`, `verify:writing-prerequisites` from this change) with thin npm-script wrappers: `"verify:prerequisites": "node scripts/verify-openspec-prereqs.mjs --change update-site-marketing-redesign"` (etc.). Document the consolidation in `docs/openspec-ordering.md`. Acceptance: `node scripts/verify-openspec-prereqs.mjs --change add-brand-assets-and-writing-pipeline` exits 0 only when both prerequisite changes are archived; the three legacy script names continue to work as wrappers; `package.json` has only one source-of-truth implementation.

## Phase 1 — Capability scaffolding

- [ ] 1.1 Spec deltas live under `openspec/changes/add-brand-assets-and-writing-pipeline/specs/{site-content,site-branding,site-brand-gallery,site-writing-pipeline}/spec.md`.
- [ ] 1.2 Update `openspec/project.md` with the two new capabilities and the prerequisite ordering note.
- [ ] 1.3 Update `openspec/config.yaml` `context:` block with the writing-pipeline env-var contract and the `/brand` route addition.

## Phase 2 — Brand SVG source-of-truth

- [ ] 2.1 Create `src/data/brand-svgs.ts` exporting typed `SRC.glyph.{classic,tight,filled,monochrome,cropped,bold}`, `SRC.wordmark.{horizontal,stacked}`, `SRC.avatar.{twilight,paper,transparent}`, and `SRC.ogCard({theme: 'twilight'|'paper'})` factories — covering all 13 DESIGN.md §4.14 variants. Use the `javascript-typescript:typescript-advanced-types` patterns: `as const satisfies BrandSvgs` to preserve literal types while enforcing the interface contract. Each factory MUST validate inputs: `color: '^#[0-9a-fA-F]{3,8}$|^currentColor$'`; `size: positive integer ≤ 4096`. Factory output MUST NOT contain `<image href="...">`, `<image xlink:href="...">`, `<use href="http...">`, or `@import url(http...)`.
- [ ] 2.1a Add ast-grep rule `rules/security/no-external-href-in-svg.yaml`: rejects external `href`, `xlink:href`, `<image>` with HTTP URL, and `@import url(http...)` in `src/data/brand-svgs.ts`. Wire into `lint:sg:ci`.
- [ ] 2.2 Extract glyph path constants from `new-design/extracted/src/pages/brand-icons.html` `<script>` block (the `SRC.classic`, `SRC.tight`, `SRC.filled` JS objects); move verbatim into `brand-svgs.ts`.
- [ ] 2.3 Author `tests/fixtures/brand-glyph-snapshot.json` capturing the canonical viewBox/path constants per DESIGN.md §4.14.
- [ ] 2.4 Build `scripts/check-glyph-parity.mjs` (`npm run check:glyph-parity`): asserts `brand-svgs.ts` SVG output matches the snapshot. Wire into postbuild + PR CI.
- [ ] 2.5 Add ast-grep rule `rules/security/no-inline-glyph.yaml` covering FOUR surfaces (per security review F8): (a) inline `<svg ... viewBox="0 0 24 24"` in `.astro`/`.mdx`/`.html`, (b) CSS `background-image: url("data:image/svg+xml,...<svg viewBox='0 0 24 24'…")` in `.css` and Astro `<style>`, (c) `<Fragment is:raw>` with string-literal containing `<svg viewBox="0 0`, (d) other glyph viewBoxes (32×32, 1024×1024) used by wordmark/OG-card path data. Document the four surfaces in the rule's `note:`.
- [ ] 2.6 Add coordinated-update CI gate: when a PR diff contains `tests/fixtures/brand-glyph-snapshot.json` changes, the same diff MUST contain `DESIGN.md` changes; otherwise CI fails with "snapshot regenerated without DESIGN.md update." Implement as `scripts/check-snapshot-design-coordination.mjs` triggered by the GitHub Actions PR workflow.

## Phase 3 — Favicon and logo PNG generation

- [ ] 3.1 Build `scripts/generate-favicons.mjs` (sharp-based): emits `public/favicon.ico`, `public/favicon.svg`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/mask-icon.svg` from `brand-svgs.ts`. Sub-32px sizes (`favicon-16.png`, `favicon-32.png`) MUST consume `SRC.glyph.bold` (NOT classic) per DESIGN.md §4.14 sizing rule.
- [ ] 3.2 Build `scripts/generate-logo-pngs.mjs` (sharp-based): emits the 15 PNG outputs documented in `public/assets/logos/README.md`.
- [ ] 3.3 Add `npm run build:favicons` and `npm run build:logos` scripts. Wire both into a NEW `prebuild` npm script (`"prebuild": "npm run build:favicons && npm run build:logos"`) that runs BEFORE `astro build`. Do NOT wire to `postbuild` — `astro build` copies `public/` to `dist/` early in its pipeline, so postbuild generation produces a stale deployed artifact. The drift-detection CI step (3.5) runs separately as a CI-only check, not in `postbuild`. PNGs/icons are static and do not need SRI hashing (which is why they don't need to live in postbuild's SRI/CSP chain).
- [ ] 3.4 Run both generators once, commit the output PNGs + favicons.
- [ ] 3.5 Add CI step: `npm run build:favicons && npm run build:logos && git diff --exit-code public/assets/logos/ public/favicon.svg public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/mask-icon.svg`. Fails on drift between source and committed outputs.
- [ ] 3.6 The `site-branding` capability's `Deterministic Favicon Generation` requirement (added by this change) supersedes the redesign's hand-authored favicon task. Cite by capability + requirement name, not by task number — the redesign's `tasks.md` moves to archive once it lands and numeric phase references go stale.

## Phase 4 — Brand gallery route

- [ ] 4.1 Create `src/pages/brand.astro` rendering all 13 variants per DESIGN.md §4.14: 6 glyphs (classic, tight, filled, monochrome, cropped, bold), 2 wordmarks (horizontal, stacked), 3 avatars (twilight, paper, transparent), 2 OG cards (twilight, paper). Verify visual parity against `new-design/extracted/src/pages/brand-icons.html` reference via Playwright screenshot diff (Phase 4.5 task).
- [ ] 4.2 Create `src/components/BrandTile.astro` (single tile with label, glyph render, "Copy SVG" button as a small Astro island).
- [ ] 4.3 Add `/brand` to `NOINDEX_ROUTES` in `src/lib/indexation.ts` (the single-source list established by the redesign's `site-indexation` cap).
- [ ] 4.4 Add `/brand` to `lighthouserc.json` with a relaxed perf threshold (≥ 0.8 instead of ≥ 0.9), documented as an exception in a comment.
- [ ] 4.5 Playwright tests: (a) each tile in `/brand` has a "Copy SVG" button; clicking it writes a self-contained `<svg>` document to the clipboard; (b) the clipboard payload contains NO `<image href>`, `<use href="http">`, or external `@import` (matches the no-external-href-in-svg ast-grep rule); (c) visual parity against the `brand-icons.html` reference within tolerance.
- [ ] 4.6 Strengthen `site-branding` Inline-Wordmark Ban: apply ast-grep `no-inline-glyph` rule (built in 2.5).

## Phase 5 — Writing pipeline scripts

- [ ] 5.1 Build `scripts/fetch-content.mjs` using the SHA-pinned sequence (NOT `git clone --branch <SHA>`, which only accepts branch/tag names): `rm -rf .cache/content-repo && git clone --no-checkout --depth 1 --filter=blob:none --sparse --no-tags <url> .cache/content-repo && git -C .cache/content-repo sparse-checkout set "$WRITING_REMOTE_PATH" && git -C .cache/content-repo fetch --depth 1 origin "$WRITING_REMOTE_REF" && git -C .cache/content-repo checkout FETCH_HEAD`. When `WRITING_REMOTE_REF` matches `^refs/(heads|tags)/`, the script MAY use `git clone --branch` directly. Always `rm -rf` before clone (embargoed-content guard). Acceptance: a unit-test fixture clones a known SHA and confirms the working tree contains exactly the `posts/` subtree at that commit.
- [ ] 5.2 Add `npm run fetch:content` script. No-op (exit 0) if `WRITING_REMOTE_REPO=""` (graceful disable). Add `predev` lifecycle hook in `package.json` that calls `npm run fetch:content` so local-dev parity with CI is automatic.
- [ ] 5.3 Add `.cache/content-repo/` to `.gitignore`. Pre-commit hook MUST block accidental `git add` of the directory (using lint-staged or `.husky/pre-commit`).
- [ ] 5.4 Augment `src/content/config.ts`: extend the `pages/writing` collection with a second glob loader pointing at `.cache/content-repo/posts/**/*.{md,mdx}`, ALONGSIDE the existing local glob. Both feed the same Zod schema. Detect duplicate ids across the two sources and fail the build.
- [ ] 5.5 Extend the writing Zod schema (per `site-content` MODIFIED requirement): `repo: z.enum(['artagon/content']).optional()`, `path: z.string().regex(/^posts\/[A-Za-z0-9._/-]{1,200}$/).optional()`, `commit: z.string().regex(/^[a-f0-9]{40}$/).optional()`, `cover: z.string().regex(/^(\.\/assets\/|posts\/assets\/)[A-Za-z0-9._/-]+\.(png|jpg|jpeg|webp|avif|svg)$/).optional()`. Future-dated posts (`published > buildDate`) excluded from `getCollection` returns; the build does not fail.
- [ ] 5.6 Install + configure remark/rehype MDX-allowlist plugin enforcing `['StandardChip', 'StandardsRow', 'TrustChain', 'Diagram', 'Callout']`. Wire into `astro.config.ts` `markdown.remarkPlugins` (file renamed from `astro.config.mjs` mid-USMR per pt342 archaeology). Acceptance: a fixture MDX with `<UntrustedThirdPartyWidget>` MUST cause `astro build` to exit non-zero before rendering. Astro's built-in `components` config does NOT enforce — verified by sub-agent review.

## Phase 6 — Writing widget extension (all 6 placements)

- [ ] 6.1 Update `src/components/WritingWidget.astro` (and ALL 6 redesign placements `h1`, `a`, `b`, `c`, `d`, `off`) to detect remote-sourced posts via `entry.data.repo !== undefined`. Render a "View source on GitHub" link (NOT "Edit on GitHub" — fork-and-PR clarity) pointing at `https://github.com/${entry.data.repo}/blob/${entry.data.commit}/${entry.data.path}` for remote posts. Placement `off` hides the widget regardless of source.
- [ ] 6.2 Local posts continue rendering without the source link (no behavior change to the redesign's contract).
- [ ] 6.3 Playwright tests: (a) home route shows the latest non-draft post regardless of source; (b) remote posts show "View source on GitHub" link in every active placement; (c) local posts do not; (d) clicking the link in a fresh browser opens GitHub's blob view at the pinned SHA; (e) zero-post case (both local and remote empty) hides the widget without error.

## Phase 7 — Webhook flow (hardened)

- [ ] 7.1 Create `.github/workflows/content-redeploy.yml`. Trigger: `on: repository_dispatch: types: [pull-request-merged]` (only). MUST set `concurrency: { group: 'pages', cancel-in-progress: true }` to match `deploy.yml`. Steps in order: (a) validate `client_payload.sha` against `^[a-f0-9]{40}$` (reject before clone if malformed); (b) HARDCODE `WRITING_REMOTE_REPO=artagon/content` (IGNORE `client_payload.repo`); (c) verify `sha` exists upstream via `git ls-remote https://github.com/artagon/content "$sha"` (reject if absent); (d) optionally validate `client_payload.ref` against `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` and pass via `--` boundary if used; (e) export `WRITING_REMOTE_REF=$sha`; (f) run `npm run fetch:content && npm run build`; (g) deploy via existing GitHub Pages action; (h) post status check back to content-repo PR via `gh api repos/artagon/content/statuses/$sha`.
- [ ] 7.2 Document the `client_payload` schema in `docs/writing-pipeline.md`: `{ sha: string (40-hex), ref: string?  }`. Document the workflow's hardcoded repo and source-ignored payload fields. Acceptance: doc contains all four validation rules.
- [ ] 7.3 Configure GitHub secret `CONTENT_DISPATCH_TOKEN` (fine-grained PAT, `Contents: Read+Write` on `artagon/artagon-site`, ≤90-day expiry). NOT committed. Document rotation runbook in `docs/writing-pipeline.md`: rotate every ≤90 days; on suspected leak, revoke + remove `content-redeploy.yml` within 1h, audit dispatch history.
- [ ] 7.4 Document the dispatching workflow template for `artagon/content` authors in `docs/writing-pipeline.md` with copy-paste YAML.
- [ ] 7.5 Add E2E latency test: a Playwright job triggered by a manual `workflow_dispatch` measures merge-to-visible time against the P95 ≤ 10-minute requirement (synthesized via mock-dispatch in CI). Failure surfaces in workflow log + tracking issue.
- [ ] 7.6 Each deployed page MUST include `<meta name="artagon:build-sha" content="${WRITING_REMOTE_REF}">` in the head. Add a Playwright assertion against any built marketing route's HTML.

## Phase 8 — Documentation

- [ ] 8.1 Author `docs/writing-pipeline.md` with REQUIRED sections: (a) env-var contract (`WRITING_REMOTE_REPO`, `WRITING_REMOTE_REF`, `WRITING_REMOTE_PATH`); (b) frontmatter contract for remote posts (`repo` allowlist, 40-hex `commit`, `cover` regex); (c) dispatch payload schema + ignored fields; (d) dispatching workflow YAML template for `artagon/content` authors; (e) fallback behavior when `WRITING_REMOTE_REPO=""`; (f) MDX component allowlist (`['StandardChip', 'StandardsRow', 'TrustChain', 'Diagram', 'Callout']`); (g) Mermaid + D2 + SVG diagram support uniformly for local AND remote posts; (h) PAT rotation runbook (≤90 days, leak procedure within 1h); (i) latency expectations (P95 ≤ 10 min); (j) "View source on GitHub" link semantics (read-only at pinned SHA; fork-and-PR for edits).
- [ ] 8.1a Copy `new-design/extracted/public/assets/logos/README.md` verbatim to `public/assets/logos/README.md` (preserve as the canonical 15-PNG contract authority); add a one-line cross-reference to `docs/brand-assets.md`.
- [ ] 8.2 Author `docs/brand-assets.md`: how `brand-svgs.ts` is the single source; how to regenerate PNGs/favicons; what `check:glyph-parity` enforces; the relationship to DESIGN.md §4.14.
- [ ] 8.3 Update `README.md` with links to both docs and a one-line "Editorial workflow" section pointing at `docs/writing-pipeline.md`.

## Phase 9 — Quality gates

- [ ] 9.1 `openspec validate --strict` passes.
- [ ] 9.2 `npm run check:glyph-parity` exits 0.
- [ ] 9.3 `npm run build:favicons && npm run build:logos && git diff --exit-code` exits 0.
- [ ] 9.4 `npm run lint:sg:ci` passes — `no-inline-glyph` violations are zero on existing sources.
- [ ] 9.5 Playwright: `/brand` route renders, copy-SVG buttons work, route is `noindex`.
- [ ] 9.6 Playwright: home Writing widget shows latest post; remote posts show "View source on GitHub" link (commit-pinned 40-hex SHA); local posts do not.
- [ ] 9.7 Playwright: build with `WRITING_REMOTE_REPO=""` succeeds and only renders local posts.
- [ ] 9.8 Lighthouse CI passes for `/brand` at perf ≥ 0.8 (relaxed) and for all other routes at the redesign's thresholds.
- [ ] 9.9 ast-grep, SRI/CSP postbuild, link checking, Lighthouse all pass on the merged build.

## Phase 10 — Archive

- [ ] 10.1 `openspec archive add-brand-assets-and-writing-pipeline --yes` after deploy verification.
- [ ] 10.2 `openspec/specs/site-brand-gallery/spec.md` Purpose line replaced (no longer "TBD").
- [ ] 10.3 `openspec/specs/site-writing-pipeline/spec.md` Purpose line replaced.
- [ ] 10.4 `openspec/specs/site-content/spec.md` Purpose line rewritten to cover BOTH local AND remote authoring (resolves the long-standing TBD).
- [ ] 10.5 Verify `site-content/spec.md` `Per-route Frontmatter Contract` requirement is the merged form (this change's MODIFIED text replaced the redesign's ADDED text in place — no duplicate-purpose blocks). Concrete check: `rtk rg -c '^### Requirement: Per-route Frontmatter Contract' openspec/specs/site-content/spec.md` returns exactly `1`. The redesign's ADDED text and this change's MODIFIED text use byte-identical headers (verified during cross-cutting review), so a clean merge produces exactly one block; ≥ 2 means the archive composition duplicated the requirement and needs manual reconciliation.
- [ ] 10.6 Verify `site-branding/spec.md` reflects the new ADDED requirements (inline-glyph ban, no-external-href, glyph parity with coordinated-update gate, static OG default).
- [ ] 10.7 File a follow-up `cleanup-new-design-extracted` change scaffold to delete `new-design/extracted/` after this change archives (the inventory in `proposal.md` Appendix is the audit trail).

## Parallelism notes

- Phase 2 (brand-svgs.ts) gates Phases 3, 4, and 6.
- Phases 5 and 6 can start in parallel after Phase 1.
- Phase 7 depends on Phase 5 (the workflow needs `fetch-content.mjs`).
- Phase 8 (docs) can start any time after Phase 1.

## Rollback (ordered)

1. Disable `WRITING_REMOTE_REPO` env in CI (immediate fallback to local-only; no code revert).
2. Remove `.github/workflows/content-redeploy.yml`.
3. Revert `src/content/config.ts` augmentation; revert writing widget remote-detection branch.
4. Revert `/brand` route, `BrandTile.astro`, generators, generated PNGs/favicons, `brand-svgs.ts`, ast-grep rule.
5. Revert spec deltas.
