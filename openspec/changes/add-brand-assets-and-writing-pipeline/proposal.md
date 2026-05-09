## Why

Two scope additions surfaced after `update-site-marketing-redesign` was authored:

1. **Brand artifact adoption.** `new-design/extracted/` contains a complete brand-icon system: a 26.7 KB `brand-icons.html` gallery with 7+ glyph variants (classic, tight, filled, monochrome, cropped), wordmark builders (`wmHorizontal`, `wmStack`), an OG card composition, and a 15-asset PNG generation contract documented in `public/assets/logos/README.md`. The base redesign change deferred all of this to a follow-up; the user has now scoped it back in. We also need favicon/apple-touch/manifest icon outputs (already in `site-branding` cap, but the SOURCE SVGs and the `brand-icons.html` gallery route are not).

2. **GitHub-sourced writing pipeline.** DESIGN.md §4.12 specifies a "Long-form reader (GitHub-sourced writing & docs)" — articles authored as Markdown/MDX in a separate `artagon/content` repo, fetched at build time, rendered server-side, displayed in the home-page Writing widget AND at `/writing/[slug]`. The base redesign currently ships a local `src/content/writing/*.mdx` collection only (pre-pt414 cited as `src/content/pages/writing/*.mdx` — sister to pt401/pt413 path-nesting drift; the writing collection is a SIBLING of pages/, not nested) — adequate for v1, but doesn't match the editorial workflow the user wants: PR merge in the content repo → webhook → CI rebuild → site re-deploys with the new post visible in the widget.

Both additions are infrastructure-and-content scoped. They sequence AFTER `update-site-marketing-redesign` lands (which establishes `site-content`, `site-branding`, the `Writing` route, and the home Writing widget). This change extends those capabilities and adds two new ones.

## What Changes

### Brand artifacts (extends `site-branding`, adds `site-brand-gallery`)

