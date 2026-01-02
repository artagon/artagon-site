# Implementation Tasks

## 1. Test Remediation

- [x] 1.1 Update `tests/vision-page.spec.ts` selectors.
  - [x] Replace `.domain-card` with `.ui-card--domain` (or similar).
  - [x] Replace `.pillar-card` with `.ui-card--pillar`.
  - [x] Replace `.section-header` with `.ui-section-header`.
  - [x] Verify tests pass locally with `npx playwright test tests/vision-page.spec.ts`.

## 2. Style System Compatibility

- [x] 2.1 Update `public/assets/theme.css` fallbacks.
  - [x] Define fallbacks inside `[data-theme="..."]` blocks or ensure global fallbacks are neutral.
  - [x] Verify fallback values match their respective theme's brand colors.
- [x] 2.2 Update Component APIs (`Card`, `SectionHeader`, `FeatureList`).
  - [x] Add `class` prop support (destructure `class: classNameProp` and merge).
  - [x] Spread `...rest` props to the root element.
  - [x] Add `variant="solid"` support to `Card.astro` and mapping to `.ui-card--solid`.
- [x] 2.3 Refactor `src/content/pages/vision.mdx`.
  - [x] Replace `<div class="mission-statement ui-card ui-card--solid">` with `<Card variant="solid" className="mission-statement">`.

## 3. Documentation

- [x] 3.1 Update `openspec/changes/refactor-styling-architecture/styling-guide.md`.
  - [x] Add `id` prop to `SectionHeader` documentation.
  - [x] Document `solid` card variant.
- [x] 3.2 Update `openspec/changes/refactor-styling-architecture/decisions.md`.
  - [x] Add `ui-bulleted-list` and `ui-numbered-list` to utility table.

## 4. Copilot/OpenSpec Integration

- [x] 4.1 Add `.github/copilot-instructions.md` with OpenSpec workflow guidance and examples.
- [x] 4.2 Add `.github/copilot-review-instructions.md` with spec compliance review steps and a structured review template.
- [x] 4.3 Add spec/proposal issue templates in `.github/ISSUE_TEMPLATE/` and update/replace `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] 4.4 Add `.github/workflows/spec-compliance.yml` and `.github/workflows/spec-review-reminder.yml`.
- [x] 4.5 Add `.github/labels.yml` with spec workflow labels.
- [x] 4.6 Add `scripts/validate-spec-reference.js` for CI and local validation.
- [x] 4.7 Update `COPILOT.md` to point to OpenSpec context and the new Copilot instruction files, referencing `openspec/AGENTS.md`, `openspec/project.md`, and `openspec/contributing.md`.
- [x] 4.8 Add OpenSpec workflow section to `docs/CONTRIBUTING.md`.

## 5. Verification

- [x] 5.1 Run E2E tests and ensure pass.
- [x] 5.2 Manual visual check of `vision.mdx` (ensure "solid" card renders correctly).
