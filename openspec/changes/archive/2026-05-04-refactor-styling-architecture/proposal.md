## Why

The Vision page styling lives in `src/styles/vision.css` and is a large, page-scoped block that duplicates patterns already defined in `public/assets/theme.css` and other pages (cards, section headers, feature lists). This makes it hard to keep the design system consistent as theme tokens evolve and forces duplication for new pages.

## What Changes

- **Audit and Extract Reusable Patterns:** Review `src/styles/vision.css` to identify reusable primitives (cards, section headers, feature lists, highlight boxes) and either map them to existing global utilities or promote them to new ones.
- **Global Theme Tokens:** Define or align shared tokens for hero gradients, borders, and spacing in `public/assets/theme.css` so page styles are driven by theme variables.
- **Reusable UI Components:** Introduce `src/components/ui/` primitives (e.g., `Card`, `SectionHeader`, `FeatureList`) that wrap global classes and reduce duplication.
- **Refactor Vision Content:** Update `src/content/pages/vision.mdx` to use the new components/classes and shrink `src/styles/vision.css` to page-only layout rules scoped under `.vision-doc`.

## Scope Boundaries

**In Scope:**
- Vision page layout and styles (`src/styles/vision.css`, `src/content/pages/vision.mdx`)
- Global utilities and tokens in `public/assets/theme.css`
- New UI primitives in `src/components/ui/`

**Out of Scope:**
- Visual redesign or copy changes
- Refactoring other pages beyond shared utilities
- Introducing new CSS frameworks or dependencies

## Risks and Rollback

- **Risk:** Global utilities can affect other pages.
  **Mitigation:** Prefer existing utilities, introduce new ones with clear prefixes or names, and keep page-only rules scoped under `.vision-doc`. Verify visual parity on `/`, `/platform`, `/roadmap`, and `/faq` across all themes before merge.
- **Rollback:** Revert the theme/component changes and restore the previous Vision-specific classes if parity cannot be maintained.

## Post-Implementation Documentation

After the implementation is approved and merged, publish the styling architecture guide under `docs/`. Move
`openspec/changes/refactor-styling-architecture/styling-guide.md` to `docs/guides/styling-guide.md` and update
references to point to the docs location.

## Impact

- **Affected Specs:** `style-system` (New Capability)
- **Affected Code:**
  - `src/styles/vision.css` (reduce page-only CSS)
  - `src/content/pages/vision.mdx` (use shared components/classes)
  - `public/assets/theme.css` (global tokens/utilities)
  - `src/components/ui/` (new primitives)
