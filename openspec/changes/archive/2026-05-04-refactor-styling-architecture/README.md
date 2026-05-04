# Styling Architecture Refactoring - Draft Documentation

**Status**: Draft (pending OpenSpec approval)
**Last Updated**: 2025-12-30
**Branch**: `feature/site(19)-styling-architecture-spec`

---

Note: This README summarizes planning artifacts for the OpenSpec change. Component APIs,
tokens, metrics, and timelines are proposed until implementation is approved and completed.

## 📋 Overview

This change refactors the Vision page styling system to eliminate duplication and establish reusable design patterns for the entire Artagon site. The refactor consolidates recurring CSS patterns into a unified style system with theme tokens, utility classes, and reusable components.

---

## 📁 Documentation Structure

All documentation is in `openspec/changes/refactor-styling-architecture/`:

### Core Documents

1. **[proposal.md](./proposal.md)** - Original change proposal
   - Why: Problem statement and motivation
   - What: High-level changes
   - Impact: Affected specs and code

2. **[design.md](./design.md)** - Architecture and approach
   - Goals/Non-Goals
   - Key decisions
   - Risks and trade-offs
   - Migration plan

3. **[specs/style-system/spec.md](./specs/style-system/spec.md)** - Requirements
   - BDD-style requirements
   - Acceptance scenarios

4. **[tasks.md](./tasks.md)** - Implementation checklist ⭐
   - 7 phases with 45+ sub-tasks
   - Acceptance criteria for each task
   - Success metrics table
   - Rollback plan

### New Planning Documents

5. **[decisions.md](./decisions.md)** ⭐ NEW
   - **Answers to open questions**:
     - Canonical gradient token naming (Section 1)
     - Component vs utility strategy (Section 2)
     - Component API specifications (Section 3)
   - Browser compatibility strategy (Section 5)
   - Performance targets (Section 6)
   - Accessibility requirements (Section 7)

6. **[token-inventory.md](./token-inventory.md)** ⭐ NEW
   - **Draft inventory** of vision.css (approximate counts)
   - **6 token categories** inventoried:
     - Gradients (~29 color-mix usages)
     - Borders (~31 teal border declarations)
     - Spacing (~77 margin/padding/gap declarations)
     - Border radius (~29 usages)
     - Shadows (10+ usages)
     - Color opacity (estimate, 30+ usages)
   - Copy-paste ready token definitions
   - Migration strategy with find/replace patterns

7. **[styling-guide.md](/docs/guides/styling-guide.md)** ⭐ NEW
   - **Developer guide** for using the new system
   - Component vs utility decision tree
   - Theme token reference
   - UI component library documentation
   - Naming conventions
   - Best practices
   - Migration guide

8. **[validation-prompt.md](./validation-prompt.md)** ⭐ NEW
   - Measurement script for baselines and token counts
   - Pass/fail criteria for proposal approval

---

## 🎯 Quick Start for Implementation

### Pre-Implementation Checklist

Note: These items indicate planning artifacts exist; they do not imply implementation
approval or completion.

- [x] ✅ Open questions answered ([decisions.md](./decisions.md))
- [x] ✅ Token inventory complete ([token-inventory.md](./token-inventory.md))
- [x] ✅ Acceptance criteria defined ([tasks.md](./tasks.md))
- [x] ✅ Component API designed ([decisions.md](./decisions.md) Section 3)
- [x] ✅ Documentation created ([styling-guide.md](/docs/guides/styling-guide.md))
- [ ] ⏳ **Validation prompt run** ([validation instructions](./validation-prompt.md))
- [ ] ⏳ Team review and approval
- [ ] ⏳ Baseline screenshots captured

### Implementation Order

Follow [tasks.md](./tasks.md) phases:

1. **Phase 1: Audit** (1.1) - Inventory and classify styles
2. **Phase 2: Tokens** (1.2-1.3) - Add theme tokens, verify themes
3. **Phase 3: Utilities** (1.4) - Promote global utilities to theme.css
4. **Phase 4: Components** (1.5) - Create UI components
5. **Phase 5: Migration** (1.6-1.7) - Update vision.mdx, reduce vision.css
6. **Phase 6: QA** (1.8-1.11) - Visual regression, performance, accessibility
7. **Phase 7: Docs** (1.12) - Finalize documentation

---

## 📊 Success Metrics

Note: Baselines are measured; targets assume ~19% reduction and may be recalibrated during approval.

| Metric            | Baseline (measured) | Target          | Status |
| ----------------- | ------------------- | --------------- | ------ |
| CSS Bundle Size   | 43.0KB              | ≤ 35.0KB (~19%) | ⏳ TBD |
| Gzipped CSS       | 8.7KB               | ≤ 7.0KB (~19%)  | ⏳ TBD |
| vision.css LOC    | 1,013 lines         | ≤ 250 lines     | ⏳ TBD |
| Lighthouse A11y   | _TBD_               | ≥ 95            | ⏳ TBD |
| Visual Regression | N/A                 | < 2% pixel diff | ⏳ TBD |
| Build Time Delta  | Baseline            | < +10%          | ⏳ TBD |

