# Layout implementation baseline and reference map

This evidence records the implementation checkout before the layout edits in this branch. The retained plan remains the authority for scope; this inventory does not add work to the deferred list.

## Baseline checkout

- Integration head: `ce35e1a1f264a2ef557526088f022a2083c047aa`.
- Strict OpenSpec validation: `rtk openspec validate --strict standardize-repository-layout` — exit 0.
- Lifecycle build: `rtk npm run build --ignore-scripts=false` — exit 0; generated the static site and ran the configured postbuild gates.
- Astro check: `rtk npm run check` — exit 0 (237 files; no errors, warnings, or hints).
- Pinned static analysis: `rtk npm run lint:sg` — exit 0.
- Node tests: `rtk npm run test:node --ignore-scripts=false` — exit 1 (189 passed, 2 GPG-dependent fixture failures at `tests/verify-prerequisites.test.mjs:153` and `:185`; GPG could not create a temporary file or reach `gpg-agent` in this environment).
- Vitest: `rtk npm run test:vitest --ignore-scripts=false` — exit 1 (96 files; 806 passed, 9 skipped, 6 failed). Three failures were active-change registry drift: this change was missing from `AGENTS.md`, `openspec/project.md`, and `openspec/config.yaml`. Three tests timed out during the concurrent baseline run; those are not evidence of layout behavior.
- Playwright runner and required CI jobs were not run in this local baseline.
- Local runtime reported Node `v26.13.0`, while `.nvmrc` and `package.json` require Node `22.23.4+`; the version mismatch is recorded, not used to change the approved scope.

The baseline checks above were executed against the implementation checkout before this branch's edits. The retained build warnings (design-lint advisories and CDN-font references) are existing warnings, not new acceptance claims.

## Scope and source drift

Strict validation passed for the approved PR 0–12 change. The source inventory had drifted in `openspec/project.md`: its Astro and Node pins, collection paths, and typed-data inventory did not match `package.json`, `.nvmrc`, `src/content.config.ts`, and `src/data/standards.ts`. The active-change registries also omitted this proposal. These are corrected in PR 0; no capability is described as live before archive. Other approved PR targets remain as stated in `proposal.md`, `design.md`, `specs/repository-layout/spec.md`, and `tasks.md`.

## Exact move and reference map for this lane

| Group / current path → target | References and ownership updates | Required proof |
| --- | --- | --- |
| 0: no filesystem move; establish the contract and active-change references | `README.md` layout map; `openspec/project.md` stack, collection/data inventory and active-change context; `AGENTS.md` symbolic OpenSpec list; `openspec/config.yaml` in-flight list; `.agents/context/glossary.md` branch summary. | Strict OpenSpec validation; documentation pin/path checks; active-change symbolic-reference/config sync tests; `npm run check`, `lint:sg`, and diff check. |
| 3: `assets/og-template.svg` → `scripts/templates/og/og-template.svg`; `assets/og-template-image.svg` → `scripts/templates/og/og-template-image.svg` | `scripts/make-og-from-template.sh` (`TEMPLATE_TXT` / `TEMPLATE_IMG`); README script map and OG usage; `openspec/contributing.md` OG guidance; `openspec/project.md` tooling ownership; `_config.yml` removes only the root `assets` exclusion and retains the `scripts` exclusion; `DESIGN.md` changes the future `assets/diagrams/<slug>.svg` reference to `src/assets/diagrams/<slug>.svg`; `tests/scripts-tooling.test.mts` covers image selection and text fallback. | Compare pre/post bytes; prove image template plus logo selects image rendering; prove missing logo/image template selects the text template; prove missing selected text template fails before conversion; preserve CLI/output defaults and test the image branch independently of the unused text template. |
| 4: `deploy/cloudflare-hsts.md` → `docs/guides/cloudflare-hsts.md` | README guide index and `openspec/project.md` deploy description. Design inventory found no other source/config/test consumer or relative hyperlink. Keep `deploy/Caddyfile` and `deploy/nginx.conf` unchanged in this group. | Compare note bytes; resolve the new guide link; run doc/path checks. |
| 5: `docs/SITE_AUDIT.md` → `docs/archive/2025-11-12-site-audit.md` | Audit self-path; README path/date; `.agents/context/glossary.md`; every matching path in active `openspec/changes/update-site-marketing-redesign/tasks.md`. | Preserve audit date/findings and every task checkbox ID/state; run path-citation test, link check, and exact old-path search; retain before/after comparison evidence. |
| 6: no source move; correct editorial/template ownership | `.agents/workflows/update-hero.md` and `id: update-hero` in `.agents/AGENT_MANIFEST.yaml`; editorial copy belongs in `src/content/pages/home.mdx`, while template changes belong in `src/pages/index.astro`. | Review-only: record exact manifest/workflow file lines, verify the content path exists, and trace `getEntry("pages", "home")` plus `home.data` in `src/pages/index.astro`. No permanent broad validator is part of this task. |

