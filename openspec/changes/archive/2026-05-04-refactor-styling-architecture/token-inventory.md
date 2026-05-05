# Draft Theme Token Inventory

Draft inventory of CSS values in `src/styles/vision.css` targeted for tokenization.
Counts and line numbers are approximate; update during the Phase 1 audit.

## 1. Gradient Tokens

### Current State Analysis

| Pattern | Count | Approx Line Numbers | Percentage |
|---------|-------|---------------------|------------|
| `color-mix(..., 20%, ...)` | 15 | various | 20% |
| `color-mix(..., 10%, ...)` | 3 | various | 10% |
| `color-mix(..., 8%, ...)` | 4 | various | 8% |
| `color-mix(..., 5%, ...)` | 1 | various | 5% |
| `color-mix(..., 15%, ...)` | 3 | various | 15% |
| `color-mix(..., 6%, ...)` | 1 | various | 6% |

Total color-mix occurrences (all percentages): 29. Additional 30% usages appear outside the table (2 occurrences).

### Recommended Tokens

```css
/* ============================================
   GRADIENT TOKENS
   ============================================ */

/* Hero sections and page headers (strongest) */
--gradient-hero: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 20%, var(--bg)) 0%,
  var(--bg) 100%
);

/* Hero fallback for older browsers */
--gradient-hero-fallback: linear-gradient(
  135deg,
  rgba(34, 227, 197, 0.2) 0%,
  var(--bg) 100%
);

/* Surface highlights - cards, sections (medium) */
--gradient-surface: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 10%, var(--surface)),
  var(--surface)
);

--gradient-surface-fallback: linear-gradient(
  135deg,
  rgba(34, 227, 197, 0.1),
  var(--surface)
);

/* Accent overlays - subtle backgrounds (low) */
--gradient-accent: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 5%, var(--surface)),
  var(--surface)
);

--gradient-accent-fallback: linear-gradient(
  135deg,
  rgba(34, 227, 197, 0.05),
  var(--surface)
);

/* Inline highlights - border-left pattern (specialized) */
--gradient-inline: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 8%, var(--surface)),
  var(--surface)
);

--gradient-inline-fallback: linear-gradient(
  135deg,
  rgba(34, 227, 197, 0.08),
  var(--surface)
);

/* Vision 2030 section (unique) */
--gradient-vision-2030: linear-gradient(
  135deg,
  color-mix(in srgb, var(--brand-teal) 6%, var(--surface)),
  transparent
);

--gradient-vision-2030-fallback: linear-gradient(
  135deg,
  rgba(34, 227, 197, 0.06),
  transparent
);
```

### Usage Mapping

| vision.css Class | Current Gradient | New Token |
|------------------|------------------|-----------|
| `.hero-section` (approx line 9) | 20% bg | `--gradient-hero` |
| `.highlight-box` (approx line 108) | 10% surface | `--gradient-surface` |
| `.value-item` (approx line 256) | 5% surface | `--gradient-accent` |
| `.component-card.highlight` (approx line 378) | 8% surface | `--gradient-inline` |
| `.use-case-scenario` (approx line 508) | 8% surface | `--gradient-inline` |
| `.phase-kpi` (approx line 612) | 8% surface | `--gradient-inline` |
| `.vision-2030` (approx line 618) | 6% surface | `--gradient-vision-2030` |
| `.closing-statement` (approx line 653) | 8% surface | `--gradient-inline` |

---

## 2. Border Tokens

### Current State Analysis

| Pattern | Count | Example Line Numbers | Usage |
|---------|-------|---------------------|-------|
| `2px solid var(--brand-teal)` | 2 | various | Solid accent |
| `2px solid color-mix(..., 20%, transparent)` | 13 | various | Subtle border |
| `1px solid color-mix(..., 20%, transparent)` | 2 | various | Thin subtle border |
| `4px solid var(--brand-teal)` | 6 | various | Thick left accent |
| `1px solid color-mix(..., 10%, transparent)` | 2 | various | Very subtle border |
| `1px solid color-mix(..., 15%, transparent)` | 1 | various | Subtle table border |

### Recommended Tokens

