# Implementation Tasks

## 1. Test Remediation

- [ ] 1.1 Update `tests/vision-page.spec.ts` selectors.
  - [ ] Replace `.domain-card` with `.ui-card--domain` (or similar).
  - [ ] Replace `.pillar-card` with `.ui-card--pillar`.
  - [ ] Replace `.section-header` with `.ui-section-header`.
  - [ ] Verify tests pass locally with `npx playwright test tests/vision-page.spec.ts`.

## 2. Style System Compatibility

- [ ] 2.1 Update `public/assets/theme.css` fallbacks.
  - [ ] Define fallbacks inside `[data-theme="..."]` blocks or ensure global fallbacks are neutral.
  - [ ] Verify fallback values match their respective theme's brand colors.
- [ ] 2.2 Update Component APIs (`Card`, `SectionHeader`, `FeatureList`).
  - [ ] Add `class` prop support (destructure `class: classNameProp` and merge).
  - [ ] Spread `...rest` props to the root element.
  - [ ] Add `variant="solid"` support to `Card.astro` and mapping to `.ui-card--solid`.
- [ ] 2.3 Refactor `src/content/pages/vision.mdx`.
  - [ ] Replace `<div class="mission-statement ui-card ui-card--solid">` with `<Card variant="solid" className="mission-statement">`.

## 3. Documentation

- [ ] 3.1 Update `openspec/changes/refactor-styling-architecture/styling-guide.md`.
  - [ ] Add `id` prop to `SectionHeader` documentation.
  - [ ] Document `solid` card variant.
- [ ] 3.2 Update `openspec/changes/refactor-styling-architecture/decisions.md`.
  - [ ] Add `ui-bulleted-list` and `ui-numbered-list` to utility table.

## 4. Copilot/OpenSpec Integration

- [ ] 4.1 Add `.github/copilot-instructions.md` with OpenSpec workflow guidance and examples.
- [ ] 4.2 Add `.github/copilot-review-instructions.md` with spec compliance review steps and a structured review template.
- [ ] 4.3 Add spec/proposal issue templates in `.github/ISSUE_TEMPLATE/` and update/replace `.github/PULL_REQUEST_TEMPLATE.md`.
- [ ] 4.4 Add `.github/workflows/spec-compliance.yml` and `.github/workflows/spec-review-reminder.yml`.
- [ ] 4.5 Add `.github/labels.yml` with spec workflow labels.
- [ ] 4.6 Add `scripts/validate-spec-reference.js` for CI and local validation.
- [ ] 4.7 Update `COPILOT.md` to point to OpenSpec context and the new Copilot instruction files, referencing `openspec/AGENTS.md`, `openspec/project.md`, and `openspec/contributing.md`.
- [ ] 4.8 Add OpenSpec workflow section to `docs/CONTRIBUTING.md`.

## 5. Verification

- [ ] 5.1 Run E2E tests and ensure pass.
- [ ] 5.2 Manual visual check of `vision.mdx` (ensure "solid" card renders correctly).
