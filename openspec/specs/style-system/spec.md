# style-system Specification

## Purpose
TBD - created by archiving change fix-styling-refactor-gaps. Update Purpose after archive.
## Requirements
### Requirement: Theme-Aware Fallback Tokens

Theme token fallbacks for `color-mix` usage MUST be defined per theme or derived from theme variables so theme changes preserve intended hues when fallbacks are used.

#### Scenario: Theme uses fallback tokens
- **WHEN** the site is rendered in a browser without `color-mix` support and `data-theme="twilight"` is active
- **THEN** gradient and border fallbacks use twilight theme colors rather than midnight defaults.

### Requirement: UI Component Attribute Compatibility

Card, SectionHeader, and FeatureList components MUST accept both `class` and `className`, merge them, and forward remaining HTML attributes to the root element.

#### Scenario: SectionHeader forwards standard attributes
- **WHEN** a developer renders `<SectionHeader id="architectural-principles" data-testid="section">`
- **THEN** the root element includes the `id` and `data-testid` attributes alongside the component classes.

### Requirement: Solid Card Variant

The Card component MUST support `variant="solid"`, applying the `.ui-card--solid` utility to match the solid card styling.

#### Scenario: Card renders solid styling
- **WHEN** a developer renders `<Card variant="solid">`
- **THEN** the root element includes the `.ui-card--solid` class.

### Requirement: Reusable UI Components

Common UI patterns (Cards, Section Headers, Feature Lists) MUST be implemented as reusable Astro components or global CSS classes, rather than duplicated in page-scoped styles.

#### Scenario: Developer adds a new page
- **WHEN** a developer creates a new page with a "Card" layout
- **THEN** they can import the `Card` component or use the `.ui-card` utility without copying CSS.

### Requirement: Global Theme Consistency

Visual attributes like gradients, spacing, and typography hierarchies MUST be defined in the global theme variables or CSS, not hardcoded in page styles.

#### Scenario: Changing Primary Color
- **WHEN** the `--brand-teal` variable is updated in `theme.css`
- **THEN** all "Hero" sections and "Buttons" across the site reflect the change immediately.