```css
/* ============================================
   BORDER TOKENS
   ============================================ */

/* Solid teal borders - full color */
--border-teal-solid: 2px solid var(--brand-teal);
--border-teal-solid-thick: 4px solid var(--brand-teal);

/* Subtle borders - 20% opacity (most common) */
--border-teal-subtle: 2px solid color-mix(in srgb, var(--brand-teal) 20%, transparent);
--border-teal-subtle-thin: 1px solid color-mix(in srgb, var(--brand-teal) 20%, transparent);

/* Fallbacks for older browsers */
--border-teal-subtle-fallback: 2px solid rgba(34, 227, 197, 0.2);
--border-teal-subtle-thin-fallback: 1px solid rgba(34, 227, 197, 0.2);

/* Very subtle borders - 10-15% opacity */
--border-teal-faint: 1px solid color-mix(in srgb, var(--brand-teal) 10%, transparent);
--border-teal-faint-fallback: 1px solid rgba(34, 227, 197, 0.1);

/* Left accent borders (highlight boxes) */
--border-left-accent: 4px solid var(--brand-teal);
```

### Usage Mapping

| vision.css Class | Current Border | New Token |
|------------------|----------------|-----------|
| `.hero-section` (17) | 2px solid teal | `--border-teal-solid` |
| `.mission-statement` (44) | 2px solid teal | `--border-teal-solid` |
| `.domain-card` (155) | 2px 20% | `--border-teal-subtle` |
| `.pillar-card` (203) | 2px 20% | `--border-teal-subtle` |
| `.highlight-box` (112) | 4px solid teal | `--border-left-accent` |
| `.tech-item` (426) | 1px 20% | `--border-teal-subtle-thin` |
| `.feature-list li` (767) | 1px 10% | `--border-teal-faint` |

---

## 3. Spacing Tokens

### Current State Analysis

| Type | Values | Count | Example Line Numbers |
|------|--------|-------|---------------------|
| **Section margin** | `5rem 0`, `4rem 0`, `3rem 0` | 5rem: 19, 4rem: 6, 3rem: 6 | various |
| **Hero padding** | `80px 20px 60px` | 1 | various |
| **Card padding** | `2rem`, `1.5rem`, `1.5rem 2rem` | 2rem: 15, 1.5rem: 14 | various |
| **Element gap** | `2rem`, `1.5rem`, `1rem` | 2rem: 7, 1.5rem: 6, 1rem: 4 | various |

### Recommended Tokens

```css
/* ============================================
   SPACING TOKENS
   ============================================ */

/* Section-level spacing */
--spacing-section: 5rem;          /* 80px - standard section margin */
--spacing-section-simple: 4rem;   /* 64px - compact sections */
--spacing-section-large: 6rem;    /* 96px - emphasized sections */

/* Hero-specific spacing */
--spacing-hero-block: 80px 20px 60px;  /* Hero section padding */
--spacing-hero-top: 80px;
--spacing-hero-inline: 20px;
--spacing-hero-bottom: 60px;

/* Card padding presets */
--padding-card: 2rem;             /* 32px - standard card */
--padding-card-compact: 1.5rem;   /* 24px - compact card */
--padding-card-inline: 1.5rem 2rem; /* Asymmetric padding */

/* Element gaps (grid, flex) */
--gap-large: 2rem;                /* 32px - grid spacing */
--gap-medium: 1.5rem;             /* 24px - standard gap */
--gap-small: 1rem;                /* 16px - tight spacing */
--gap-tiny: 0.5rem;               /* 8px - minimal gap */

/* Margin presets */
--margin-section-header: 2.5rem;  /* Below section headers */
--margin-content-block: 2rem;     /* Between content blocks */
--margin-subsection: 3rem;        /* Between subsections */
```

### Usage Mapping

| vision.css Property | Current Value | New Token |
|--------------------|---------------|-----------|
| `.section-spacing` margin (60) | `5rem 0` | `var(--spacing-section) 0` |
| `.hero-section` padding (18) | `80px 20px 60px` | `var(--spacing-hero-block)` |
| `.mission-statement` padding (41) | `2rem` | `var(--padding-card)` |
| `.section-header` margin-bottom (67) | `2.5rem` | `var(--margin-section-header)` |
| `.three-domains` gap (149) | `2rem` | `var(--gap-large)` |
| `.pillars-grid` gap (198) | `2rem` | `var(--gap-large)` |

---

## 4. Border Radius Tokens

### Current State Analysis

| Value | Count | Example Line Numbers | Usage |
|-------|-------|---------------------|-------|
| `12px` | 9 | various | Cards |
| `14px` | 4 | various | Large cards |
| `8px` | 7 | various | Small elements |
| `10px` | 1 | various | Tech items |
| `16px` | 1 | various | Vision section |
| `999px` | 1 | various | Circular badges |

### Recommended Tokens

```css
/* ============================================
   BORDER RADIUS TOKENS
   ============================================ */

/* Already defined in theme.css (verify presence) */
--radius: 14px;              /* Default (theme.css base token) */

/* Add missing radius values */
--radius-card: 12px;         /* Standard card radius */
--radius-lg: 14px;           /* Large cards, emphasized containers */
--radius-sm: 8px;            /* Small elements, inline highlights */
--radius-tiny: 6px;          /* Minimal rounding */
--radius-xl: 16px;           /* Extra large sections */
--radius-full: 999px;        /* Pills, badges, circular elements */
```

