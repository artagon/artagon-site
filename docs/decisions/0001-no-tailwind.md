# ADR 0001: artagon-site does NOT use Tailwind CSS

- **Status**: Accepted
- **Date**: 2026-05-01
- **Deciders**: Initial site authors via the OpenSpec change set scaffolded in PR #28
- **Context**: `update-site-marketing-redesign`, `adopt-design-md-format`, `add-brand-assets-and-writing-pipeline`

## Context and problem

`artagon-site` is an Astro 5 static site with a strict zero-runtime-JS contract, scoped Astro `<style>` blocks per component, OKLCH semantic-token cascade in `public/assets/theme.css`, and `ast-grep` enforcing `no-raw-color-literal`. Tailwind v4 is widely used for similar surfaces. Why not adopt it here?

## Decision

artagon-site does NOT adopt Tailwind. Captured explicitly in two OpenSpec proposals:

- `update-site-marketing-redesign` Out of Scope: "No Tailwind adoption. The `export --format tailwind` path is documented but not wired."
- `adopt-design-md-format` Decision #9: "No Tailwind adoption. We don't ship Tailwind."

## Rationale

1. **Cascade layers + OKLCH already give us tier-1 brand → tier-2 semantic → tier-3 component** without a class-name layer.
2. **Adding Tailwind ships ~10 KB runtime CSS** plus JIT compilation overhead. Astro static + cascade layers ships fewer bytes.
3. **`ast-grep no-raw-color-literal` enforces** the same discipline Tailwind enforces with `bg-primary` — but at the source-of-truth layer (CSS variables in `theme.css`), not at the consumer layer (class attributes everywhere).
4. **Scoped `<style>` per Astro component** keeps styles co-located with markup; Tailwind's class-attribute approach scatters specificity decisions across templates.
5. **Tailwind's `@theme { --color-*: oklch(...) }` (v4) is architecturally identical** to our `theme.css` cascade-layer approach minus the `@theme` directive (which Astro doesn't natively process). The skill (`frontend-mobile-development:tailwind-design-system`) is a useful reference for tier-hierarchy patterns but not a build-stack we want here.

## Downstream-consumer DTCG → Tailwind path

`@google/design.md` CLI ships `export --format tailwind` (per `adopt-design-md-format` proposal), which converts our DESIGN.md tokens to a Tailwind theme config. The script is wired in `package.json` (`export:dtcg`) but its output is not consumed by the site itself.

If a downstream surface (partner site, Storybook, internal admin tool) needs Artagon tokens in Tailwind form, the path is:

```bash
npx @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json
```

Then in the consumer:

```css
@import "tailwindcss";

@theme {
  /* Generated from DESIGN.md — see https://github.com/artagon/artagon-site/blob/main/DESIGN.md */
  --color-bg: oklch(0.14 0.008 260);
  --color-fg: oklch(0.96 0.005 85);
  --color-accent: oklch(0.86 0.14 185);
  /* …etc */
}
```

This decouples downstream Tailwind adoption from main-site code without committing the site to Tailwind itself.

## Consequences

- New `.astro` components author scoped `<style>` with `var(--color-*)` consumption.
- New tokens go in `public/assets/theme.css` under `@layer tokens`, NOT as class names.
- Code reviewers reject PRs that add `class="bg-primary"` style Tailwind utilities — they should consume tokens via scoped CSS or `ui-*` utility classes already defined in `theme.css`.
- Future contributors evaluating Tailwind for a NEW surface have this ADR + the DTCG export path as the clean handoff.

## When to reconsider

This decision should be revisited if any of:

1. The Astro static + scoped-style approach proves to scale poorly (token count exceeds ~200, component count exceeds ~50, and review velocity drops).
2. A second surface (e.g., dashboard, admin tool) gets built in this repo that has different stylistic needs and a Tailwind-friendly stack would unify them.
3. DESIGN.md adopts a Tailwind-native primitive that doesn't have a CSS-cascade equivalent.

None of those conditions hold today.