---

## 🔑 Key Decisions Made

### 1. Gradient Token Strategy

**Decision**: Three-tier semantic naming

```css
--gradient-hero      /* 20% - Strong backgrounds */
--gradient-surface   /* 10% - Medium highlights */
--gradient-accent    /* 5% - Subtle overlays */
--gradient-inline    /* 8% - Border-left pattern */
```

**Rationale**: Semantic names describe intent, not implementation. Supports theme switching.

📄 **Details**: [decisions.md Section 1](./decisions.md#1-canonical-hero-gradient-token-naming)

---

### 2. Component vs Utility Hybrid

**Decision**: Provide BOTH for different contexts

- **Components** (Card.astro, SectionHeader.astro): For MDX, enforces structure
- **Utilities** (.ui-card, .ui-section-header): For HTML/layouts, flexibility

**Rationale**: MDX benefits from clean component syntax, layouts avoid import overhead.

📄 **Details**: [decisions.md Section 2](./decisions.md#2-component-vs-utility-strategy-for-sectionheader)

---

### 3. Naming Convention

**Decision**: `ui-*` prefix for all global utilities

```css
.ui-card              /* ✅ Prefixed */
.ui-section-header    /* ✅ Prefixed */
.vision-doc           /* ✅ Page-scoped */

.card                 /* ❌ Unprefixed - conflicts */
```

**Rationale**: Prevents naming collisions, clearly identifies global utilities.

📄 **Details**: [styling-guide.md Naming Conventions](/docs/guides/styling-guide.md#naming-conventions)

---

### 4. Browser Compatibility

**Decision**: Provide color-mix() fallbacks

```css
/* Fallback for older browsers */
--border-teal-subtle: 2px solid rgba(34, 227, 197, 0.2);

/* Modern override */
--border-teal-subtle: 2px solid
  color-mix(in srgb, var(--brand-teal) 20%, transparent);
```

**Rationale**: Supports Safari < 16.2, Firefox < 113 gracefully.

📄 **Details**: [decisions.md Section 5](./decisions.md#5-browser-compatibility-strategy)

---

## 🚀 Token Definitions (Copy-Paste Ready)

All tokens defined in [token-inventory.md](./token-inventory.md):

- **Gradients**: 5 tokens (hero, surface, accent, inline, vision-2030)
- **Borders**: 7 tokens (solid, subtle, faint, thick, left-accent)
- **Spacing**: 10 tokens (section, hero, card, gaps, margins)
- **Border Radius**: 6 tokens (card, lg, sm, xl, tiny, full)
- **Shadows**: 6 tokens (sm, md, lg, xl, glow-teal)
- **Color Opacity**: 15 tokens (teal-5 through teal-40, surface-teal-\*)

**Total**: ~50 new tokens to add to `public/assets/theme.css`

📄 **Copy tokens**: [token-inventory.md Sections 1-7](./token-inventory.md)

---

## 🧩 Component Library

### Planned Components

| Component         | Props                               | Usage Count   | Priority |
| ----------------- | ----------------------------------- | ------------- | -------- |
| **Card**          | variant, hover, badge, number       | 20+ instances | HIGH     |
| **SectionHeader** | title, number, intro                | 11 instances  | HIGH     |
| **FeatureList**   | variant (feature/numbered/bulleted) | 8 instances   | MEDIUM   |

### API Example

```typescript
// Card.astro
interface Props {
  variant?: "default" | "domain" | "pillar" | "component" | "product";
  hover?: boolean;
  badge?: string;
  badgeIcon?: string;
  number?: string | number;
  highlight?: boolean;
}
```

📄 **Full specs**: [decisions.md Section 3](./decisions.md#3-component-api-specifications)

---

## 📐 Architectural Principles

### Scope Boundaries

**In Scope**:

- ✅ Vision page styles (src/styles/vision.css)
- ✅ Global theme tokens (public/assets/theme.css)
- Planned UI component primitives (`src/components/ui/`)

**Out of Scope**:

- ❌ Visual redesign
- ❌ Refactoring other pages (beyond shared utilities)
- ❌ New CSS frameworks

### Risk Mitigation

| Risk                                | Mitigation                                                       |
| ----------------------------------- | ---------------------------------------------------------------- |
| Global utilities affect other pages | Prefer existing utilities; use `ui-` prefix; scope page rules    |
| Visual regression                   | Pixel diff testing across 9 scenarios (3 themes × 3 breakpoints) |
| Performance degradation             | Build time monitoring; CSS bundle size tracking                  |
| Browser compatibility               | color-mix() fallbacks for all tokens                             |

📄 **Full risk analysis**: [design.md Risks/Trade-offs](./design.md#risks--trade-offs)

---

## 🧪 Testing Strategy

### Visual Regression

**Required**: 9 screenshot comparisons

- 3 themes (midnight, twilight, slate)
- 3 breakpoints (desktop 1920, tablet 768, mobile 375)
- < 2% pixel difference threshold

### Accessibility Audit

**Required checks**:

- ✅ axe DevTools scan (0 violations)
- ✅ Keyboard navigation
- ✅ Screen reader (NVDA/VoiceOver)
- ✅ Color contrast (WCAG AA minimum)
- ✅ Focus indicators visible

### Performance Validation

**Targets**:

- CSS bundle: ≤ 35.0KB (~19% reduction)
- Gzipped CSS: ≤ 7.0KB (~19% reduction)
- Build time: < +10% delta
- Critical CSS: < 15KB
- Lighthouse score: ≥ 95

📄 **Full criteria**: [tasks.md Phase 6](./tasks.md#phase-6-quality-assurance)

---

## 🔄 Rollback Plan

If visual parity cannot be achieved:

1. ✅ Revert Phase 5-6 commits (MDX and vision.css changes)
2. ✅ Keep Phase 2-4 (tokens, utilities, components) for future use
3. ✅ Document blockers in decisions.md
4. ✅ Reassess approach with team

**Trigger**: > 5% pixel diff OR stakeholder rejection

📄 **Full plan**: [tasks.md Section 4](./tasks.md#4-rollback-plan)

---

## 📚 File Reference

### Files to Create

- [ ] `src/components/ui/Card.astro`
- [ ] `src/components/ui/SectionHeader.astro`
- [ ] `src/components/ui/FeatureList.astro`
- [ ] `src/components/ui/index.ts` (barrel export)

### Files to Modify

- [ ] `public/assets/theme.css` - Add ~150 lines of tokens
- [ ] `src/styles/vision.css` - Reduce from 1,013 → ~250 lines
- [ ] `src/content/pages/vision.mdx` - Replace divs with components

### Files to Review

- ✅ `openspec/changes/refactor-styling-architecture/proposal.md`
- ✅ `openspec/changes/refactor-styling-architecture/design.md`
- ✅ `openspec/changes/refactor-styling-architecture/specs/style-system/spec.md`
- ✅ `openspec/changes/refactor-styling-architecture/tasks.md`
- ✅ `openspec/changes/refactor-styling-architecture/decisions.md`
- ✅ `openspec/changes/refactor-styling-architecture/token-inventory.md`
- ✅ `docs/guides/styling-guide.md` (moved post-implementation)

---

## 💡 Next Steps

### For Developers

1. **Read**: [styling-guide.md](/docs/guides/styling-guide.md) - Understand system usage
2. **Review**: [token-inventory.md](./token-inventory.md) - See what tokens are available
3. **Implement**: Follow [tasks.md](./tasks.md) phases sequentially
4. **Reference**: [decisions.md](./decisions.md) - Check architectural decisions

### For Reviewers

1. **Approve**: Review decisions in [decisions.md](./decisions.md)
2. **Validate**: Check token naming in [token-inventory.md](./token-inventory.md)
3. **Verify**: Ensure acceptance criteria in [tasks.md](./tasks.md) are sufficient
4. **Baseline**: Capture screenshots before implementation starts

### For Stakeholders

1. **Context**: Read [proposal.md](./proposal.md) - Understand the "why"
2. **Impact**: Review [design.md](./design.md) - See risks and trade-offs
3. **Metrics**: Check success targets in [tasks.md Section 2](./tasks.md#2-success-metrics-summary)
4. **Approve**: Sign off on implementation plan

---

## Pre-Implementation Planning Status

| Requirement                | Status  | Document                                                            |
| -------------------------- | ------- | ------------------------------------------------------------------- |
| Open questions answered    | Draft   | [decisions.md](./decisions.md)                                      |
| Token inventory            | Draft   | [token-inventory.md](./token-inventory.md)                          |
| Acceptance criteria        | Draft   | [tasks.md](./tasks.md)                                              |
| Component API design       | Draft   | [decisions.md#3](./decisions.md#3-component-api-specifications)     |
| Developer documentation    | Draft   | [styling-guide.md](/docs/guides/styling-guide.md)                   |
| Browser compatibility      | Planned | [decisions.md#5](./decisions.md#5-browser-compatibility-strategy)   |
| Performance targets        | Draft   | [tasks.md#2](./tasks.md#2-success-metrics-summary)                  |
| Accessibility requirements | Draft   | [decisions.md#7](./decisions.md#7-accessibility-audit-requirements) |
| Rollback strategy          | Draft   | [tasks.md#4](./tasks.md#4-rollback-plan)                            |

**Overall Status**: Draft (awaiting approval)

---

## Validation Prompt

Run the validation steps in `validation-prompt.md` before approval. If results fall
outside tolerance, update `token-inventory.md` and the success metrics in `tasks.md`.

## 📞 Questions?

- **Architecture**: See [decisions.md](./decisions.md)
- **Token usage**: See [token-inventory.md](./token-inventory.md)
- **Implementation**: See [tasks.md](./tasks.md)
- **Developer guide**: See [styling-guide.md](/docs/guides/styling-guide.md)
- **Original proposal**: See [proposal.md](./proposal.md)
- **Validation**: Run prompt above to verify estimates

---

**Document Version**: 1.0
**Status**: Draft
**Ready for**: Validation → Team review and approval
