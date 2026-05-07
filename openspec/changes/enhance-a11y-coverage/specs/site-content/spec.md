## ADDED Requirements

### Requirement: Interactive Components Have Pointer + Keyboard + Touch Parity

Every interactive component rendered on a content route (whether an Astro component or a hydrated React island) SHALL provide three input modalities with parity:

1. **Pointer (mouse)**: hover and click as documented per component.
2. **Keyboard**: Tab to focus, Enter / Space to activate; focus visible per `style-system :focus-visible` requirement.
3. **Touch**: tap to activate; if the pointer affordance is hover-driven, the touch path SHALL provide a tap-toggle equivalent (per `site-accessibility` Touch Interaction Parity).

The component SHALL NOT depend on a single modality for its primary affordance.

#### Scenario: Trust-chain hover/click/tap parity

- **WHEN** the same trust-chain stage row is exercised by mouse hover, keyboard Tab + Enter, and touch tap
- **THEN** all three paths reach the "decision card shows this stage's claim" state; the keyboard path additionally renders a `:focus-visible` outline; the touch path additionally sets `aria-pressed="true"` on the row

### Requirement: Interactive Components Meet Tap-Target Floor

Every interactive component on a content route SHALL meet the 44 × 44 CSS pixel hit-area minimum specified by `site-accessibility` Tap Target Floor. Hit-area expansion via invisible padding is permitted; reduced-size visible targets remain valid for design fidelity.

#### Scenario: New component review

- **WHEN** a maintainer reviews a PR adding a new interactive component to a content route
- **THEN** the review checklist includes a tap-target verification step (manual) and an automated `axe-core` `target-size` rule check (CI) that fails if any interactive element's effective hit area is below 44 × 44 CSS px
