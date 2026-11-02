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