### Usage Mapping

| vision.css Class | Current Radius | New Token |
|------------------|----------------|-----------|
| `.mission-statement` (43) | 12px | `var(--radius-card)` |
| `.highlight-box` (115) | 8px | `var(--radius-sm)` |
| `.domain-card` (157) | 12px | `var(--radius-card)` |
| `.component-card` (365) | 14px | `var(--radius-lg)` |
| `.mission-badge` (712) | 999px | `var(--radius-full)` |
| `.vision-2030` (622) | 16px | `var(--radius-xl)` |

---

## 5. Typography Tokens

### Current State Analysis

| Property | Values | Count | Notes |
|----------|--------|-------|-------|
| **Font size** | `clamp()` functions | 15+ | Responsive sizing |
| **Font weight** | 300, 500, 600, 700, 800, 900 | 30+ | Mixed weights |
| **Line height** | 1.4, 1.5, 1.6, 1.7 | 25+ | Readability |
| **Letter spacing** | -0.02em, 0.02em, 0.08em, 0.12em | 8 | Tight/wide |

### Current Issues
- Font sizes are responsive with `clamp()` (GOOD - keep as-is)
- Font weights are hardcoded (CONSIDER tokenization)
- Line heights are hardcoded (CONSIDER tokenization)

### Recommended Tokens (Optional - Lower Priority)

```css
/* ============================================
   TYPOGRAPHY TOKENS (Optional Enhancement)
   ============================================ */

/* Font weights */
--font-weight-light: 300;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
--font-weight-black: 900;

/* Line heights */
--line-height-tight: 1.4;
--line-height-normal: 1.6;
--line-height-relaxed: 1.7;

/* Letter spacing */
--letter-spacing-tight: -0.02em;
--letter-spacing-normal: 0.02em;
--letter-spacing-wide: 0.08em;
--letter-spacing-wider: 0.12em;
```

**Decision**: Typography tokens are **OPTIONAL** for Phase 1. Focus on gradients, borders, spacing, and radius first. Typography can be standardized in Phase 2.

---

## 6. Shadow Tokens

### Current State Analysis

| Pattern | Count | Example Line Numbers | Usage |
|---------|-------|---------------------|-------|
| `0 4px 20px rgba(0,0,0,0.1)` | 2 | 45 | Medium elevation |
| `0 8px 30px rgba(0,0,0,0.15)` | 4 | 164, 211, 371, 841 | High elevation (hover) |
| `0 12px 32px rgba(0,0,0,0.2)` | 1 | 796 | Extra high (domain hover) |
| `0 2px 8px rgba(0,0,0,0.1)` | 1 | 265 | Low elevation |
| `0 4px 16px color-mix(...)` | 2 | 283 | Teal glow shadow |

### Recommended Tokens

```css
/* ============================================
   SHADOW TOKENS
   ============================================ */

/* Already exists in theme.css */
--shadow: 0 10px 30px rgba(2, 8, 23, 0.35);  /* theme.css base token */

/* Add elevation scale */
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 20px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.15);
--shadow-xl: 0 12px 32px rgba(0, 0, 0, 0.2);

/* Glow effects */
--shadow-glow-teal: 0 4px 16px color-mix(in srgb, var(--brand-teal) 20%, transparent);
--shadow-glow-teal-fallback: 0 4px 16px rgba(34, 227, 197, 0.2);
```

### Usage Mapping

| vision.css Class | Current Shadow | New Token |
|------------------|----------------|-----------|
| `.mission-statement` (45) | `0 4px 20px ...0.1` | `var(--shadow-md)` |
| `.domain-card:hover` (164) | `0 8px 30px ...0.15` | `var(--shadow-lg)` |
| `.pillar-card:hover` (211) | `0 8px 30px ...0.15` | `var(--shadow-lg)` |
| `.btn` (265) | `0 2px 8px ...0.1` | `var(--shadow-sm)` |
| `.btn:hover` (283) | `0 4px 16px color-mix` | `var(--shadow-glow-teal)` |

---

## 7. Color Opacity Tokens

### Frequently Used color-mix Patterns

| Pattern | Count | Recommended Token |
|---------|-------|-------------------|
| `color-mix(in srgb, var(--brand-teal) 20%, transparent)` | 25+ | `--teal-20` |
| `color-mix(in srgb, var(--brand-teal) 15%, transparent)` | 6 | `--teal-15` |
| `color-mix(in srgb, var(--brand-teal) 10%, transparent)` | 4 | `--teal-10` |
| `color-mix(in srgb, var(--brand-teal) 8%, transparent)` | 3 | `--teal-8` |

