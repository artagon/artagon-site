## 1. Implementation

- [ ] 1.1 Audit `src/styles/vision.css` and classify reusable vs page-only rules.
- [ ] 1.2 Create `src/components/ui/` primitives (`Card`, `SectionHeader`, `FeatureList`) that wrap global utilities.
- [ ] 1.3 Define or refine theme tokens for hero gradients, borders, and spacing in `public/assets/theme.css`.
- [ ] 1.4 Promote shared utilities from Vision styles into `public/assets/theme.css` (with clear names/prefixes).
- [ ] 1.5 Update `src/content/pages/vision.mdx` to use the new components/classes.
- [ ] 1.6 Reduce `src/styles/vision.css` to page-only layout rules scoped under `.vision-doc`.
- [ ] 1.7 Audit button styles to ensure they are driven by theme tokens (no hardcoded colors in Vision CSS).
- [ ] 1.8 Verify visual parity across themes (midnight, twilight, slate) and run visual regression tests.
