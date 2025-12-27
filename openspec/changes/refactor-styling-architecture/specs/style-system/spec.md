## ADDED Requirements

### Requirement: Reusable UI Components

Common UI patterns (Cards, Section Headers, Feature Lists) MUST be implemented as reusable Astro components or global CSS classes, rather than duplicated in page-scoped styles.

#### Scenario: Developer adds a new page
- **WHEN** a developer creates a new page with a "Card" layout
- **THEN** they can import the `Card` component or use the `.card` class without copying CSS.

### Requirement: Global Theme Consistency

Visual attributes like gradients, spacing, and typography hierarchies MUST be defined in the global theme variables or CSS, not hardcoded in page styles.

#### Scenario: Changing Primary Color
- **WHEN** the `--brand-teal` variable is updated in `theme.css`
- **THEN** all "Hero" sections and "Buttons" across the site reflect the change immediately.
