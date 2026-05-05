## Context

This change sequences AFTER `update-site-marketing-redesign` (the redesign establishes `site-content`, `site-branding`, the `/writing/[slug]` route, and the home Writing widget) and AFTER `adopt-design-md-format` (DESIGN.md §4.14 is the canonical brand-icon contract).

The redesign change deferred two scopes:

1. The brand-icon system documented in DESIGN.md §4.14 (7+ glyph variants, wordmark, favicon, OG cards). It currently lives inlined in `new-design/extracted/src/pages/brand-icons.html` as raw JS string constants.
2. A GitHub-sourced writing pipeline. DESIGN.md §4.12 calls for "GitHub-sourced writing & docs" with build-time fetch from a content repo; the redesign shipped only the local `src/content/pages/writing/*.mdx` form.

Both gaps are now in scope.

## Goals / Non-Goals

### Goals

- Move brand-icon SVG sources to a typed TypeScript module (`src/data/brand-svgs.ts`) and ban inline glyph paths everywhere else.
- Add a `/brand` gallery route with copy-SVG buttons (a tooling/reference surface, not marketing).
- Generate favicons + logo PNGs deterministically from the same source via sharp; commit outputs.
- Add an opt-in build-time pipeline that fetches Markdown posts from `artagon/content` and renders them in `/writing/[slug]` and the home Writing widget.
- Wire a `repository_dispatch` GitHub Action that lets PR-merges in `artagon/content` trigger a site redeploy.
- Preserve the redesign's local-only writing path as the default; remote is opt-in via env vars.

### Non-Goals

- No CMS or in-browser authoring.
- No client-side fetching — site stays static.
- No multi-repo content aggregation.
- No real-time updates beyond redeploy-on-merge.
- No re-architecting of `site-content`'s existing schema; only additive fields.

## Decisions

### 1. SVG source-of-truth: `src/data/brand-svgs.ts`, never inlined

Glyph paths and wordmark builders move from `brand-icons.html`'s inline `<script>` block to a typed TS module. Astro components (`Nav.astro`, `Footer.astro`, `BrandTile.astro`) import from this module. ast-grep rule `no-inline-glyph` rejects raw `<svg ... viewBox="0 0 24 24"` paths anywhere outside the module and `/brand`'s gallery template.

Tradeoff: A second source of truth in TS instead of just DESIGN.md prose. Mitigated by `check:glyph-parity` script that diffs the TS module against the DESIGN.md §4.14 path constants.

The TS module uses the `javascript-typescript:typescript-advanced-types` patterns:

```typescript
type GlyphVariant =
  | "classic"
  | "tight"
  | "filled"
  | "monochrome"
  | "cropped"
  | "bold";
type WordmarkVariant = "horizontal" | "stacked";
type AvatarVariant = "twilight" | "paper" | "transparent";
type OgCardTheme = "twilight" | "paper";
type SvgFactory<V extends string> = (size: number, color: string) => string;

interface BrandSvgs {
  glyph: { [K in GlyphVariant]: SvgFactory<K> };
  wordmark: { [K in WordmarkVariant]: SvgFactory<K> };
  avatar: { [K in AvatarVariant]: (size: number) => string };
  ogCard: (opts: { headline: string; theme: OgCardTheme }) => string;
}

export const SRC: BrandSvgs = {
  /* ... */
} as const satisfies BrandSvgs;
```

All 13 variants per DESIGN.md §4.14 covered: 6 glyphs (incl. `bold` for ≤32 px favicons), 2 wordmarks, 3 avatars, 2 OG cards.

The `as const satisfies` pattern preserves literal types while enforcing the interface — exact what the redesign's typed registry pattern uses for `STANDARDS`.

### 2. PNG generation is committed, not gitignored

Generated PNGs (logo-mark-{32..512}, logo-square-{512,1200}, logo-wordmark-{200,400,800}, logo-full-{400,800,1200}, logo-horizontal-800, og-image) are committed to `public/assets/logos/`. CI runs `npm run build:logos` and `git diff --exit-code public/assets/logos/` — divergence fails the build.

This matches `adopt-design-md-format`'s decision to commit `openspec/.cache/design-md-spec.md`. Same rationale: deterministic outputs are auditable, fresh worktrees see the assets, regeneration is a deliberate reviewed event.

Tradeoff: ~5–10 MB of binary PNGs in git history. Acceptable for a 15-asset set with low churn (regen only when SVG sources change, which is rare).

### 3. Favicons generated from same source

`scripts/generate-favicons.mjs` produces `favicon.ico` (multi-size), `favicon.svg` (uses `currentColor` so it themes naturally), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `mask-icon.svg`. The `site-branding` capability's `Deterministic Favicon Generation` requirement (added by this change) supersedes the redesign's hand-authored favicon task; cite by capability + requirement name, not by the redesign's task number — once the redesign archives, numeric phase references go stale but capability requirements remain canonical.

### 4. `/brand` route is `noindex` and exempted from default Lighthouse perf budget

