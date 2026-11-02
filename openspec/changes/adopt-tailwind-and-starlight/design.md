## Context

- Stack today: Astro 6.2.1 static output, MDX, React islands, scoped `<style>` plus cascade-layer OKLCH tokens in `public/assets/theme.css`, DESIGN.md (google design.md 0.1.1) as the visual source of truth, postbuild CSP and SRI (`scripts/csp.mjs`, `scripts/sri.mjs`), Node 22.18.0 (`.nvmrc`).
- ADR 0001 rejects Tailwind with five reasons; any adoption must answer them.
- Evidence gathered on 2026-10-27 and 2026-10-31 (agent research; re-verify each in task 0.2):
  - Astro 7.4 shipped 15 Oct 2026 and requires Node ≥ 22.22.0.
  - Starlight 0.42.0 shipped 2 Sep 2026. It moves the mobile menu to the Popover API, drops support for Chromium < 116, Safari < 17.0 and older Firefox, and must be upgraded together with Astro. One downstream site found its `/_llms-txt/*` prerender broken by the 0.42 / MDX 8 bump.
  - Astro's built-in `security.csp` does not support Shiki (inline styles) or `<ClientRouter />`. Starlight's code blocks use Expressive Code, not Astro's Shiki, and Expressive Code colours tokens with inline `style="--0:#…"` attributes.
  - Tailwind's Astro guide installs `tailwindcss` + `@tailwindcss/vite` and uses `@import "tailwindcss"`. `astro add tailwind` wires the same since Astro 5.2.
  - There is still no official Tailwind Labs or Astro team agent skill. The Astro Docs MCP is the official agent surface.

## Goals / Non-goals

- Goal: a docs surface that agents and readers can navigate, search and trust, without weakening the site's CSP, SRI, accessibility or token discipline.
- Goal: keep DESIGN.md the single visual source of truth, whatever is adopted.
- Non-goal: restyling the marketing pages in Tailwind (option c) unless the owner explicitly chooses it.

## Decisions to make (task 0)

1. **Scope: a, b or c.** Recommendation: (a) Starlight only. ADR 0001's byte-cost and specificity arguments apply fully to the marketing site and only weakly to `/docs`.
2. **CSP strategy for Starlight.**
   - Option A: keep `scripts/csp.mjs` post-build hashing. It already hashes inline scripts and styles. Extend it to `style-src-attr` hashes with `'unsafe-hashes'` for Expressive Code, and to `'wasm-unsafe-eval'` for Pagefind.
   - Option B: switch Astro's `security.csp` on as well.

   Recommendation: A, with a release gate that loads a docs page with code blocks and asserts zero CSP violations.

3. **Token bridge (b or c only).** Generate Tailwind `@theme` from DESIGN.md (`npx design.md export --format tailwind`) at build time, or hand-map `@theme` variables to `theme.css` canonical aliases. Recommendation: map to the aliases (`--color-bg: var(--bg)`), so `theme.css` stays the single source and `npm run lint:tokens` still sees every value.

## Risks

- Two major upgrades at once (Astro 7, Starlight). Mitigation: upgrade Astro alone first and land it.
- CSP regressions hidden behind `'unsafe-inline'`. Mitigation: the release gate, and `scripts/csp.mjs` tests that fail on `'unsafe-inline'` in `script-src`.
- Agents applying Tailwind on marketing pages under option (a) or (b). Mitigation: `verify-stack.mjs` scopes Tailwind to the allowed directories.
