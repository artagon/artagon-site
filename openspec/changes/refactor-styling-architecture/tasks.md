## 1. Implementation

### Phase 1: Audit & Planning

- [ ] 1.1 Audit `src/styles/vision.css` and classify reusable vs page-only rules.
  - [ ] 1.1.1 Inventory all card patterns (domain, pillar, component, product, vision)
  - [ ] 1.1.2 Inventory all grid layouts (three-domains, pillars-grid, components-grid, etc.)
  - [ ] 1.1.3 Inventory all gradient usages (count color-mix percentages: 5%, 8%, 10%, 20%)
  - [ ] 1.1.4 Inventory all border patterns (solid, subtle, accent)
  - [ ] 1.1.5 Inventory all spacing values (section, hero, card padding)
- [ ] 1.1.6 Document findings in `token-inventory.md` and summarize key decisions in `decisions.md`
- **Acceptance**: `token-inventory.md` updated with counts and approximate references

### Phase 2: Token Definition

- [ ] 1.2 Define theme tokens in `public/assets/theme.css` (see `decisions.md` Section 1).
  - [ ] 1.2.1 Add gradient tokens (--gradient-hero, --gradient-surface, --gradient-accent, --gradient-inline)
  - [ ] 1.2.2 Add spacing tokens (--spacing-section, --spacing-hero)
  - [ ] 1.2.3 Add border tokens (--border-teal-solid, --border-teal-subtle)
  - [ ] 1.2.4 Add radius tokens if missing (--radius-card: 12px, --radius-lg: 14px)
  - [ ] 1.2.5 Add color-mix fallbacks for browser compatibility (rgba values)
  - **Acceptance**: All tokens added with fallbacks; no visual changes when applied

- [ ] 1.3 Verify tokens across all themes (midnight, twilight, slate).
  - [ ] 1.3.1 Test midnight theme at 3 breakpoints (desktop, tablet, mobile)
  - [ ] 1.3.2 Test twilight theme at 3 breakpoints
  - [ ] 1.3.3 Test slate theme at 3 breakpoints
  - [ ] 1.3.4 Capture baseline screenshots (9 total: 3 themes × 3 breakpoints)
  - **Acceptance**: Tokens render consistently across all themes; screenshots saved

### Phase 3: Global Utilities

- [ ] 1.4 Promote shared utilities from Vision styles into `public/assets/theme.css` (with `ui-` prefix).
  - [ ] 1.4.1 Create `.ui-card` base class and variants (--default, --domain, --pillar, --component)
  - [ ] 1.4.2 Create `.ui-grid` with CSS custom property `--grid-min-width`
  - [ ] 1.4.3 Create `.ui-section-header`, `.ui-section-number`, `.ui-section-intro`
  - [ ] 1.4.4 Create `.ui-badge-number` utility for circular numbered badges
  - [ ] 1.4.5 Create `.ui-highlight-box` and `.ui-info-box` utilities
  - [ ] 1.4.6 Add focus-within states for accessibility
  - **Acceptance**: All utilities added; tested in isolation; documented in theme.css comments

### Phase 4: UI Components

- [ ] 1.5 Create `src/components/ui/` primitives that wrap global utilities.
  - [ ] 1.5.1 Create `Card.astro` with TypeScript interface (see `decisions.md` Section 3.1)
  - [ ] 1.5.2 Create `SectionHeader.astro` with title, number, intro props
  - [ ] 1.5.3 Create `FeatureList.astro` for styled lists (numbered, bulleted, feature)
  - [ ] 1.5.4 Add JSDoc documentation to each component
  - [ ] 1.5.5 Create `ui/index.ts` barrel export for convenience
  - **Acceptance**: All components type-safe; importable in MDX; documented with examples

### Phase 5: Vision Page Migration

- [ ] 1.6 Update `src/content/pages/vision.mdx` to use the new components/classes.
  - [ ] 1.6.1 Replace domain-card divs with `<Card variant="domain">` (3 instances)
  - [ ] 1.6.2 Replace pillar-card divs with `<Card variant="pillar">` (3 instances)
  - [ ] 1.6.3 Replace section-header divs with `<SectionHeader>` (11 instances)
  - [ ] 1.6.4 Replace feature lists with `<FeatureList>` component
  - [ ] 1.6.5 Update highlight-box/info-box to use `.ui-highlight-box` class
  - **Acceptance**: MDX compiles without errors; all components render correctly

- [ ] 1.7 Reduce `src/styles/vision.css` to page-only layout rules scoped under `.vision-doc`.
  - [ ] 1.7.1 Delete all card pattern rules (moved to theme.css)
  - [ ] 1.7.2 Delete all grid layout rules (moved to theme.css)
  - [ ] 1.7.3 Delete all section header rules (moved to theme.css)
  - [ ] 1.7.4 Delete all gradient definitions (replaced by tokens)
  - [ ] 1.7.5 Keep only Vision-specific layout rules under `.vision-doc`
  - [ ] 1.7.6 Scope remaining rules to prevent global leakage
  - **Acceptance**: vision.css reduced to < 250 lines; all rules scoped to `.vision-doc`