The brand gallery is a tooling page, not marketing content. It ships ~30 KB of inline SVG and a small copy-button JS island. `lighthouserc.json` lists `/brand` with a relaxed perf threshold (≥ 0.8 instead of ≥ 0.9). The route emits `<meta name="robots" content="noindex">` and is added to `NOINDEX_ROUTES` in `src/lib/indexation.ts` (single-source list from the redesign's `site-indexation` cap).

### 5. Writing pipeline: build-time only, opt-in via env vars

```
WRITING_REMOTE_REPO  default: "" (empty until artagon/content exists publicly; flip to artagon/content in a separate PR after upstream creation)
WRITING_REMOTE_REF   no default (CI must supply the merge SHA on dispatch; local dev may set refs/heads/main)
WRITING_REMOTE_PATH  default: posts/
```

`scripts/fetch-content.mjs` uses the SHA-pinned sequence (`git clone --branch <SHA>` is INVALID — `--branch` accepts only branch and tag names):

```sh
rm -rf .cache/content-repo
git clone --no-checkout --depth 1 --filter=blob:none --sparse --no-tags <url> .cache/content-repo
git -C .cache/content-repo sparse-checkout set $WRITING_REMOTE_PATH
git -C .cache/content-repo fetch --depth 1 origin $WRITING_REMOTE_REF
git -C .cache/content-repo checkout FETCH_HEAD
```

Astro's content collection adds a glob loader pointing at `.cache/content-repo/posts/*.{md,mdx}` ALONGSIDE the existing local glob. Both are merged into the same `pages/writing` collection; Zod validates uniformly. The collection's loader `digest` includes `entry.data.commit` so path-stable / commit-changed posts invalidate cache correctly.

Tradeoff: Two source locations for one collection. Justified by the explicit `repo` frontmatter discriminating local from remote at render time (e.g., for the "Edit on GitHub" link).

### 6. Webhook flow

```
artagon/content: PR merged to main
  → workflow runs: gh api -X POST repos/artagon/artagon-site/dispatches \
       -f event_type=pull-request-merged \
       -f client_payload='{"sha": "<MERGE_SHA>", "ref": "refs/heads/main"}'
artagon/artagon-site:
  → .github/workflows/content-redeploy.yml triggered on repository_dispatch
  → runs build with WRITING_REMOTE_REF=<MERGE_SHA>
  → deploys via existing GitHub Pages workflow
```

The site repo's secret `CONTENT_DISPATCH_TOKEN` is a fine-grained PAT scoped to `repo: artagon/artagon-site` (only the dispatches endpoint). Documented in `docs/writing-pipeline.md` for the content-repo authors.

### 7. Schema additive, not breaking

The redesign's `pages/writing` Zod schema requires `title`, `description`, `eyebrow`, `headline`, `lede`, `ctas[]`, `published`, `tags[]` and accepts optional `updated`, `cover`, `accent`, `repo`. This change extends the optional set with `path` (path within `repo`) and `commit?` (the SHA at which the post was authored). Both are derived automatically by `fetch-content.mjs` for remote posts; local posts can omit them.

### 8. MDX component allowlist enforced via custom remark plugin (Astro built-in does NOT enforce)

Posts (local AND remote) MUST use only `StandardChip`, `StandardsRow`, `TrustChain`, `Diagram`, `Callout`. **Astro's MDX `components` config does NOT reject unknown JSX** — it falls through and renders unknown JSX as plain HTML/custom-element. Enforcement therefore requires a custom remark/rehype plugin (`remark-mdx-restrict-jsx`) wired into `astro.config.mjs`'s `markdown.remarkPlugins`. The plugin walks the MDX AST and throws on disallowed AST kinds: `mdxJsxFlowElement`, `mdxJsxTextElement`, `mdxFlowExpression`, `mdxTextExpression`, plus `mdxjsEsm` for posts where `entry.data.repo` is set (remote ESM imports rejected unconditionally). Documented in `docs/writing-pipeline.md`.

### 9. Coordination with prior changes

- This change MUST land AFTER `update-site-marketing-redesign` archives. `npm run verify:writing-prerequisites` (Phase 0.x) fails the build unless the redesign is archived.
- This change MUST land AFTER `adopt-design-md-format` archives (DESIGN.md is the source of truth for brand-icon viewBox/path constants).
- The two prerequisites are validated by a single combined script.

### 10. Glyph parity check

`scripts/check-glyph-parity.mjs` diffs `src/data/brand-svgs.ts` SVG path data against a frozen snapshot derived from DESIGN.md §4.14. Snapshot lives in `tests/fixtures/brand-glyph-snapshot.json`. CI fails on drift; updating requires a coordinated DESIGN.md change. Decision is consistent with `adopt-design-md-format`'s OKLCH-hex parity pattern.

## Risks & Rollback

- **Risk: PNG generation drift.** Mitigation: committed PNGs + `git diff --exit-code` CI check.
- **Risk: Remote content unreachable.** Mitigation: opt-in env-var; missing-repo defaults to local-only; Playwright smoke test for empty-env path.
- **Risk: Webhook unauthorized.** Mitigation: PAT-scoped secret; `event_type` allow-list; SHA pinning prevents `main`-branch race.
- **Risk: Embargoed content leak.** Mitigation: documented review responsibility on `artagon/content`; SHA pinning means CI clones a specific reviewed commit, not floating `main`.
- **Risk: Glyph drift between TS and DESIGN.md.** Mitigation: `check:glyph-parity` snapshot diff.
- **Risk: `/brand` perf hit on Lighthouse.** Mitigation: documented exception with relaxed threshold; route is `noindex`.
- **Risk: Remote MDX uses disallowed components.** Mitigation: Astro MDX allowlist fails the build at parse time.
- **Rollback ordering (matters):** Disable `WRITING_REMOTE_REPO` env in CI first (immediate fallback to local-only without a code revert). Then `.github/workflows/content-redeploy.yml`. Then `src/content/config.ts` augmentation. Then `/brand` route + generators + `brand-svgs.ts`. Per-step independent within this order.

## Open Questions

- (None remain unresolved at validate time. All four prior Open Question candidates were decided in the proposal: default repo `artagon/content`, dispatch trigger `repository_dispatch`, `/brand` is the gallery route, sharp generates PNGs.)
