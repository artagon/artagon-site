# Tasks — adopt-tailwind-and-starlight

> Draft. Nothing here starts before task 0.1. See `proposal.md` and `design.md`.

## 0. Decision

- [ ] 0.1 Owner decides scope (a Starlight only, b Starlight + docs-only Tailwind, c Tailwind site-wide) and the CSP strategy; record a new ADR in `docs/decisions/` that supersedes ADR 0001 for the chosen scope.
- [ ] 0.2 Re-verify the evidence in `design.md` against primary sources (Astro and Starlight release notes, Astro configuration reference, Tailwind install guide, Expressive Code docs) and correct the design where it moved.
- [ ] 0.3 Write the spec deltas for the chosen scope (`docs-site`, and `style-system` / `design-system-format` for b or c).

## 1. Astro 7 upgrade (lands on its own)

- [ ] 1.1 Bump `.nvmrc`, `package.json` `engines.node` and CI to Node ≥ 22.22.0.
- [ ] 1.2 Upgrade `astro` and every `@astrojs/*` integration with `npx @astrojs/upgrade`; fix the migration findings, using the Astro Docs MCP for every API question.
- [ ] 1.3 Full build, postbuild gates, Playwright and Lighthouse green.

## 2. Starlight docs surface

- [ ] 2.1 Add `@astrojs/starlight` for the docs surface; DESIGN.md tokens drive Starlight's CSS custom properties.
- [ ] 2.2 Extend `scripts/csp.mjs` for Starlight inline scripts, Expressive Code `style` attributes and Pagefind; add tests; add the docs CSP release gate.
- [ ] 2.3 Add a Starlight section to `artagon-docs-authoring` (page types, Expressive Code conventions, multi-language tabs from tested sources).

## 3. Tailwind (options b or c only)

- [ ] 3.1 `tailwindcss` + `@tailwindcss/vite`, `@import "tailwindcss"`, `@theme` mapped to `theme.css` aliases.
- [ ] 3.2 ast-grep rules for raw colors in class strings; update `docs/agents/static-analysis.md`.

## 4. Guards and skills

- [ ] 4.1 Update `scripts/verify-stack.mjs`, `tests/verify-stack.test.mjs`, the `artagon-stack-guard` skill, the AGENTS.md stack contract and the `agent-skills` spec for the chosen scope.
- [ ] 4.2 Vendor Lombiq `tailwind-4-docs` (reviewed snapshot) through the `agent-skills` procedure, if Tailwind is adopted.
- [ ] 4.3 Write a repo-authored Tailwind skill seeded from wshobson `tailwind-design-system`'s v3 → v4 mapping, scoped to the chosen surface.
