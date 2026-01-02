# Proposal: Fix Styling Refactor Gaps and Compatibility

## Why

The `refactor-styling-architecture` implementation has introduced structural changes that break existing E2E tests and created compatibility gaps for older browsers. Specifically:
- **Broken Tests**: `tests/vision-page.spec.ts` relies on CSS classes (`.domain-card`, `.section-header`) that were removed.
- **Theme Fallbacks**: `color-mix()` fallbacks in `theme.css` are hardcoded to the "Midnight" theme, causing visual inconsistencies when using "Twilight" or "Slate" themes on older browsers.
- **Component DX**: New UI components (`Card`, `SectionHeader`) do not accept standard `class` props or pass through attributes like `id` or `data-*`, limiting their usability.
- **Documentation Drift**: The implementation of `SectionHeader` (adding `id`) and `FeatureList` variants has drifted from the draft documentation.
- **Spec Review Context**: Copilot instructions do not yet capture the OpenSpec workflow or how to review changes against active specs, so automated reviews lack project context.

## What Changes

### 1. E2E Test Updates
- Update `tests/vision-page.spec.ts` to use the new utility class selectors (e.g., `.ui-card--domain`) or add `data-testid` attributes to components for robust testing.

### 2. Style System Compatibility
- **Theme-Aware Fallbacks**: Move fallback definitions into `[data-theme]` blocks in `theme.css` so they update correctly when the theme changes.
- **Component API**: Update `Card`, `SectionHeader`, and `FeatureList` to:
  - Accept both `class` and `className` props (merging them).
  - Spread `...rest` props to the root element to support `id`, `aria-*`, and `data-*` attributes.
- **New Variant**: Add a `solid` variant to `Card.astro` to replace manual utility usage in `vision.mdx`.

### 3. Documentation Alignment
- Update `styling-guide.md` and `decisions.md` to document:
  - The `id` prop on `SectionHeader`.
  - The `ui-bulleted-list` and `ui-numbered-list` utilities.
  - The new `solid` card variant.

### 4. Copilot/OpenSpec Integration
- Add Copilot instruction and review guidance files under `.github/`.
- Add spec and proposal issue templates, plus a spec-aware pull request template.
- Add spec compliance and review reminder workflows for OpenSpec tracking.
- Add label definitions and a validation script to support CI checks.
- Ensure Copilot context files link to `openspec/AGENTS.md` and other OpenSpec workflow sources.
- Document the OpenSpec workflow in `docs/CONTRIBUTING.md`.

## Impact

- **Affected Specs**: `style-system`, `configure-copilot-environment`, `openspec-workflow`
- **Affected Code**:
  - `tests/vision-page.spec.ts`
  - `public/assets/theme.css`
  - `src/components/ui/*.astro`
  - `src/content/pages/vision.mdx`
  - `openspec/changes/refactor-styling-architecture/` (documentation)
  - `.github/` templates and workflows
  - `docs/CONTRIBUTING.md`
  - `scripts/validate-spec-reference.js`

## Risks

- **Regression**: Changing fallbacks might affect the default theme if not carefully scoped.
- **Mitigation**: Verify all three themes in a browser that supports `color-mix` and manually verify fallback values.
