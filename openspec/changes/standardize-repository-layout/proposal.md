## Why

The application already follows Astro's source and public-asset conventions, but authoring templates, local scratch, generated verification reports, and historical prose have unclear ownership. The approved PR 0–12 cleanup plan addresses those concrete problems while preserving deployment, security, test, and evidence contracts.

## What Changes

- Keep the single Astro application, its content collections, root discovery files, public image URLs, and three test runners in place; document their ownership.
- Stop tracking session.txt and the ignored Lychee cache. Remove the obsolete direct Sharp dependency and inactive rimraf/glob overrides; declare YAML directly for its test consumers.
- Move the two OG authoring templates into scripts/templates/og/, the Cloudflare HSTS note into docs/guides/, and the dated site audit into docs/archive/.
- Correct the hero-edit workflow and the favicon helper's source-image paths. Fix the Caddy/nginx examples to return a real static 404.
- Relocate the logo guide to docs/guides/logo-assets.md after amending the active branding change; preserve all 15 contracted PNG outputs.
- **BREAKING — tooling/report paths:** move generated icon checksum reports from public/icons/checksums/ to the BUILD.reports.iconChecksums path, .build/reports/icon-checksums. Existing published checksum URLs and the public logo-guide URL are retired only with explicit migration notes; served image URLs remain unchanged.
- Replace the planned static set:html repair with a fail-closed build-time trusted-sink-module gate (site-w1n.12, site-kks). Its initial reviewed exports are safeJsonLd from src/lib/charset.ts and the FAQ renderMarkdown export from src/lib/markdown.ts, subject to explicit escaping, raw-HTML rejection and input contracts. Verify provenance against the actual linked build graph, including raw runtime and wrapper paths; a stateless current-hash gate requires a committed adversarial review with verdict APPROVE under the existing advisory CODEOWNERS policy. Keep both existing controls active until the new gate passes the baseline and bypass matrix; retire them atomically with the proven replacement and reconcile active contracts.
- Extract historical USMR task prose into evidence/implementation-history.md inside the still-active change. Preserve every ordered checkbox ID/state occurrence, including duplicates, and keep the live tasks.md path and prerequisite gates. Repair moved relative/verbatim file references and current readers' history pointers; the prerequisite scanner remains scoped to the live checklist, with a migration precondition preventing stale paths from being moved out of its coverage.

## Capabilities

### New Capabilities

- repository-layout: source/tooling/document ownership, mapped asset/document moves, local artifact tracking, manual-tool compatibility, and static-server sample behavior.

### Modified Capabilities

- build-config: add the icon-checksum report-location and reproducibility contract to openspec/specs/build-config/spec.md; preserve its existing path-validation and committed public-deliverable requirements.
- check-site-quality: add build-time trusted-sink provenance, sink contracts, governance and migration requirements to openspec/specs/check-site-quality/spec.md without changing Lighthouse, browser reports, or runner discovery.
- site-content: reconcile the FAQ Markdown pipeline requirement in openspec/specs/site-content/spec.md with the dedicated safe FAQ pipeline, preserving Markdown authoring and the raw-HTML prohibition. Its full MODIFIED delta and live-spec reconciliation land with PR 11's atomic cutover.
- openspec-workflow: add active-change checklist/evidence preservation to openspec/specs/openspec-workflow/spec.md; extraction must not imply completion or archive state.

No github-pages-deployment delta is needed: no path named by that live capability moves, and its workflow, .nojekyll and _config.yml safeguards remain. Amendments to the active add-brand-assets-and-writing-pipeline and update-site-marketing-redesign changes are explicit implementation tasks naming their affected contracts; this proposal does not edit those changes. PR 11 reconciles the USMR JSON-LD requirement/design/task and the branding safe-composition scenario with the actual trusted-sink gate.

## Impact

- Implementation spans root package/ignore/config documents, scripts and authoring inputs, human/agent docs, public checksum reports, sample server configs, the build-time HTML security gate and targeted tests.
- build.config.json remains the path source of truth; build.config.ts and generated config headers must follow its new report leaf. Any dependency needed by the future sink implementation requires explicit security review and lockfile proof.
- README, DESIGN's future diagram path and §9.4.1 security-gate reference, openspec/project.md, glossary/manifest entries and active-change references stay synchronized with their consumers.
- Thirteen ordered PR groups, numbered 0–12, retain separate review and acceptance. Each task is a bead-sized implementation unit; task completion requires its stated proof.
- modernize-build-pipeline owns LHCI/.astro contract reconciliation and pipeline changes. Layout PR 1 must land before its task 1.4 asserts that .lycheecache is untracked. Shared-file merges preserve both changes' requirements; this change does not edit that sibling.

## Out of Scope

- Root CNAME removal, _config.yml removal, and retirement of self-host deployment support: existing contracts or external consumers still apply.
- COPILOT.md/review-template collapse, design-pin relocation, skill-adapter consolidation, vendor-guide rewrites, and lock/spec-mirror removal: these are discovery, provenance or specification inputs.
- Deleting branded PNG names, cropping/deleting screenshot baselines, or truncating raw eval evidence: duplicate bytes do not prove redundant contracts or coverage.
- Removing the documented generic asset utilities or schema/frontmatter fields: their users and contracts remain.
- Test-runner consolidation, moving app code into a monorepo/config hierarchy, changing content IDs/routes, public theme.css bundling, or adopting Tailwind/Starlight: no demonstrated layout benefit justifies those architecture changes.
- Build sharing, new postbuild runners, native CSP replacement, font migration, LHCI server redesign, or relocating Astro-generated metadata: separately scoped work, including modernize-build-pipeline.
- Archiving USMR, renumbering or deduplicating its checklist, changing checkbox states, deleting historical evidence, or completing pending features: narrative extraction changes presentation only.