### Phase 6: Quality Assurance

- [ ] 1.8 Audit button styles to ensure they are driven by theme tokens (no hardcoded colors).
  - [ ] 1.8.1 Search vision.css for hardcoded color values (hex, rgb, rgba)
  - [ ] 1.8.2 Replace with theme tokens (--brand-teal, --brand-violet, etc.)
  - [ ] 1.8.3 Verify .cta and .btn classes use theme tokens
  - **Acceptance**: Zero hardcoded colors in vision.css; all use CSS variables

- [ ] 1.9 Run visual regression tests and verify pixel-perfect parity.
  - [ ] 1.9.1 Capture "after" screenshots (9 total: 3 themes × 3 breakpoints)
  - [ ] 1.9.2 Run pixel diff comparison (baseline vs after)
  - [ ] 1.9.3 Investigate and fix any visual differences > 2% pixel change
  - [ ] 1.9.4 Get stakeholder approval on screenshots
  - **Acceptance**: Pixel-perfect match (< 2% diff) across all 9 comparisons

- [ ] 1.10 Performance validation.
  - [ ] 1.10.1 Measure CSS bundle size (before: 70KB, target: ≤ 57KB)
  - [ ] 1.10.2 Measure gzipped CSS (target: ≤ 10KB)
  - [ ] 1.10.3 Measure vision page build time (target: < +10% delta)
  - [ ] 1.10.4 Run Lighthouse audit (Critical CSS target: < 15KB)
  - **Acceptance**: All performance targets met or exceeded

- [ ] 1.11 Accessibility audit.
  - [ ] 1.11.1 Run axe DevTools scan (target: 0 violations)
  - [ ] 1.11.2 Test keyboard navigation (all interactive elements reachable)
  - [ ] 1.11.3 Test screen reader (NVDA or VoiceOver - logical reading order)
  - [ ] 1.11.4 Verify color contrast (AA for normal, AAA for large text)
  - [ ] 1.11.5 Verify focus indicators visible on all cards/buttons
  - **Acceptance**: Lighthouse accessibility score ≥ 95; manual tests pass

### Phase 7: Documentation

- [ ] 1.12 Create developer documentation.
  - [ ] 1.12.1 Document component usage in `docs/guides/styling-guide.md`
  - [ ] 1.12.2 Document when to use components vs utilities (decision tree)
  - [ ] 1.12.3 Add examples for each component variant
  - [ ] 1.12.4 Document token naming conventions
  - [ ] 1.12.5 Create migration guide for future pages
  - **Acceptance**: Complete guide published; peer-reviewed

## 2. Success Metrics Summary

| Metric | Baseline | Target | Actual |
|--------|----------|--------|--------|
| CSS Bundle Size | 70KB | ≤ 57KB (-19%) | _TBD_ |
| Gzipped CSS | ~12KB | ≤ 10KB | _TBD_ |
| Vision Build Time | _TBD_ | < +10% | _TBD_ |
| Critical CSS | _TBD_ | < 15KB | _TBD_ |
| Lighthouse A11y | _TBD_ | ≥ 95 | _TBD_ |
| vision.css LOC | 1,014 | ≤ 250 | _TBD_ |
| Visual Regression | N/A | < 2% pixel diff | _TBD_ |

## 3. Utilities Promoted to theme.css

Document each utility as it's added:

- [ ] `.ui-card` - Base card container
- [ ] `.ui-card--domain` - Domain variant (3 uses in vision.mdx)
- [ ] `.ui-card--pillar` - Pillar variant (3 uses)
- [ ] `.ui-card--component` - Component variant (6+ uses)
- [ ] `.ui-card--product` - Product variant (3 uses)
- [ ] `.ui-grid` - Responsive grid with `--grid-min-width` custom property
- [ ] `.ui-section-header` - Section header flex container
- [ ] `.ui-section-number` - Large decorative number
- [ ] `.ui-section-intro` - Section intro paragraph
- [ ] `.ui-badge-number` - Circular numbered badge
- [ ] `.ui-highlight-box` - Gradient highlight callout
- [ ] `.ui-info-box` - Border info callout

## 4. Rollback Plan

If visual parity cannot be achieved:

1. Revert commits from Phase 5-6 (MDX and vision.css changes)
2. Keep Phase 2-4 changes (tokens, utilities, components) for future use
3. Document blockers in `decisions.md`
4. Reassess approach with team

**Rollback trigger**: > 5% pixel diff in visual regression OR stakeholder rejection
