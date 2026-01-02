## ADDED Requirements

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