### Recommended Tokens

```css
/* ============================================
   COLOR OPACITY TOKENS
   ============================================ */

/* Teal opacity scale (for borders, backgrounds) */
--teal-5: color-mix(in srgb, var(--brand-teal) 5%, transparent);
--teal-8: color-mix(in srgb, var(--brand-teal) 8%, transparent);
--teal-10: color-mix(in srgb, var(--brand-teal) 10%, transparent);
--teal-12: color-mix(in srgb, var(--brand-teal) 12%, transparent);
--teal-15: color-mix(in srgb, var(--brand-teal) 15%, transparent);
--teal-20: color-mix(in srgb, var(--brand-teal) 20%, transparent);
--teal-30: color-mix(in srgb, var(--brand-teal) 30%, transparent);
--teal-40: color-mix(in srgb, var(--brand-teal) 40%, transparent);

/* Fallbacks for older browsers */
--teal-5-fallback: rgba(34, 227, 197, 0.05);
--teal-8-fallback: rgba(34, 227, 197, 0.08);
--teal-10-fallback: rgba(34, 227, 197, 0.1);
--teal-15-fallback: rgba(34, 227, 197, 0.15);
--teal-20-fallback: rgba(34, 227, 197, 0.2);
--teal-30-fallback: rgba(34, 227, 197, 0.3);
--teal-40-fallback: rgba(34, 227, 197, 0.4);

/* Surface mixing (for backgrounds) */
--surface-teal-5: color-mix(in srgb, var(--brand-teal) 5%, var(--surface));
--surface-teal-8: color-mix(in srgb, var(--brand-teal) 8%, var(--surface));
--surface-teal-10: color-mix(in srgb, var(--brand-teal) 10%, var(--surface));
--surface-teal-15: color-mix(in srgb, var(--brand-teal) 15%, var(--surface));
```

---

## 8. Implementation Priority

### Phase 1: Critical (Block implementation)
1. ✅ **Gradient tokens** - ~29 color-mix usages (plus 2 at 30%)
2. ✅ **Border tokens** - ~31 teal border declarations
3. ✅ **Spacing tokens** - ~77 margin/padding/gap declarations
4. ✅ **Border radius tokens** - ~29 declarations

### Phase 2: Important (Enable componentization)
5. ✅ **Shadow tokens** - 10+ usages
6. ✅ **Color opacity tokens** - 30+ usages (estimate)

### Phase 3: Enhancement (Nice-to-have)
7. ⚠️ **Typography tokens** - Optional, low priority
8. ⚠️ **Transition tokens** - Not yet analyzed

---

## 9. Migration Strategy

### Step 1: Add All Tokens to theme.css

```css
/* Add to public/assets/theme.css under the base theme token sections. */

/* ============================================
   ARTAGON UI TOKENS
   Shared design tokens for reusable components
   ============================================ */

/* ... paste all token definitions from above ... */
```

### Step 2: Replace in vision.css

Use find/replace with careful verification:

```bash
# Example replacements
color-mix(in srgb, var(--brand-teal) 20%, transparent)
→ var(--teal-20)

2px solid color-mix(in srgb, var(--brand-teal) 20%, transparent)
→ var(--border-teal-subtle)

linear-gradient(135deg, color-mix(in srgb, var(--brand-teal) 10%, var(--surface)), var(--surface))
→ var(--gradient-surface)
```

### Step 3: Verify Across Themes

Test each theme after replacement:
1. Midnight (default)
2. Twilight
3. Slate

**Critical**: Ensure color-mix() values adapt correctly in each theme's `--brand-teal` override.

---

## 10. Acceptance Criteria

- [ ] All gradient patterns (~29 color-mix occurrences) replaced with tokens
- [ ] All border patterns (~31 teal border declarations) replaced with tokens
- [ ] All spacing values (~77 margin/padding/gap declarations) replaced with tokens
- [ ] All border radius values (~29 declarations) replaced with tokens
- [ ] All shadow values (10+) replaced with tokens
- [ ] Fallback values provided for all color-mix() tokens
- [ ] Visual regression: < 2% pixel diff across all 9 screenshots
- [ ] No hardcoded teal colors remain in vision.css
- [ ] All tokens documented with usage comments in theme.css

**Estimated Impact**:
- vision.css: Reduce from ~1,013 lines to ~850 lines (token replacements)
- theme.css: Increase from ~1,200 lines to ~1,350 lines (add tokens)
- **Net**: Tokens enable component extraction in Phase 3-4