- **Promote brand-icon SVG sources** from inlined JS in `new-design/extracted/src/pages/brand-icons.html` (the `SRC.classic`, `SRC.tight`, `SRC.filled`, `wmHorizontal`, `wmStack` constants) into a typed module `src/data/brand-svgs.ts` exporting strongly-typed factories. Source-of-truth contract: SVG strings come from this module ONLY; nothing inlines glyph paths elsewhere. Enforced by ast-grep `rules/security/no-inline-glyph.yaml`.
- **Add `/brand` route** rendering the gallery (favicons, avatars, OG cards, monochrome, wordmarks, cropped/filled remixes — all 7 variants per DESIGN.md §4.14) with copy-SVG buttons on each tile. The route is `noindex` (it's a brand-asset reference, not marketing content).
- **Add `scripts/generate-logo-pngs.mjs`** (sharp-based, already a dep) producing the 15 PNG outputs documented in `public/assets/logos/README.md`. Wired into `postbuild` AFTER `sri.mjs`+`csp.mjs` (PNGs don't need SRI hashing). Generated PNGs are committed (deterministic outputs, audit trail).
- **Add `scripts/generate-favicons.mjs`** producing `favicon.ico` (multi-size), `favicon.svg` (themed via `currentColor`), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `mask-icon.svg` from the same `brand-svgs.ts` source. Adds a `Deterministic Favicon Generation` requirement to the `site-branding` capability; the redesign's hand-authored favicon task is superseded by this generator.
- **Strengthen `site-branding` Inline-Wordmark Ban** to forbid inlined glyph paths anywhere outside `Header.astro` (pre-pt406 `Nav.astro` — consolidated into `Header.astro` per USMR proposal.md:75), `Footer.astro`, and the `/brand` gallery route — closes a gap where contributors might paste glyph SVG into MDX or other Astro components.

### Writing pipeline (extends `site-content`, adds `site-writing-pipeline`)

- **Default writing source remains local** `src/content/writing/*.mdx` (pre-pt414 cited as `src/content/pages/writing/*.mdx` — path-nesting drift; the redesign's contract uses the conventional `src/content/writing/` root path. Per `src/content.config.ts:131` writing loader `base: "./src/content/writing"`. Sister to pt401/pt413 fixes.) The redesign's contract is preserved — this is non-breaking.
- **Add an opt-in remote writing source.** When `WRITING_REMOTE_REPO` env is set (default: empty string until `artagon/content` exists publicly; flip the default to `artagon/content` in a single-line follow-up PR after the upstream repo is created), `src/content.config.ts` augments the `writing` collection (pre-pt415 cited as `pages/writing` — collection is named `writing`, not `pages/writing`; per `src/content.config.ts:128` declaration. Sister to pt414 path-nesting fixes.) with a glob-loader that reads markdown from a build-time clone of the remote repo into `.cache/content-repo/posts/`. The opt-in is per-build, not per-post; same Zod schema applies. `repo` is Zod-allowlisted to `['artagon/content']`; non-allowlisted owners fail validation, preventing phishing via the "View source on GitHub" link.
- **Build-time fetch only** — no client-side fetches to GitHub. The clone happens in a dedicated CI step before `astro build`. The clone uses the SHA-pinned sequence `git clone --no-checkout --depth 1 --filter=blob:none --sparse … && git sparse-checkout set posts/ && git fetch --depth 1 origin <SHA> && git checkout FETCH_HEAD` (the prior `git clone --branch <SHA>` form is invalid — `--branch` accepts only branch and tag names, not 40-hex SHAs). Local dev: `npm run fetch:content` populates `.cache/content-repo/`; the `predev` lifecycle hook runs it automatically when `WRITING_REMOTE_REPO` is set; the script always runs `rm -rf .cache/content-repo` before clone to flush any embargoed staleness.
- **Webhook-triggered redeploy**: a `repository_dispatch` GitHub Action in `artagon/content` (templated in `docs/writing-pipeline.md` for the content repo's authors) fires `pull-request-merged` events on the site repo, which trigger `.github/workflows/content-redeploy.yml`. The workflow HARDCODES `WRITING_REMOTE_REPO=artagon/content` (it ignores any `client_payload.repo`, defending against social-engineered or leaked-PAT dispatches). It validates `client_payload.sha` against `^[a-f0-9]{40}$` AND verifies the SHA exists upstream via `git ls-remote` before clone. `client_payload.ref`, if used, is constrained to `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` and passed via `--` boundary (defense against argument-injection like `--upload-pack=…`, CVE-2017-1000117 family). The workflow MUST set `concurrency: { group: 'pages', cancel-in-progress: true }` matching the existing `deploy.yml`. End-to-end latency budget: P95 ≤ 10 minutes from PR-merge to live `/writing/[slug]`. Each deployed page emits `<meta name="artagon:build-sha" content="${WRITING_REMOTE_REF}">` so authors can verify their merge SHA is live; the workflow posts a status check back to the content-repo PR. The dispatch PAT (`CONTENT_DISPATCH_TOKEN`, fine-grained, `Contents: Read+Write` on the site repo) MUST rotate every ≤90 days per `docs/writing-pipeline.md`'s rotation runbook.
- **Per-post frontmatter contract** (extends the redesign's writing schema): adds `repo` (Zod enum allowlist `['artagon/content']`), `path` (regex `^posts/[A-Za-z0-9._/-]{1,200}$`), `commit` (40-hex full SHA — no truncation), and a constrained `cover` field (`^(\.\/assets\/|posts\/assets\/)…\.(png|jpg|jpeg|webp|avif|svg)$` — absolute URLs forbidden, prevents build-host SSRF where `astro:assets` could be steered to `169.254.169.254/...`). Future-dated posts (`published > buildDate`) are silently excluded from `getCollection` returns; the build does not fail.
- **Writing widget** (already specified in the redesign with placements `h1`, `a`, `b`, `c`, `d`, `off`) gets remote-source detection on ALL placements (not just `h1`). Each placement renders a "View source on GitHub" link (NOT "Edit on GitHub" — the link target is read-only at SHA, GitHub's edit pencil at a non-branch SHA spawns fork-and-PR; the wording must match the destination behavior) iff `entry.data.repo`, `entry.data.path`, and `entry.data.commit` are all defined and `repo` matches the allowlist. No client-side fetching; the widget is rendered at build time.
- **Remote-source diagrams**: Mermaid + D2 + SVG diagrams from DESIGN.md §4.12 work uniformly for local AND remote posts. The `astro:mdx` pipeline already processes both sources; Mermaid and D2 fenced blocks compile to inline SVG at build time regardless of source. There is NO remote-diagram exclusion — the user's "render in widget on PR-merge" promise applies to diagram-bearing posts.
- **Caching contract**: `.cache/content-repo/` is gitignored. The build assumes a fresh clone or a populated cache. CI uses a deterministic shallow clone at `WRITING_REMOTE_REF` (no `main` floating reference at build time — the merge SHA is pinned).

## Scope Boundaries

**In Scope:**

- `src/data/brand-svgs.ts` (typed SVG factory exports).
- `/brand` Astro route + tile templates + copy-SVG buttons.
- `scripts/generate-logo-pngs.mjs`, `scripts/generate-favicons.mjs` (sharp-based).
- `public/assets/logos/*.png` (15 outputs, committed).
- `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/mask-icon.svg`.
- ast-grep `no-inline-glyph` rule.
- `src/content.config.ts` augmentation for opt-in remote loader.
- `scripts/fetch-content.mjs` (shallow `git clone --depth 1 --branch <REF>` to `.cache/content-repo/`).
- `npm run fetch:content` script.
- `.github/workflows/content-redeploy.yml` (handles `repository_dispatch` from `artagon/content`).
- `docs/writing-pipeline.md` covering: how to author a post in `artagon/content`, frontmatter contract, the merge-to-deploy flow, env-var contract.
- Writing widget extension for the GitHub-sourced metadata.

**Out of Scope:**

- **No client-side GitHub fetching.** All fetches are build-time. The browser only sees pre-rendered HTML.
- **No webhook auth/secret rotation policy.** That's `artagon/content`'s repo-secrets concern; this change documents the contract.
- **Multi-repo content sources.** Only `artagon/content` (or the env-overridden single repo) is supported. Aggregating multiple content repos is a follow-up.
- **Authoring UI.** No CMS, no in-browser editor — Markdown + git PR is the only workflow.
- **Real-time updates.** The site is static; "real-time" means "redeploys on merge". No SSR fallback, no edge revalidation.
- **Image transformations on remote-sourced posts.** Remote posts use the same `astro:assets` pipeline as local posts; remote-only transforms (e.g., proxy-rewriting) are out of scope.
- **Re-architecting `site-content` schema.** This change MODIFIES the redesign's frontmatter contract in place (adding optional fields and tightening `cover` validation); existing required fields stay intact.
- **Visual changes to existing icons.** The brand-icon system from DESIGN.md §4.14 is adopted as-is; no new variants, no recolor.
- **Tweaks panel (DESIGN.md §4.10).** Owned by `update-site-marketing-redesign` (out of scope here).
- **Multi-repo content sources, scheduled-post UI, real-time preview.** Single-repo, build-time-only.

## Risks and Rollback

- **Risk: PNG generation drift.** Hand-edited PNGs and generator outputs would diverge over time. **Mitigation:** PNGs are generated by `npm run build:logos`; CI fails if `git diff --exit-code` shows divergence between committed PNGs and a fresh regeneration. Aligns with the `adopt-design-md-format` spec-cache pattern.
- **Risk: Remote content pipeline silently breaks site builds when `artagon/content` is unreachable, archived, or returns malformed frontmatter.** **Mitigation:** The opt-in env-var contract means missing-repo defaults to local-only build (graceful degradation); Zod schema validation fails the build with a precise error citing the remote post's repo + path; CI fails fast (exit code 1) rather than partially building. A Playwright smoke test asserts the build succeeds with `WRITING_REMOTE_REPO=` (empty) — proving fallback works.
- **Risk: Webhook firehose / unauthorized dispatches.** **Mitigation:** `repository_dispatch` requires a PAT scoped to `repo` on the site repo; secret stays in `artagon/content` repo secrets only. Dispatch payload is validated server-side; `event_type` allow-list (`['pull-request-merged']`) prevents accidental triggers from unrelated workflows.
- **Risk: Secret exposure if `WRITING_REMOTE_REPO` accidentally points at a private repo with embargoed content.** **Mitigation:** The clone uses `--no-tags` and reads only the `posts/` subtree; the build fails if the cloned repo lacks `posts/` (signals misconfiguration); `docs/writing-pipeline.md` documents that `artagon/content` MUST be public AND every PR MUST be reviewed for embargo status. We don't auto-trust the content repo's `main` branch — the dispatch payload must include the merge SHA and CI clones at that SHA.
- **Risk: Glyph SVG drift between `brand-svgs.ts` and the upstream DESIGN.md spec.** **Mitigation:** Add a `scripts/check-glyph-parity.mjs` that diffs `brand-svgs.ts` SVG strings against a frozen snapshot derived from DESIGN.md §4.14 viewBox/path constants; CI fails on drift. Glyph changes require a coordinated DESIGN.md update.
- **Risk: `/brand` route ships ~30 KB of inline SVG plus copy-button JS.** **Mitigation:** The route is `noindex`; Lighthouse perf budget for `/brand` is intentionally relaxed (perf ≥ 0.8, not 0.9) — documented as an exception in `lighthouserc.json`. The route is a tooling page, not a marketing surface.
- **Risk: Remote content uses MDX components not whitelisted on this site.** **Mitigation:** The Astro MDX component allowlist is enforced at parse time; remote MDX with unknown components fails the build. `docs/writing-pipeline.md` documents the allowlist (`StandardChip`, `TrustChain`, `Diagram`, `Callout`).
- **Rollback:** Revert in reverse order: (1) disable `WRITING_REMOTE_REPO` env in CI (immediately falls back to local-only); (2) remove `.github/workflows/content-redeploy.yml`; (3) remove the opt-in loader branch from `src/content.config.ts`; (4) revert `/brand` route, generators, generated PNGs, and `brand-svgs.ts`. Per-step is independent; none of the rollbacks affect already-published marketing pages.

**Merge-order dependency:** This change MUST archive AFTER `standardize-build-artifacts`. The `prebuild` chain (`build:prebuild-chain`) is owned by `standardize-build-artifacts`; this change extends it with `build:favicons` + `build:logos` during its own apply phase. Archiving in the reverse order would land `build:prebuild-chain` in `package.json` without the leading `sync:build-config` step, which is unfixable without retroactively editing the archived `standardize-build-artifacts`. `openspec validate --strict` MUST fail if this proposal attempts to archive while `standardize-build-artifacts` is still in flight.

## Impact

- **Affected Specs:**
  - `site-content` — **MODIFIED** (extends the redesign's `Per-route Frontmatter Contract` with optional `repo` (Zod enum allowlist), `path`, `commit` (40-hex), and a constrained `cover` regex preventing absolute-URL SSRF; future-dated posts excluded from collections without build error). Replaces in place; archive merger sees a single coherent requirement.
  - `site-branding` — **ADDED** (deterministic favicon/logo PNG generation, multi-surface inline-glyph ban, no-external-href in SVG factory, glyph parity with DESIGN.md §4.14 plus a coordinated-update CI gate, static default OG image with per-slug satori override composition).
  - `site-brand-gallery` — **New Capability** (`/brand` route, copy-SVG buttons, gallery-tile contract, noindex).
  - `site-writing-pipeline` — **New Capability** (build-time GitHub clone, env-var contract, webhook redeploy, per-post commit pinning).

- **Affected Code:**
  - `src/data/brand-svgs.ts` (new) — typed factory exports.
  - `src/pages/brand.astro` (new) — `/brand` gallery route.
  - `src/components/BrandTile.astro` (new) — gallery tile.
  - `scripts/generate-logo-pngs.mjs`, `scripts/generate-favicons.mjs`, `scripts/check-glyph-parity.mjs`, `scripts/fetch-content.mjs` (new).
  - `public/assets/logos/*.png` (15 outputs, committed).
  - `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/mask-icon.svg` (new, generated).
  - `src/content.config.ts` (augmented loader).
  - `src/components/WritingWidget.astro` (extended for remote metadata).
  - `.github/workflows/content-redeploy.yml` (new).
  - `.gitignore` (`.cache/content-repo/` added).
  - `rules/security/no-inline-glyph.yaml` (new ast-grep rule).
  - `package.json` scripts: `build:logos`, `build:favicons`, `check:glyph-parity`, `fetch:content`.
  - `lighthouserc.json` (`/brand` exception).

- **Affected Docs:**
  - `docs/writing-pipeline.md` (new) — content authoring contract for `artagon/content` repo + dispatch payload schema + MDX component allowlist + PAT rotation runbook (≤90-day expiry, leak-revocation procedure within 1h).
  - `docs/brand-assets.md` (new) — logo PNG generation, favicon outputs, brand-svg authoring rules.
  - `README.md` — link to both docs.

## Appendix: Inventory of `new-design/extracted/` artifacts

Audit trail for the user's "make sure ALL artifacts are getting adopted" requirement. Each top-level item is mapped to its disposition:

| Artifact                                                             | Disposition                                                                                                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md` (761 lines)                                              | Adopted by `adopt-design-md-format` (promoted to repo root, lint-gated)                                                                             |
| `MIGRATION.md`                                                       | Reference document; preserved in `new-design/` until both prerequisite changes archive                                                              |
| `src/pages/brand-icons.html` (gallery + JS constants)                | Adopted-In-This-Change: constants extracted to `src/data/brand-svgs.ts`; layout becomes `/brand` route. Source HTML deleted after extraction.       |
| `src/pages/*.html` (16 marketing-mock pages)                         | Adopted-In-Redesign as MDX content collections under `src/content/pages/`                                                                           |
| `src/components/*.jsx` (Hero, Pillars, Bridge, etc.)                 | Adopted-In-Redesign as `.astro` components                                                                                                          |
| `src/layouts/BaseLayout.jsx`                                         | Adopted-In-Redesign as `BaseLayout.astro` with slot ABI                                                                                             |
| `src/styles/tokens.css`, `global.css`                                | Adopted-In-Redesign as `public/assets/theme.css` cascade layers                                                                                     |
| `src/data/roadmap.ts` (typed roadmap data)                           | Adopted-In-Redesign as `src/data/roadmap.ts` (preserved verbatim)                                                                                   |
| `public/assets/logos/README.md` (15-PNG contract)                    | Adopted-In-This-Change: README copied verbatim to `public/assets/logos/README.md`; PNGs generated by `scripts/generate-logo-pngs.mjs`               |
| `public/assets/logos/*.png` (currently empty)                        | Adopted-In-This-Change: 15 PNG outputs generated and committed                                                                                      |
| `design_handoff_artagon_site/`                                       | Frozen mirror; NOT adopted (per its `FROZEN.md`)                                                                                                    |
| `openspec/changes/*/` (4 in-flight proposals)                        | Adopted-In-This-Change indirectly: `update-site-marketing-redesign` adopts the substantive plans; this change extends with brand + writing pipeline |
| `openspec/specs/*`                                                   | Replaced by this repo's existing `openspec/specs/` (post-`openspec init` upgrade)                                                                   |
| `scripts/lint-copy.mjs`                                              | Adopted-In-Redesign (already covered under the redesign's lint pipeline)                                                                            |
| `explorations/`, `migration/`, `screenshots/`, `scraps/`, `uploads/` | NOT adopted (working scratch, not deliverables; `MIGRATION.md` documents this)                                                                      |
| Tweaks panel (`DESIGN.md §4.10`)                                     | Adopted-In-Redesign as a hidden design-QA surface (NOT in this change)                                                                              |
| TrustChain tooltip (`DESIGN.md §4.13`)                               | Adopted-In-Redesign as `TrustChainTooltip.astro` with full ARIA contract                                                                            |

This inventory MUST be kept in sync with `new-design/extracted/` until both prerequisite changes archive; at that point the directory MAY be deleted in a separate cleanup change (`cleanup-new-design-extracted`).
