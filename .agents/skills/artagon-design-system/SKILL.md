---
name: artagon-design-system
description: Artagon's visual identity and voice as they apply to new or changed UI and copy. Use with frontend-design, modern-web-guidance or any design or UX skill when building or restyling a page, component, section or piece of marketing copy in artagon-site. DESIGN.md is the source of truth; this skill routes to it and says how generic design advice must yield to it.
---

# Artagon design system

`DESIGN.md` owns Artagon's visual identity. This skill does not restate its tokens; it tells you
where they live and how to keep other design skills from overriding them.

## Precedence

`openspec/specs/*` (behaviour) → `DESIGN.md` (presentation) → this skill → generic design skills
(`frontend-design`, `modern-web-guidance`, `web-quality-*`, `web-interface-review`). When a generic
skill says "pick a bold palette", "choose distinctive fonts" or "use utility classes", the answer in
this repo is already decided: use DESIGN.md.

### Known conflict: frontend-design's "tells" are Artagon's choices

`frontend-design` warns against mono eyebrow labels, numbered section markers, single-word italic
emphasis in headlines, middle-dot meta strings, hairline rules and a dark background with one bright
accent, calling them defaults of generated pages. In artagon-site each of these is a deliberate,
documented decision: mono eyebrows and the `.glow-tag` (§1.2.3, §6.3), numbered `.num-h2` sections
(§6.7), the `*marker*` serif-italic emphasis (§7.1), the `date · author · reading time` meta strip
(§6.12), and the twilight palette with one accent per page (§2, §7.3). DESIGN.md is the brief, and
`frontend-design` itself says the brief's own words win. Keep them; apply `frontend-design`'s
judgment only to choices DESIGN.md leaves open.

## Read before designing

- `DESIGN.md` §1 Principles and §1.2 Voice: proof over promise, editorial not SaaS, dense without
  crowded, accessible by default, portable aesthetic. Positioning line and headline triad are
  verbatim-only.
- §2 Colors (OKLCH, one accent per page), §3 Typography (four families, scale, tracking), §4 Layout,
  §5 Shapes, §8 Motion, §9 Patterns, §11 Accessibility.
- §6 Components: reuse an existing primitive (`.glow-tag`, `StandardChip`, `TrustChain`, buttons,
  code block, long-form reader) before inventing one.
- §7 Do's and Don'ts, including the forbidden phrases and marketing adverbs.
- `docs/agents/design-contract.md` for the DESIGN.md pins and precondition gates.

## Where tokens live

- Semantic tokens: `public/assets/theme.css` (canonical aliases such as `--bg`, `--fg`, `--accent`,
  `--line`). Consume them through CSS variables and existing `ui-*` utilities.
- New or changed tokens: add to `theme.css` and DESIGN.md frontmatter in the same diff, then run
  `npm run check:oklch-hex-parity`, `npm run lint:tokens` and `npm run lint:design`.
- Never raw color literals (`no-raw-color-literal`, `no-untraceable-token`,
  `no-raw-color-style-object-*`), never Tailwind classes.

## Surfaces

- **Marketing pages** (`src/pages/`, `src/content/pages/*.mdx`): editorial and expressive within
  DESIGN.md, the trust-chain story, numbered sections, mono eyebrows.
- **Long-form writing and docs** (`/writing`, DESIGN.md §6.12): comprehension first: 65ch measure,
  readable code blocks, diagrams that explain, a sticky TOC on wide screens. No decoration that
  competes with the text.

## Brand evidence, not taste

Graph, lattice and relationship motifs appear only where they explain authorization (tuples, trust
chains, policy decisions). Avoid anonymous gradient heroes, decorative nodes, glow-heavy "cyber"
imagery, default three-card grids and unsourced claims. Every number or standards claim links to a
primary source (§1.1.1).

## Changing the design itself

A component contract, token, or animation primitive change updates DESIGN.md in the same diff (AGENTS.md
change discipline). Use the `design-md` skill to edit DESIGN.md, and `npm run diff:design` to show the
change.