The path map follows D2 in `design.md` and was recorded before performing the corresponding moves. Each group must repeat its path/reference search against the implementation head before its own commit.

## PR 3 implementation evidence

- Moved both templates with `git mv` and changed only the generator's two template paths. Their before/after SHA-256 values match: text `caae5520cb7150d62c705814b82f0ecb0c479a96ee1966dae5fca7ed197a0bb4`; image `b4af1e7f37de66c965b50cb450a2eef538e2e86bc0fcbf54a961c6fb146f3be4`.
- `rtk npx --no-install vitest run tests/scripts-tooling.test.mts` — exit 0 (15 tests). Its disposable fixture converts the unchanged moved SVG inputs and a real logo to 1200×630 PNGs with the installed `rsvg-convert` via a test-local Inkscape-compatible adapter. It proves image selection without a text template, text fallback for missing logo and missing image template, unchanged default output, and no converter call when the selected text template is missing.
- `rtk npx --no-install vitest run tests/lint-agents-md-path-citations.test.mts` — exit 0 (12 tests). `rtk rg` over README, contribution/project docs, DESIGN, config, scripts, and tests found no stale OG-template source path (exit 1, no matches). `_config.yml` retains only the `scripts` exclusion among `assets` / `scripts` (exit 0).
- Strict OpenSpec validation, `npm run check`, `npm run lint:sg`, and `git diff --check` passed for this group (exit 0; recorded with the group report).
- The direct ImageMagick path is not verified on this macOS host: its SVG delegate fails on the original CSS font shorthand (`unable to read font ''`). The real conversion gate used the available `rsvg-convert` renderer with the original template bytes; this limitation is specific to the local ImageMagick converter path.

## PR 4 implementation evidence

- Moved `deploy/cloudflare-hsts.md` to `docs/guides/cloudflare-hsts.md`; the source and target SHA-256 values match (`68a4cdfacb496549d50bfd287266e486c414ba65a9a3b1f7037c5b3444365ab6`). Updated the README living-guide index and `openspec/project.md` deploy description.
- `rtk npx --no-install vitest run tests/lint-agents-md-path-citations.test.mts` — exit 0 (12 tests). The exact old source path search across current README/project/docs/deploy sources returned no matches (exit 1). `rtk git diff --stat -- deploy/Caddyfile deploy/nginx.conf` — exit 0 with no changes.
- Strict OpenSpec validation, `npm run check`, `npm run lint:sg`, and `git diff --check` passed for this group (exit 0; recorded with the group report).

## PR 5 implementation evidence

