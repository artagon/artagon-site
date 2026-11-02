---
name: web-interface-review
description: Review UI code in artagon-site against a pinned copy of the Vercel Web Interface Guidelines (accessibility, focus, forms, animation, typography, images, performance, navigation, touch, theming, i18n, copy). Use when asked to review UI, check accessibility, audit design or UX, or check a page or component against interface best practices. Read-only review; does not edit files.
---

# Web interface review

Review files for compliance with the Web Interface Guidelines, using the reviewed copy in
`references/command.md` (from vercel-labs/web-interface-guidelines, MIT; commit recorded in
`skills-lock.json`). Never fetch the rules from the network: the upstream skill pulls them from a
moving branch on every run, which this repo does not allow.

## Steps

1. Get the files or glob to review. If none were given, ask which files.
2. Read `references/command.md`. It holds the rules and the output format.
3. Read each file in full (for `.astro`, the template and the `<style>` block).
4. Apply the rules, adjusted for this repo:
   - The guidelines use Tailwind and React vocabulary (`focus-visible:ring-*`, `truncate`,
     `min-w-0`, `<Link>`, `nuqs`). artagon-site has no Tailwind (ADR 0001) and is static Astro with
     React islands, so check for the equivalent CSS or HTML behaviour, and never suggest adding
     Tailwind classes or new dependencies.
   - Repo contracts win where they are stricter: 44 × 44 px hit areas, explicit `:focus-visible`,
     reduced motion and forced colors (`docs/agents/accessibility.md`), tokens instead of raw colors
     (`no-raw-color-literal`), and DESIGN.md typography.
   - "Title Case for headings/buttons" and other copy rules defer to the site's voice in DESIGN.md
     and `src/content/`. Report a conflict instead of applying the guideline.
5. Report in the format at the end of `references/command.md`: grouped by file, `file:line - issue`,
   terse, `✓ pass` for clean files. Load `.claude/skills/review-verification-protocol/` first if it is
   installed, and drop any finding you cannot point to in the source.
