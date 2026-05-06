# Migrate legacy `:root` token blocks into `@layer tokens`

## Why

USMR Phase 2 (`update-site-marketing-redesign`) added `@layer reset, tokens, utilities, components, overrides;` to `public/assets/theme.css` and declared all NEW token categories (motion, elevation, focus-ring, z-index, spacing scale, radius scale, fluid type scale, on-brand semantic aliases) inside `@layer tokens`. The pre-existing `:root` blocks (~150 token declarations powering the `twilight`/`midnight`/`slate` theme switch) were intentionally left UNLAYERED to satisfy the spec's "Existing Token Preservation" Requirement.

The `style-system` capability spec carries a Requirement that reads:

> **Cascade Layers in theme.css** — All token definitions MUST live in the `tokens` layer; all utility classes MUST live in `utilities`; component-scoped Astro `<style>` blocks belong in `components`; the `overrides` layer is reserved for emergency targeted fixes.

The spec language ("MUST") and the actual implementation ("only NEW tokens") are inconsistent. This change closes the gap.

## What changes

This change has three options. The actual implementation choice is deferred to design.md once authoring begins; this proposal records intent only.

### Option A — Soften the spec to match implementation

Amend the `style-system` Requirement to read "All NEW token definitions MUST live in the `tokens` layer; legacy `:root` declarations are grandfathered until they are migrated under a separate OpenSpec change." The `migrate-legacy-tokens-to-layer` change then becomes a tracking marker for that future migration without committing to scope.

### Option B — Migrate legacy declarations to `@layer tokens` with a per-token rename map

Move every legacy `:root { --foo: ...; }` declaration into `@layer tokens { :root { --foo: ...; } }`. This loses cascade priority (layered rules lose to unlayered rules), so the migration MUST also retire any unlayered consumer that depends on the priority. Practically: the `:root[data-theme="..."]` blocks must move with the legacy `:root` block. A rename map (e.g., `--brand-teal` → `--nd-accent`, `--surface` → `--nd-bg-1`, `--text` → `--nd-fg`) consolidates legacy + redesign palettes into one set.

### Option C — Hybrid: layer-shim with !important promotion

A third option (lowest blast radius, highest debt): keep legacy declarations in their unlayered `:root` blocks but promote each to `!important` in a new `@layer overrides` block. Discouraged because `!important` defeats the cascade-layer architecture's whole purpose.

## Impact

- **Affected specs:** `style-system` (Requirement "Cascade Layers in theme.css")
- **Affected code:** `public/assets/theme.css` (all of it, depending on option), every component that references a renamed token
- **Migration risk:** HIGH if Option B; LOW if Option A
- **Dependencies:** `update-site-marketing-redesign` archives first

## Status

**Stub. Depends on `update-site-marketing-redesign` archive.** This change exists to anchor the deferral note in `update-site-marketing-redesign/tasks.md` task 2.1 and the prose references in `docs/design-md.md` §6.13/§6.16/§6.19.

The stub spec delta at `specs/style-system/spec.md` declares `## MODIFIED Requirements / ### Requirement: Cascade Layers in theme.css`. That requirement does NOT exist in the archived `openspec/specs/style-system/spec.md` today — it only exists as an `## ADDED` delta inside the unarchived `update-site-marketing-redesign` change. The MODIFIED is therefore a **forward reference**: it becomes a valid amendment only after USMR archives the requirement into the live spec.

`openspec validate migrate-legacy-tokens-to-layer` passes today because OpenSpec doesn't cross-check MODIFIED targets against archived state at validate time — it checks structural well-formedness only. Final archival of THIS change MUST be gated on USMR's prior archive; otherwise the MODIFIED has nothing to amend.

Authoring (proposal completion + tasks + final spec deltas) begins after `update-site-marketing-redesign` archives.
