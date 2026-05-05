## Context

The Vision page uses a large, page-scoped stylesheet in `src/styles/vision.css`. Many rules duplicate existing global utilities in `public/assets/theme.css` (cards, grids, section headers, feature lists). This change formalizes a shared style system so common patterns are reusable and theme tokens drive the visuals.

## Goals / Non-Goals

**Goals:**
- Reduce duplicated CSS by extracting shared utilities and components.
- Ensure gradients, borders, spacing, and typography are driven by theme tokens.
- Keep `/vision` visually identical after refactor.

**Non-Goals:**
- Visual redesign or copy changes.
- Refactoring unrelated pages beyond shared utilities.
- Introducing new CSS frameworks or dependencies.

## Decisions

- Reuse existing global utilities in `public/assets/theme.css` whenever possible.
- Promote new utilities only when they are shared across at least two sections or intended for reuse; prefer clear names or `ui-` prefixes for new globals.
- Keep page-only layout rules scoped under `.vision-doc` in `src/styles/vision.css` to prevent global leakage.
- Add `src/components/ui/` primitives (`Card`, `SectionHeader`, `FeatureList`) that wrap global utilities to reduce repetitive markup.
- Define theme tokens for hero gradients and accent borders in `public/assets/theme.css` and reference them in page styles/components.
- Avoid increasing selector specificity; prefer class-based utilities over nested selectors.

## Risks / Trade-offs

- Global utilities can unintentionally impact other pages.
  - Mitigation: keep page-only rules scoped and introduce new globals only with clear reuse intent.
- Componentization adds imports in MDX.
  - Mitigation: keep components small and focused on structure + classes.

## Migration Plan

1. Audit `src/styles/vision.css` and classify rules as reusable vs page-only.
2. Add or update shared utilities and tokens in `public/assets/theme.css`.
3. Build UI primitives in `src/components/ui/` and use them in `src/content/pages/vision.mdx`.
4. Reduce `src/styles/vision.css` to page-only layout rules scoped under `.vision-doc`.
5. Verify visual parity across all three themes (midnight, twilight, slate).
6. Run visual regression tests and remove unused classes once verified.

## Open Questions

- Open questions are tracked in `decisions.md` and are currently resolved.
