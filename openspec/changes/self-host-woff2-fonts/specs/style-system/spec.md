## REMOVED Requirements

### Requirement: Self-hosted WOFF2 Fonts with Metrics Overrides

**Reason**: This Requirement (originally drafted under `update-site-marketing-redesign` but never archived to live spec) migrates into the new `font-self-hosting` capability under this change. Keeping it under `style-system` would create duplicate jurisdiction at archive time.

**Migration**: All callers/scenarios reference `font-self-hosting/spec.md` § "Self-hosted WOFF2 binaries" + § "@font-face Declarations with Metrics Overrides" instead. The `style-system` capability retains the typography-token surface (clamp scale, line-heights, tracking) but no longer covers font-binary delivery contracts.

### Requirement: Font Payload Budget

**Reason**: Same as above — the budget-enforcement contract migrates to `font-self-hosting` capability so font delivery and font budgeting share one home.

**Migration**: Callers reference `font-self-hosting/spec.md` § "Font Payload Budget" + `check-site-quality/spec.md` § "Font Payload Measurement Gate" instead.
