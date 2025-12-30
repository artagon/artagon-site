# Styling Refactoring Architecture Decisions

## 1. Canonical Hero Gradient Token Naming

### Analysis
Analyzed `src/styles/vision.css` gradient usage:
- **135deg gradient with color-mix (10%)**: 8 occurrences (most common)
- **135deg gradient with color-mix (20%)**: 4 occurrences (hero backgrounds)
- **135deg gradient with color-mix (5-8%)**: 6 occurrences (subtle accents)

### Decision: Three-Tier Semantic Naming

```css
/* In public/assets/theme.css :root */

/* Hero/Section Backgrounds - Strong gradient for page heroes */
--gradient-hero: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 20%, var(--bg)) 0%,
  var(--bg) 100%
);

/* Surface Highlights - Medium gradient for card/section emphasis */
--gradient-surface: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 10%, var(--surface)),
  var(--surface)
);

/* Accent Overlays - Subtle gradient for borders/highlights */
--gradient-accent: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 5%, var(--surface)),
  var(--surface)
);

/* Specialized: Border-left accent pattern (used in highlight-box, value-item, etc.) */
--gradient-inline: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 8%, var(--surface)),
  var(--surface)
);
```

### Rationale
- **Semantic names** describe intent, not implementation
- **Three tiers** map to visual hierarchy (strong → medium → subtle)
- **Specialized variant** for border-left pattern (appears 8x)
- **Fallback strategy**: Each includes explicit percentage for clarity

### Migration Path
1. Add tokens to theme.css
2. Replace in vision.css via find/replace
3. Test across midnight, twilight, slate themes
4. Verify color-mix() renders consistently

---

## 2. Component vs Utility Strategy for SectionHeader

### Decision: Hybrid Approach (Both Component + Utility)

**Create BOTH for different use cases:**

#### 2.1 Component: `SectionHeader.astro`
**Use for**: MDX content files (vision.mdx, future marketing pages)

```astro
---
// src/components/ui/SectionHeader.astro
interface Props {
  title: string;
  number?: string;
  intro?: string;
  className?: string;
}
const { title, number, intro, className = '' } = Astro.props;
---
<section class={`ui-section ${className}`}>
  <div class="ui-section-header">
    <h2>{title}</h2>
    {number && <div class="ui-section-number">{number}</div>}
  </div>
  {intro && <p class="ui-section-intro">{intro}</p>}
  <slot />
</section>
```

**Usage in vision.mdx:**
```mdx
<SectionHeader
  title="Executive Summary"
  number="01"
  intro="The digital landscape is in crisis...">
  <!-- section content -->
</SectionHeader>
```

#### 2.2 Utility Classes: `.ui-section-header`, `.ui-section-number`, `.ui-section-intro`
**Use for**: Direct HTML templates, Astro layouts, non-MDX pages

```css
/* In public/assets/theme.css */
.ui-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
  gap: 2rem;
}

.ui-section-header h2 {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  color: var(--brand-teal);
  margin: 0;
  font-weight: 700;
  flex: 1;
}

.ui-section-number {
  font-size: 4rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--brand-teal) 20%, transparent);
  line-height: 1;
  flex-shrink: 0;
}

.ui-section-intro {
  font-size: 1.15rem;
  color: var(--muted);
  margin-bottom: 2rem;
  line-height: 1.6;
}
```

**Usage in HTML:**
```html
<section>
  <div class="ui-section-header">
    <h2>Executive Summary</h2>
    <div class="ui-section-number">01</div>
  </div>
  <p class="ui-section-intro">The digital landscape...</p>
</section>
```

### Rationale
- **Component advantages**: Encapsulation, prop validation, MDX convenience
- **Utility advantages**: No import overhead, flexibility, composability
- **Developer choice**: Pick the right tool for context
- **No duplication**: Component uses utility classes internally
- **Migration friendly**: Existing HTML can adopt utilities without rewrite

### When to Use Which?

| Context | Use | Reason |
|---------|-----|--------|
| MDX files (vision.mdx) | Component | Cleaner syntax, fewer classes in markup |
| Astro layouts | Utilities | Avoid circular imports, reduce nesting |
| One-off variations | Utilities | Override individual properties easily |
| Consistent patterns | Component | Enforces structure, reduces errors |
| Performance-critical | Utilities | No component overhead |

