# Artagon Styling Guide

> Guide for implementing consistent, reusable styles across the Artagon site

Note: This guide is draft planning material for the `refactor-styling-architecture` change.
Components and tokens referenced here are proposed until implementation is completed.

## Table of Contents

1. [Component vs Utility Strategy](#component-vs-utility-strategy)
2. [Theme Tokens Reference](#theme-tokens-reference)
3. [UI Component Library](#ui-component-library)
4. [Naming Conventions](#naming-conventions)
5. [When to Create New Components](#when-to-create-new-components)
6. [Best Practices](#best-practices)

---

## Component vs Utility Strategy

### Decision Flow

Use this decision tree when styling new pages or features:

```
┌─────────────────────────────────┐
│ Need to style content?          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Is this used in MDX content?    │
└──Yes───────┴────────No──────────┘
      │                    │
      ▼                    ▼
┌─────────────┐   ┌──────────────────┐
│ Use         │   │ Continue to      │
│ COMPONENT   │   │ next question    │
└─────────────┘   └────────┬─────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │ Is structure always the same?   │
              └──Yes───────┴────────No──────────┘
                    │                    │
                    ▼                    ▼
              ┌─────────────┐   ┌──────────────┐
              │ Use         │   │ Use          │
              │ COMPONENT   │   │ UTILITIES    │
              └─────────────┘   └──────────────┘
```

### Quick Reference

| Scenario | Use | Example |
|----------|-----|---------|
| MDX content file | **Component** | `<Card variant="domain">...</Card>` |
| Astro layout file | **Utilities** | `<div class="ui-card ui-card--domain">` |
| Need prop validation | **Component** | TypeScript props with defaults |
| One-off variation | **Utilities** | Override individual CSS properties |
| Repeated strict pattern | **Component** | Enforces consistency |
| Performance critical (100+ instances) | **Utilities** | No component overhead |

---

## Component vs Utility Examples

### Example 1: Section Header

#### ✅ Use Component (in vision.mdx)

```mdx
---
title: "Vision Document"
---

<SectionHeader
  title="Executive Summary"
  number="01"
  intro="The digital landscape is in crisis...">

  <p>Section content goes here...</p>

</SectionHeader>
```

**Why**: Clean MDX syntax, enforces structure, fewer classes to remember.

#### ✅ Use Utilities (in layout.astro)

```astro
<section>
  <div class="ui-section-header">
    <h2>Executive Summary</h2>
    <div class="ui-section-number">01</div>
  </div>
  <p class="ui-section-intro">The digital landscape...</p>

  <!-- content -->
</section>
```

**Why**: Avoids component import in layout, flexible composition, no nesting overhead.

---

### Example 2: Cards

#### ✅ Use Component (in MDX)

```mdx
<Card variant="domain" badgeIcon="🔐">
  <h3>High-Assurance Identity</h3>
  <p>Phishing-resistant authentication built on modern protocols.</p>
</Card>
```

**Why**: Props handle badges/variants cleanly, enforces card structure.

#### ✅ Use Utilities (when you need custom structure)

```html
<div class="ui-card ui-card--domain">
  <div class="custom-layout">
    <!-- Non-standard card content -->
    <aside>...</aside>
    <main>...</main>
  </div>
</div>
```

**Why**: Component doesn't support this layout, utilities allow flexibility.

---

## Theme Tokens Reference

### Usage Pattern

Always prefer theme tokens over hardcoded values:

```css
/* ❌ BAD: Hardcoded values */
.my-card {
  background: linear-gradient(135deg, rgba(34, 227, 197, 0.1), #0f172a);
  border: 2px solid rgba(34, 227, 197, 0.2);
  padding: 32px;
  border-radius: 12px;
}

/* ✅ GOOD: Theme tokens */
.my-card {
  background: var(--gradient-surface);
  border: var(--border-teal-subtle);
  padding: var(--padding-card);
  border-radius: var(--radius-card);
}
```

### Available Tokens

#### Gradients

| Token | Visual | Use Case |
|-------|--------|----------|
| `--gradient-hero` | 20% strong | Page heroes, section backgrounds |
| `--gradient-surface` | 10% medium | Card highlights, emphasized sections |
| `--gradient-accent` | 5% subtle | Subtle overlays, accents |
| `--gradient-inline` | 8% specialized | Border-left highlight boxes |

```css
.hero {
  background: var(--gradient-hero);
}

.card-highlight {
  background: var(--gradient-surface);
}
```

#### Borders

| Token | Value | Use Case |
|-------|-------|----------|
| `--border-teal-solid` | 2px solid teal | Primary borders, emphasis |
| `--border-teal-solid-thick` | 4px solid teal | Left accent borders |
| `--border-teal-subtle` | 2px 20% opacity | Standard card borders |
| `--border-teal-subtle-thin` | 1px 20% opacity | Subtle dividers |
| `--border-teal-faint` | 1px 10% opacity | Minimal separation |

```css
.card {
  border: var(--border-teal-subtle);
}

.highlight-box {
  border-left: var(--border-left-accent);
}
```

#### Spacing

| Token | Value | Use Case |
|-------|-------|----------|
| `--spacing-section` | 5rem (80px) | Section margin-top/bottom |
| `--spacing-hero-block` | 80px 20px 60px | Hero section padding |
| `--padding-card` | 2rem (32px) | Standard card padding |
| `--padding-card-compact` | 1.5rem (24px) | Compact cards |
| `--gap-large` | 2rem (32px) | Grid gaps |
| `--gap-medium` | 1.5rem (24px) | Standard gaps |
| `--gap-small` | 1rem (16px) | Tight spacing |

```css
.section {
  margin: var(--spacing-section) 0;
}

.card-grid {
  gap: var(--gap-large);
}
```

#### Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--radius-card` | 12px | Standard cards |
| `--radius-lg` | 14px | Large cards, emphasized |
| `--radius-sm` | 8px | Small elements |
| `--radius-xl` | 16px | Extra large sections |
| `--radius-full` | 999px | Pills, badges, circular |

```css
.card {
  border-radius: var(--radius-card);
}

.badge {
  border-radius: var(--radius-full);
}
```

#### Shadows

| Token | Elevation | Use Case |
|-------|-----------|----------|
| `--shadow-sm` | Low | Subtle lift |
| `--shadow-md` | Medium | Standard cards |
| `--shadow-lg` | High | Hover states |
| `--shadow-xl` | Extra high | Emphasized hover |
| `--shadow-glow-teal` | Colored | Teal glow effect |

```css
.card {
  box-shadow: var(--shadow-md);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}
```

#### Color Opacity

| Token | Opacity | Use Case |
|-------|---------|----------|
| `--teal-5` | 5% | Very subtle tint |
| `--teal-10` | 10% | Subtle backgrounds |
| `--teal-20` | 20% | Standard borders/backgrounds |
| `--teal-30` | 30% | Emphasized elements |
| `--surface-teal-8` | 8% on surface | Surface highlights |
| `--surface-teal-15` | 15% on surface | Table headers |

```css
.subtle-bg {
  background: var(--surface-teal-8);
}

.border {
  border-color: var(--teal-20);
}
```

---

## UI Component Library

### Planned Components

Planned components will live in `src/components/ui/` once implemented. For MDX files under
`src/content/pages`, use a relative import path:

```mdx
---
title: "My Page"
---
import { Card, SectionHeader, FeatureList } from '../../components/ui';

<SectionHeader title="Overview" number="01">
  <Card variant="domain">
    <h3>Title</h3>
  </Card>
</SectionHeader>
```

### Card Component

**Planned file**: `src/components/ui/Card.astro`

**Props**:
```typescript
interface Props {
  variant?: 'default' | 'domain' | 'pillar' | 'component' | 'product' | 'vision' | 'solid';
  hover?: boolean;           // Enable hover lift (default: true)
  badge?: string;            // Badge text (top-right)
  badgeIcon?: string;        // Badge icon/emoji
  highlight?: boolean;       // Accent border/background
  number?: string | number;  // Circular number badge (left)
  class?: string;            // Additional classes
  className?: string;        // Additional classes
}
```

**Examples**:

```mdx
<!-- Basic card -->
<Card>
  <h3>Simple Card</h3>
  <p>Content here</p>
</Card>

<!-- Domain card with icon badge -->
<Card variant="domain" badgeIcon="🔐">
  <h3>High-Assurance Identity</h3>
  <p>Phishing-resistant authentication...</p>
</Card>

<!-- Pillar card with number -->
<Card variant="pillar" number="1">
  <h4>Verifiable Everything</h4>
  <p>Cryptographically verified identities...</p>
</Card>

<!-- Highlighted component card -->
<Card variant="component" badge="4.6" highlight>
  <h3>Advanced Delegation Engine</h3>
  <p>The capstone feature...</p>
</Card>

<!-- Disable hover effect -->
<Card hover={false}>
  <p>Static card</p>
</Card>

<!-- Solid card -->
<Card variant="solid" className="mission-statement">
  <p>Trusted Identity for Machines and Humans - Verified, Private, Attested</p>
</Card>
```

**Utility Class Equivalent**:

```html
<div class="ui-card ui-card--domain ui-card--hover">
  <div class="ui-card-badge-icon">🔐</div>
  <h3>High-Assurance Identity</h3>
  <p>Content...</p>
</div>
```

---

### SectionHeader Component

**Planned file**: `src/components/ui/SectionHeader.astro`

**Props**:
```typescript
interface Props {
  title: string;
  number?: string;      // Section number (e.g., "01")
  intro?: string;       // Section intro paragraph
  id?: string;          // Optional anchor id
  class?: string;
  className?: string;
}
```

**Examples**:

```mdx
<!-- Basic section header -->
<SectionHeader id="executive-summary" title="Executive Summary" number="01">
  <!-- Section content -->
</SectionHeader>

<!-- With intro text -->
<SectionHeader
  title="Product Vision"
  number="02"
  intro="The Artagon mission is a deliberate synthesis...">
  <!-- Content -->
</SectionHeader>

<!-- No number -->
<SectionHeader title="Additional Information">
  <!-- Content -->
</SectionHeader>
```

**Utility Class Equivalent**:

```html
<section>
  <div class="ui-section-header">
    <h2>Executive Summary</h2>
    <div class="ui-section-number">01</div>
  </div>
  <p class="ui-section-intro">The Artagon mission...</p>

  <!-- content -->
</section>
```

---

### FeatureList Component

**Planned file**: `src/components/ui/FeatureList.astro`

**Props**:
```typescript
interface Props {
  variant?: 'feature' | 'numbered' | 'bulleted';
  class?: string;
  className?: string;
}
```

**Examples**:

```mdx
<!-- Feature list (arrow bullets) -->
<FeatureList variant="feature">
  - **Protocol Unification**: OIDC 2.1 & GNAP
  - **Hardened Security**: PAR, JAR, JARM, DPoP
  - **Passkey-Primary**: WebAuthn/FIDO2
</FeatureList>

<!-- Numbered list (circular badges) -->
<FeatureList variant="numbered">
  1. **High-Assurance by Default**: Security for all tenants
  2. **Cryptographic Agility**: Modular Rust sidecars
  3. **Policy-as-Code**: Git-backed policies
</FeatureList>

<!-- Bulleted list (large bullets) -->
<FeatureList variant="bulleted">
  - Native Verifiable Credentials
  - Machine identity parity
  - Graph-native authorization
</FeatureList>
```

---

## Naming Conventions

### Utility Class Naming

All new global utilities use the `ui-*` prefix to prevent conflicts:

```css
/* ✅ GOOD: ui- prefix */
.ui-card { ... }
.ui-section-header { ... }
.ui-badge-number { ... }

/* ❌ BAD: No prefix (risks collision) */
.card { ... }
.section-header { ... }
.badge { ... }
```

### BEM Modifiers

Use BEM-style modifiers for variants:

```css
/* Base component */
.ui-card { ... }

/* Variant modifiers */
.ui-card--domain { ... }
.ui-card--pillar { ... }
.ui-card--component { ... }

/* State modifiers */
.ui-card--hover { ... }
.ui-card--highlight { ... }
```

### Page-Specific Scoping

Page-specific styles use the page name as prefix and remain in page CSS file:

```css
/* In src/styles/vision.css */
.vision-doc { ... }
.vision-hero-unique-layout { ... }

/* ❌ WRONG: Generic names in page CSS */
.card { ... }  /* Will affect other pages */
.hero { ... }  /* Conflicts with global */
```

---

## When to Create New Components

### Create a Component When...

1. **Pattern is used 3+ times** across pages
2. **Structure is complex** (5+ nested elements)
3. **Props would improve DX** (variants, conditional rendering)
4. **You want type safety** in MDX
5. **Pattern needs encapsulation** (internal state, logic)

### Create a Utility Class When...

1. **Pattern is simple** (1-2 CSS properties)
2. **Need flexible composition** (mix with other classes)
3. **Performance critical** (avoid component overhead)
4. **Used in non-MDX contexts** (layouts, templates)
5. **One-off variations** common

### Example Decision

**Scenario**: Need a "highlight box" for callouts.

**Structure**:
```html
<div class="highlight-box">
  <p>Important information</p>
</div>
```

**CSS**:
```css
.highlight-box {
  background: var(--gradient-inline);
  border-left: var(--border-left-accent);
  padding: var(--padding-card-compact);
  border-radius: var(--radius-sm);
}
```

**Decision**: **Utility class** ✅
- Simple structure (single div)
- No props needed (content is just `<slot/>`)
- Used in both MDX and HTML
- Easy to override (e.g., custom padding)

---

## Best Practices

### 1. Always Use Theme Tokens

```css
/* ❌ BAD */
.my-element {
  color: #22e3c5;
  padding: 32px;
  border-radius: 12px;
}

/* ✅ GOOD */
.my-element {
  color: var(--brand-teal);
  padding: var(--padding-card);
  border-radius: var(--radius-card);
}
```

**Why**: Tokens ensure consistency, support theme switching, and reduce duplication.

---

### 2. Test Across All Themes

Artagon has 3 themes. Always verify visuals in:
1. **Midnight** (default)
2. **Twilight** (indigo variant)
3. **Slate** (blue variant)

**How**: Use theme toggle in header, or manually add `data-theme` attribute:

```html
<html data-theme="midnight">  <!-- Default -->
<html data-theme="twilight">  <!-- Alt 1 -->
<html data-theme="slate">     <!-- Alt 2 -->
```

---

### 3. Provide color-mix() Fallbacks

For browser compatibility (Safari < 16.2, Firefox < 113):

```css
:root {
  /* Fallback for older browsers */
  --border-teal-subtle: 2px solid rgba(34, 227, 197, 0.2);

  /* Modern override (only in supporting browsers) */
  --border-teal-subtle: 2px solid color-mix(in srgb, var(--brand-teal) 20%, transparent);
}
```

**Why**: Ensures graceful degradation. Modern browsers use color-mix(), older browsers use rgba fallback.

---

### 4. Maintain Accessibility

All interactive components must have:

- ✅ Visible focus states (`:focus-visible`)
- ✅ Sufficient color contrast (WCAG AA minimum)
- ✅ Keyboard navigation support
- ✅ ARIA labels where appropriate

```css
/* ✅ GOOD: Focus state */
.ui-card:focus-within {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* ✅ GOOD: Hover doesn't break focus */
.ui-card--hover:hover {
  transform: translateY(-4px);
  outline-offset: 4px; /* Increase offset on transform */
}
```

---

### 5. Document Custom Components

Every component in `src/components/ui/` should have JSDoc:

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
 * </Card>
 *
 * @see public/assets/theme.css for .ui-card utility classes
 */
export interface Props {
  variant?: 'default' | 'domain' | 'pillar';
  badgeIcon?: string;
}
---
```

---

### 6. Performance Considerations

**Component overhead**: Each Astro component adds ~50-100 bytes to build output.

**When to optimize**:
- **< 10 instances**: Component overhead negligible
- **10-50 instances**: Monitor build time
- **50+ instances**: Consider utilities for performance

**Example**: If you have 100 cards, the component approach adds ~5-10KB to build. This is usually acceptable, but for critical pages, utilities may be better.

---

### 7. Migration Pattern

When refactoring existing pages:

1. **Add utilities to theme.css** first
2. **Test utilities in isolation** (single element)
3. **Create component** that uses utilities
4. **Migrate incrementally** (one section at a time)
5. **Verify visuals** after each section
6. **Remove old CSS** only when verified

**Never**: Delete old CSS and rewrite everything at once.

---

## Quick Reference Cheat Sheet

| Need | Use | Location |
|------|-----|----------|
| Card in MDX | `<Card variant="domain">` | Import from `../../components/ui` |
| Card in HTML | `.ui-card .ui-card--domain` | `public/assets/theme.css` |
| Section header | `<SectionHeader title="..." number="01">` | Import from `../../components/ui` |
| Gradient bg | `background: var(--gradient-surface);` | CSS token |
| Border | `border: var(--border-teal-subtle);` | CSS token |
| Spacing | `padding: var(--padding-card);` | CSS token |
| Custom token | Add to `:root` in `theme.css` | `public/assets/theme.css` |
| Page-specific style | Scope under `.page-name` | `src/styles/page-name.css` |

---

## Migration Guide

### Migrating a Page to New System

**Step-by-step example**: Migrate a hypothetical "About" page

1. **Audit current styles** (src/styles/about.css)
   - Identify reusable patterns (cards, grids, sections)
   - Identify page-specific layout rules

2. **Extract to utilities** (if not already in theme.css)
   ```css
   /* In theme.css */
   .ui-team-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
     gap: var(--gap-large);
   }
   ```

3. **Create components** (if pattern is complex)
   ```astro
   <!-- src/components/ui/TeamMember.astro -->
   <div class="ui-card ui-card--team">
     <slot />
   </div>
   ```

4. **Update MDX** (src/content/pages/about.mdx)
   ```mdx
   import { TeamMember } from '../../components/ui';

   <div class="ui-team-grid">
     <TeamMember>
       <h3>John Doe</h3>
       <p>CEO</p>
     </TeamMember>
   </div>
   ```

5. **Reduce page CSS** (src/styles/about.css)
   - Delete extracted utilities
   - Keep only `.about-doc` scoped layout rules

6. **Verify**
   - Visual regression (screenshots)
   - All 3 themes
   - All breakpoints (mobile, tablet, desktop)

---

## Additional Resources

- **Token Inventory**: See `openspec/changes/refactor-styling-architecture/token-inventory.md`
- **Architecture Decisions**: See `openspec/changes/refactor-styling-architecture/decisions.md`
- **Implementation Tasks**: See `openspec/changes/refactor-styling-architecture/tasks.md`
- **Theme CSS**: `public/assets/theme.css` (source of truth for tokens)
- **UI Components**: `src/components/ui/` (planned reusable components)

---

**Last Updated**: 2025-12-30
**Version**: 1.0 (Initial styling refactor)
