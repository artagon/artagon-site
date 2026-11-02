## Why

**Status: draft for owner decision.** Nothing in this change is implemented. Approving it supersedes `docs/decisions/0001-no-tailwind.md`.

The owner wants artagon-site to adopt Tailwind CSS v4 and Starlight, and to install the agent skills that support them, recorded on 2026-10-31 while selecting agent skills for the site. Today the site deliberately does neither. ADR 0001 rejects Tailwind; the stack contract in AGENTS.md forbids Tailwind utility conventions; and `artagon-stack-guard` with `scripts/verify-stack.mjs` (from `add-agent-skills-supply-chain`) fails the build on Tailwind or Starlight dependencies. This change is the one sanctioned path to lift those guards.

What each tool would buy:

- **Starlight** gives the `/docs` shell a real documentation framework: navigation, Pagefind search, versionable content, Expressive Code blocks, i18n, and accessible defaults. The alternative is hand-building those on the marketing layout.
- **Tailwind v4** gives a CSS-first `@theme` that can be generated from DESIGN.md (`design.md export --format tailwind`), plus a utility vocabulary that agents and contributors already know.

ADR 0001's objections still stand and must be answered, not waved away:

- ~10 KB of extra CSS.
- Class-attribute specificity scattered through templates.
- Duplication of the cascade-layer token system.
- `ast-grep` token discipline moving from the source of truth to every class attribute.

## What Changes

If approved, in this order:

1. **Decide the scope** (task 0). Options:
   - (a) Starlight only, for `/docs`, keeping scoped styles everywhere.
   - (b) Starlight plus Tailwind confined to the docs surface.
   - (c) Tailwind site-wide.

   The recommendation is (a) first, then (b) only if the docs need it. Record the decision in a new ADR that supersedes ADR 0001.

2. **Upgrade Astro 6.2 → 7.x first.** Done in USMR 14.87 (Astro 7.4.5, `@astrojs/mdx` 8.1.2, Node 22.23.4). Starlight 0.42 requires Astro 7 (its MDX 8 peer needs `astro@^7.2.10`), so that prerequisite is met; Starlight and Astro must still be upgraded together from here on.
3. **Starlight for `/docs`.** Keep the site's CSP model: `scripts/csp.mjs` already hashes inline scripts and styles after the build, which matches how other Starlight sites reach a strict `script-src`. Expressive Code emits inline `style` attributes for token colours, which needs `style-src-attr` hashes or a reviewed exception. Pagefind needs `'wasm-unsafe-eval'`.
4. **Tailwind v4** (only for option b or c): `tailwindcss` + `@tailwindcss/vite`, `@import "tailwindcss"`, and a `@theme` generated from DESIGN.md tokens so `public/assets/theme.css` stays the single source of truth. `ast-grep` rules for raw colors in class strings.
5. **Relax the guards in the same change.** Update `scripts/verify-stack.mjs`, its tests, the `artagon-stack-guard` skill, the AGENTS.md stack contract and the `agent-skills` spec.
6. **Install the Tailwind and Starlight agent skills** through the `agent-skills` supply-chain procedure:
   - Lombiq `tailwind-4-docs`, as a reviewed docs snapshot.
   - wshobson `tailwind-design-system`, as seed material for a repo-authored skill rather than installed as-is.
   - A repo-authored Starlight authoring section in `artagon-docs-authoring`.

## Capabilities

### New Capabilities

- `docs-site`: the Starlight documentation surface and its CSP, accessibility and authoring constraints.

### Modified Capabilities

- `style-system` and `design-system-format`: only if option (b) or (c) is chosen. Deltas are written in task 0.3 after the decision.
- `agent-skills`: the stack-contract gate changes in task 5.

## Impact

- Dependencies: `astro` 7.x, `@astrojs/starlight`, and optionally `tailwindcss` with `@tailwindcss/vite`. All are major upgrades with migration work in `src/`.
- CI: Node version bump, `verify-stack` rules, CSP gate tests.
- Not affected until approved: everything. This proposal is the decision record for the request, not a change to the site.