---

## 3. Component API Specifications

### 3.1 Card Component

```astro
---
// src/components/ui/Card.astro
export interface Props {
  /** Visual variant determines styling preset */
  variant?: 'default' | 'domain' | 'pillar' | 'component' | 'product' | 'vision';

  /** Enable hover lift effect (default: true) */
  hover?: boolean;

  /** Optional badge text (positioned top-right) */
  badge?: string;

  /** Badge icon (emoji or HTML entity) */
  badgeIcon?: string;

  /** Highlight accent (strengthens border/background) */
  highlight?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Numbered badge (circular, positioned left for pillar variant) */
  number?: string | number;
}

const {
  variant = 'default',
  hover = true,
  badge,
  badgeIcon,
  highlight = false,
  className = '',
  number
} = Astro.props;

const classes = [
  'ui-card',
  `ui-card--${variant}`,
  hover && 'ui-card--hover',
  highlight && 'ui-card--highlight',
  className
].filter(Boolean).join(' ');
---

<div class={classes}>
  {badge && <div class="ui-card-badge">{badge}</div>}
  {badgeIcon && <div class="ui-card-badge-icon">{badgeIcon}</div>}
  {number && <div class="ui-card-number">{number}</div>}
  <slot />
</div>
```

**Usage examples:**
```mdx
<!-- Domain card (from vision.mdx line 37) -->
<Card variant="domain" badgeIcon="🔐">
  <h3>High-Assurance Identity</h3>
  <p>Phishing-resistant authentication...</p>
</Card>

<!-- Pillar card with number (line 57) -->
<Card variant="pillar" number="1">
  <h4>Verifiable Everything</h4>
  <p>Every identity can be cryptographically verified...</p>
</Card>

<!-- Highlighted component card (line 227) -->
<Card variant="component" badge="4.6" highlight>
  <h3>Advanced Delegation Engine</h3>
  <p>The capstone feature...</p>
</Card>
```

### 3.2 Utility Class Naming Convention

**Prefix Strategy**: All new global utilities use `ui-*` prefix

| Pattern | Class Name | Purpose |
|---------|-----------|---------|
| Card variants | `.ui-card`, `.ui-card--domain` | Reusable card container |
| Section structure | `.ui-section-header`, `.ui-section-number` | Page section layout |
| Grid layouts | `.ui-grid`, `.ui-grid-2`, `.ui-grid-3` | Responsive grid containers |
| Badges | `.ui-badge-number`, `.ui-badge-icon` | Circular numbered/icon badges |
| Highlights | `.ui-highlight-box`, `.ui-info-box` | Callout boxes |
| Lists | `.ui-feature-list`, `.ui-numbered-list` | Styled list containers |

**Page-scoped classes**: Keep `.vision-doc` prefix for Vision-only rules

---

## 4. Documentation Strategy

### 4.1 Component Documentation Template

Each component in `src/components/ui/` includes JSDoc:

```astro
---
/**
 * Card component - Reusable container for content with multiple visual variants.
 *
 * @example Basic usage
 * <Card>
 *   <h3>Title</h3>
 *   <p>Content</p>
 * </Card>
 *
 * @example Domain variant with badge
 * <Card variant="domain" badgeIcon="🔐">
 *   <h3>Security Feature</h3>
 *   <p>Description</p>
 * </Card>
 *
 * @see public/assets/theme.css for .ui-card utility classes
 */
export interface Props { /* ... */ }
---
```

### 4.2 Component vs Utility Decision Tree

**Create**: `openspec/changes/refactor-styling-architecture/styling-guide.md`

```markdown
# When to Use Components vs Utilities

## Decision Flow

1. **Is this used in MDX?**
   - YES → Prefer Component (cleaner syntax)
   - NO → Continue to step 2

2. **Is the structure always the same?**
   - YES → Component (enforces consistency)
   - NO → Utilities (flexible composition)

3. **Is performance critical? (e.g., hundreds of instances)**
   - YES → Utilities (no component overhead)
   - NO → Either works

4. **Do you need prop validation or logic?**
   - YES → Component required
   - NO → Utilities sufficient

## Examples

### Use Component
- MDX content pages (vision.mdx)
- Repeated patterns with strict structure
- When you want TypeScript props

### Use Utilities
- Astro layouts and base templates
- One-off variations of patterns
- When you need to override individual properties
```

