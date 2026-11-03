---
name: modern-web-guidance
description: |
  Local, pinned catalog of modern web platform best-practice guides (HTML, CSS, client-side JS,
  accessibility, performance, security, forms, visual design). Use before implementing or reviewing
  UI, CSS layout or animation, or client-side behaviour in artagon-site, to check whether a standard
  platform pattern already exists (dialogs and popovers, anchor positioning, container queries,
  :has(), view transitions, scroll-driven animation, dark mode, color, typography, CWV fixes,
  passkeys, HTML sanitization). Do not use for build tooling, CI, tests, or backend code.
---

# Modern Web Guidance (Artagon fork, local mode)

Forked from GoogleChrome/modern-web-guidance (Apache-2.0). This copy reads the guides vendored in
`guides/` instead of running the upstream npm CLI, so it makes no network calls and sends no
telemetry. What changed and why: `FORK.md`.

## Authority

AGENTS.md, `docs/decisions/`, DESIGN.md and `openspec/specs/` outrank these guides. In particular:

- No Tailwind (ADR 0001). Translate any utility-class example into scoped Astro `<style>` that
  consumes tokens from `public/assets/theme.css`; never add raw color literals.
- Static Astro first. React only for interactive islands, with the least eager `client:*` directive.
- No third-party script origins. The postbuild CSP (`scripts/csp.mjs`) and SRI (`scripts/sri.mjs`)
  reject them. Never copy a guide's CDN polyfill import (several float on a moving version tag); skip
  the polyfill or self-host a pinned copy through the normal dependency process.
- Accessibility contracts in `docs/agents/accessibility.md` (44 × 44 px targets, explicit
  `:focus-visible`, reduced motion, forced colors) apply on top of any guide.

## How to use

1. **Find the guide.** Guides live at `guides/<category>/<id>.md`. Categories: `accessibility`,
   `built-in-ai`, `css`, `forms`, `html`, `js`, `performance`, `privacy`, `pwa`, `security`,
   `ui-atoms`, `ui-behaviors`, `ui-components`, `visual-design`, `wasm`, `webmcp`.
   Search them with the repo's search tool:

   ```sh
   rtk rg -il '<2-4 words for one platform capability>' .agents/skills/modern-web-guidance/guides
   ```

   Search for the user-visible capability ("light dismiss dialog", "responsive data table"), not
   framework or component names. Split multi-feature tasks into separate searches.

2. **Read the guide(s)** that match, plus the broad discipline guide that applies
   (`html/html.md`, `css/css.md`, `forms/forms.md`, `accessibility/accessibility.md`,
   `performance/performance.md`, `security/security.md`, `visual-design/color.md`).
3. **Cross-references.** A guide may point to another guide as `` guide `<id>` ``. Open
   `guides/*/<id>.md`. If no such file exists, that guide is not vendored: proceed without it and do
   not fetch it.
4. **Verify.** Before finishing, check the change against the guide: the modern pattern and its
   required fallbacks are applied, nothing unrequested is forced in, and the repo authority above
   still holds.

## Browser support

Default: Baseline Widely available features need no fallback; anything newer follows the guide's
fallback advice. If the repo states a stricter browser policy (AGENTS.md or an OpenSpec spec), use
the guide's compatibility data against that policy instead.

## Updating this fork

Do not edit `guides/` by hand. Re-vendor from a reviewed upstream commit with the procedure in
`FORK.md`, then update `skills-lock.json` and run `npm run verify:skills`.
