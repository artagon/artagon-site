- OIDC 2.1, GNAP, DPoP, PAR, JAR/JARM, RAR, mTLS, DIDs, SD-JWT, BBS+, OID4VCI/VP, Zanzibar, PAP/PDP/PEP, zookies.

## Theme System

- **midnight**: Default Midnight Teal theme (current brand colors)
- **twilight**: Twilight Indigo theme (dark blue with indigo accents)
- **slate**: Deep Slate Blue theme (deep blue with slate tones)
- **data-theme**: HTML attribute controlling active theme pack
- **--brand-teal, --brand-violet, --brand-sky**: Primary brand color variables used across themes
- **ThemeToggle**: Header component for switching themes
- **ThemePreviewPanel**: Dev-only floating panel for quick theme testing

## Navigation System

- **Skip link**: Accessible hidden link that appears on keyboard focus to jump to main content
- **Active link**: Current page highlighted in navigation with .active class
- **Shim page**: Placeholder page using ShimPage component to prevent 404s during development
- **Primary nav**: Platform, How it works, Developers, Search, Docs, GitHub
- **ShimPage**: Reusable component for creating placeholder pages with consistent structure

## Branch Change Summary

- Refactor styling architecture spec: added `design.md`, clarified scope/rollback in the proposal, and expanded tasks to align with `src/styles/vision.css` and theme token usage.
- Refactor styling architecture spec: added cross-page verification to the proposal risk mitigation for global utility changes.
- Refactor styling architecture docs: added draft planning docs (`openspec/changes/refactor-styling-architecture/styling-guide.md`, `openspec/changes/refactor-styling-architecture/README.md`, `decisions.md`, `token-inventory.md`) and aligned status/wording with OpenSpec approval flow.
- Refactor styling architecture docs: clarified metric baselines as estimates in `openspec/changes/refactor-styling-architecture/tasks.md`, `openspec/changes/refactor-styling-architecture/README.md`, and `openspec/changes/refactor-styling-architecture/decisions.md`.
- Refactor styling architecture proposal: added post-implementation documentation step to publish the styling guide under `docs/` and updated tasks to move it after implementation.
- Refactor styling architecture validation: added `openspec/changes/refactor-styling-architecture/validation-prompt.md`, aligned baseline metrics across `openspec/changes/refactor-styling-architecture/README.md` and `openspec/changes/refactor-styling-architecture/decisions.md`, and updated counts/priority notes in `openspec/changes/refactor-styling-architecture/token-inventory.md`.
- FAQ Markdown rendering: replaced `set:html` in `src/components/FaqItem.astro` with Astro Markdown pipeline rendering via `src/lib/markdown.ts`, added FAQ Markdown styling and schema-safe `stripMarkdown` in `src/pages/faq/index.astro`, and introduced `tests/faq-markdown.spec.ts`.
- OpenSpec archive batch: moved `openspec/changes/{add-copilot-integration,fix-copilot-review-issues,refactor-content-collections,update-site-quality-checks}/` into `openspec/changes/archive/2025-12-29-*` and generated new specs for `configure-copilot-environment`, `site-content`, `check-site-quality`, `manage-site-links`, and `openspec-workflow`.
- Copilot review spec: clarified that FAQ Markdown rendering must use the shared Astro Markdown pipeline for consistency with content collections.
- Copilot review spec: added `openspec/changes/fix-copilot-review-issues/specs/site-content/spec.md`, created tasks, and aligned proposal/design references to `vision.mdx`.
- OpenSpec archive: moved `openspec/changes/fix-pages-build/` to `openspec/changes/archive/2025-12-29-fix-pages-build/` and generated `openspec/specs/github-pages-deployment/spec.md`.
- Pages build fix implementation: added `public/.nojekyll` and `_config.yml` fallback excludes plus documented GitHub Pages source settings in `README.md`; marked `openspec/changes/fix-pages-build/tasks.md` complete.
- Pages deployment spec: added `openspec/changes/fix-pages-build/` (proposal, tasks, spec delta) to address GitHub Pages build failures caused by Jekyll parsing Astro sources.
- OpenSpec updates: `openspec/project.md`, `openspec/contributing.md`, `openspec/changes/update-site-quality-checks/` (proposal, tasks, specs), updates to `openspec/changes/refactor-content-collections/`, and new `openspec/changes/refactor-styling-architecture/`.
- Copilot integration: implemented `openspec/changes/add-copilot-integration/` with `.github/workflows/copilot-setup-steps.yml` and documented it in `README.md` (issue #6).
- Copilot context: added root `COPILOT.md` and linked it with `openspec/AGENTS.md`.
- CI workflows: updated GitHub Actions to the latest major versions across `.github/workflows/*.yml`.
- OpenSpec contributing: added AI agent guidance to check CI status and Copilot comments for spec-related work.
- Quality checks: `scripts/lhci-serve.mjs` added; `lighthouserc.json` updated with READY pattern; LHCI usage documented in `README.md`; `lychee.toml` updated to the current schema.
- Content collections: `src/content/config.ts` and `src/content/pages/vision.mdx` added; `src/pages/vision/index.astro` now renders content via `getEntry`; `sharp` added to `package.json` with `package-lock.json` generated.
- CI/test fixes: Playwright shards now use numeric indices and `/vision` routes; visual regression tests are gated to the dedicated job; hero gradient has a fallback in `src/pages/vision/index.astro`.
- Link hygiene: internalized CTAs and placeholders in `src/pages/index.astro` and `src/pages/docs/index.astro`; FAQ CTA trimmed in `src/pages/faq/index.astro`; endpoint mentions removed in `src/data/faq.ts`; SearchAction JSON-LD removed from `src/components/SeoTags.astro`.
- Assets/docs: external reference links removed from `scripts/icons/README.md` and `scripts/icons/VERIFICATION.md`; formatting-only updates in `astro.config.mjs`, `docs/LOGO_CONVERSION_SUMMARY.md`, `docs/LOGO_USAGE.md`, `docs/SITE_AUDIT.md`, `public/assets/logos/README.md`, `public/assets/theme.css`, `src/data/roadmap.ts`.
- New tooling/docs: `AGENTS.md`, `openspec/AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `playwright.config.ts`, `src/components/Difference.astro`, plus `.lighthouseci/` now ignored via `.gitignore`.
- Styling architecture implementation: added UI tokens/utilities in `public/assets/theme.css`, created `src/components/ui/` components, refactored `src/content/pages/vision.mdx` to use them, and reduced `src/styles/vision.css` to 220 lines with `.vision-doc` scoping; updated `openspec/changes/refactor-styling-architecture/tasks.md` progress.
- Styling refactor follow-up: added `openspec/changes/fix-styling-refactor-gaps/` with proposal, tasks, and spec deltas for compatibility fixes plus Copilot/OpenSpec workflow integrations.
- Vision tests: updated `tests/vision-page.spec.ts` selectors to match new UI utility classes (`ui-section-header`, `ui-card--domain`, `ui-card--pillar`, `ui-card-number`).
- Styling refactor gaps: made theme fallbacks theme-aware via `--brand-teal-rgb`, updated `Card`, `SectionHeader`, and `FeatureList` to merge `class`/`className` and forward attributes, and switched the vision hero mission statement to `Card` with `variant=\"solid\"`.
- OpenSpec workflow tooling: added Copilot instruction files, spec/proposal issue templates, a spec-aware PR template, spec compliance and reminder workflows, labels configuration, and `scripts/validate-spec-reference.js`, plus `docs/CONTRIBUTING.md` and refreshed OpenSpec docs references.
- Test run: `npx playwright test tests/vision-page.spec.ts` passes after installing Firefox (Playwright browser cache updated).