---

## 5. Browser Compatibility Strategy

### Issue: `color-mix()` Support

**Current usage**: 60+ instances in vision.css

**Browser support**:
- ✅ Chrome 111+ (March 2023)
- ✅ Firefox 113+ (May 2023)
- ✅ Safari 16.2+ (December 2022)
- ❌ Older browsers: No support, no graceful degradation

### Decision: Progressive Enhancement with Fallbacks

**Strategy 1: CSS Custom Property Fallbacks** (Recommended)

```css
:root {
  /* Fallback for older browsers */
  --brand-teal-20: rgba(34, 227, 197, 0.2);
  --brand-teal-10: rgba(34, 227, 197, 0.1);

  /* Modern browsers override */
  --brand-teal-20: color-mix(in srgb, var(--brand-teal) 20%, transparent);
  --brand-teal-10: color-mix(in srgb, var(--brand-teal) 10%, transparent);
}

.ui-card {
  /* Fallback border */
  border: 2px solid rgba(34, 227, 197, 0.2);
  /* Modern override */
  border: 2px solid var(--brand-teal-20);
}
```

**Strategy 2: PostCSS Plugin** (If build complexity acceptable)

Add `@csstools/postcss-color-mix-function` to build pipeline.

**Recommendation**: Use Strategy 1 (fallback variables) for simplicity.

---

## 6. Performance Targets

### Acceptance Criteria

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| **CSS Bundle Size** | 70KB (uncompressed) | ≤ 57KB (19% reduction) | `wc -c src/styles/vision.css public/assets/theme.css` |
| **Gzipped CSS** | ~12KB | ≤ 10KB | `gzip -c file.css \| wc -c` |
| **Vision Page Build Time** | Baseline TBD | < +10% delta | `astro build --verbose` |
| **Critical CSS** | Not measured | < 15KB | Lighthouse audit |
| **Component Overhead** | 0 imports | ≤ 5 components | Count in vision.mdx |

### Visual Regression Tests

**Required screenshots (all must match pixel-perfect)**:

1. **Midnight theme**:
   - Desktop (1920×1080)
   - Tablet (768×1024)
   - Mobile (375×667)

2. **Twilight theme**: Same breakpoints

3. **Slate theme**: Same breakpoints

**Total**: 9 screenshots × 2 states (before/after) = 18 comparisons

**Tool options**:
- Percy.io (paid, CI integration)
- Chromatic (Storybook integration)
- Manual: Playwright screenshot diff
- Fallback: Manual side-by-side comparison

---

## 7. Accessibility Audit Requirements

### Current Gaps (Identified in vision.css)

1. **Focus states**: Only global `:focus-visible` (theme.css:479)
2. **Keyboard navigation**: No `:focus-within` for card groups
3. **Color contrast**: Not validated for all theme combinations
4. **ARIA**: No landmark roles on sections

### Required Checks (Before/After)

| Check | Tool | Pass Criteria |
|-------|------|---------------|
| Automated scan | axe DevTools | 0 violations |
| Keyboard navigation | Manual | All interactive elements reachable |
| Screen reader | NVDA/VoiceOver | Logical reading order maintained |
| Color contrast | Lighthouse | AA for normal text, AAA for large text |
| Focus indicators | Manual | Visible on all interactive elements |

### Component-Specific Requirements

```css
/* Add to ui-card variants */
.ui-card:focus-within {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.ui-card--hover:hover {
  /* Ensure hover transforms don't break focus */
  outline-offset: 4px; /* Increase offset on transform */
}
```

---

## Summary: Planning Artifacts

- [x] Canonical gradient tokens defined (Section 1)
- [x] Component vs utility strategy documented (Section 2)
- [x] Component API specifications drafted (Section 3)
- [x] Browser compatibility strategy (Section 5)
- [x] Performance targets defined (Section 6)
- [x] Accessibility requirements (Section 7)
- [x] Tasks and acceptance criteria captured in `tasks.md`
- [x] Token inventory drafted in `token-inventory.md`
- [x] Developer guide drafted in `openspec/changes/refactor-styling-architecture/styling-guide.md`

**Status**: Draft decisions; keep in sync with tasks and inventory during implementation.