- Moved `docs/SITE_AUDIT.md` to `docs/archive/2025-11-12-site-audit.md`; the only audit-content change is its self-path. The document still states `2025-11-12`, and the README index now uses that date.
- Before the move, exact `docs/SITE_AUDIT.md` references were: README 1, glossary 1, audit self-path 1, and active USMR `tasks.md` 7 occurrences (on lines 211, 213, 423, and five on 425). After the move, the old path has no matches in the current README, glossary, archived audit, or active USMR tasks (search exit 1); all seven USMR task references resolve to the new path. The USMR task diff is four lines changed / four lines replaced, each due only to the path substitution; task IDs and checkbox states were not edited.
- `rtk npx --no-install vitest run tests/lint-agents-md-path-citations.test.mts` — exit 0 (12 tests). Full configured Lychee exited 2 because outbound network requests to unrelated external URLs failed (99 external errors); `rtk lychee --root-dir <worktree> --config lychee.toml --no-progress --offline` — exit 0 with zero local-link errors. External URL reachability is unverified in this environment; the coordinator was notified.
- Strict OpenSpec validation, `npm run check`, `npm run lint:sg`, and `git diff --check` passed for this group (exit 0; recorded with the group report).

## PR 6 implementation evidence

- Reviewed the complete `.agents/workflows/update-hero.md`: line 5 directs editorial copy to `src/content/pages/home.mdx`; lines 7–11 define copy-field and schema guidance; line 15 reserves `src/pages/index.astro` for layout/template changes; line 19 gives verification steps.
- Reviewed the exact `.agents/AGENT_MANIFEST.yaml` entry: line 42 has `id: update-hero`, line 45 names `src/content/pages/home.mdx` as its output, and line 46 identifies `src/pages/index.astro` for template/layout changes. The YAML comment at line 41 cites LAYOUT-06A.
- Confirmed the editorial file exists in the checkout (`git ls-files src/content/pages/home.mdx`, exit 0). Its `eyebrow`, `headline`, `lede`, and `ctas` frontmatter are at lines 4–7. In `src/pages/index.astro`, line 17 calls `getEntry("pages", "home")` and line 19 consumes `home.data`.
- Review-only gate passed: the old template-as-editorial-target instruction was removed, and no nonexistent target was introduced. The existing manifest skills-sync test is not evidence for this task entry; no new validator or app source change was added.
- Strict OpenSpec validation, `npm run check`, `npm run lint:sg`, and `git diff --check` passed for this group (exit 0; recorded with the group report).

## PR 9 implementation evidence

- Before moving the guide, amended the branding proposal's current contract references, tasks 3.2 and 8.1a, and the `site-branding` 15-PNG requirement to name `docs/guides/logo-assets.md` as the guide authority. The 15 output names and `/assets/logos/` image paths are unchanged; the dependency on the redesign landing first remains. `rtk openspec validate --strict add-brand-assets-and-writing-pipeline` — exit 0.
- Moved `public/assets/logos/README.md` to `docs/guides/logo-assets.md`. The source blob and target content hash match exactly: `32eafe67a0117c50977aa3e64e4db384815e69ff`.
- Updated README's two guide references, added the public-guide retirement note while documenting stable image URLs, updated the glossary's current location pointer, and updated the orphan-SVG test comment while preserving its pt182 historical statement. Both branding review files now explicitly label their original path citations as historical evidence.
- The configured offline link check over README, the moved guide and glossary (`rtk lychee --offline --root-dir <checkout> --config lychee.toml --no-progress ...`) — exit 0 (41 total, 0 errors). A search for external URLs to the retired guide URL returned no matches (exit 1), so no external URL migration dependency was discovered.
- `rtk npx --no-install vitest run tests/lint-agents-md-path-citations.test.mts tests/lint-orphan-public-svg.test.mts` — exit 0 (2 files, 13 tests). `rtk npm run check`, `rtk npm run lint:sg`, and `rtk git diff --check` — exit 0.
- `rtk npm run build --ignore-scripts=false` — exit 0 (23 pages; configured postbuild gates passed). A post-build assertion confirmed that `.build/dist/assets/logos/README.md` is absent and all 15 contracted PNGs exist under `.build/dist/assets/logos/`, preserving their `/assets/logos/` URLs. The existing 69 third-party font-reference warnings remain outside this group.
