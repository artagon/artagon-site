## MODIFIED Requirements

### Requirement: Cascade Layers in theme.css

`public/assets/theme.css` MUST declare cascade layers in this order: `@layer reset, tokens, utilities, components, overrides;`. **All NEW token definitions** added on or after this change MUST live in the `tokens` layer; legacy `:root` declarations that pre-date this change are grandfathered until they are migrated under this same change. All utility classes MUST live in `utilities`; component-scoped Astro `<style>` blocks belong in `components`; the `overrides` layer is reserved for emergency targeted fixes.

#### Scenario: New token lives in tokens layer

- **WHEN** a contributor adds a new `--color-*` token to `public/assets/theme.css`
- **THEN** the declaration appears within `@layer tokens { ... }` and `lint:tokens` passes.

#### Scenario: Legacy unlayered token remains resolvable

- **WHEN** a contributor renders any out-of-scope route that consumes a pre-existing token (e.g. `--brand-teal`, `--bg`, `--surface`)
- **THEN** the token resolves from its unlayered `:root` declaration with the same computed value as before this change merges.
