---
name: artagon-docs-authoring
description: How artagon-site writes long-form technical content: writing posts, MDX pages, docs, code samples, diagrams and standards references. Use when creating or editing MDX under src/content/, a /writing post, a docs page, or any page with code samples or protocol diagrams. Pair with artagon-authz-content-review for anything that states an identity or authorization fact.
---

# Artagon docs and long-form authoring

Priority order for technical content: **correctness → copy-pasteability → discoverability →
scannability → aesthetics.**

## Where content lives

- Editorial pages: `src/content/pages/*.mdx`. Writing posts: `src/content/writing/` and the
  `/writing/[slug]` route. Schemas: the content collection config under `src/content/`; read it and
  match its frontmatter exactly (DESIGN.md §10 lists the editorial fields; §6.12 the long-form
  reader's source contract).
- Long-form content may come from `artagon/content` or `artagon/docs` at build time only. No
  client-side fetches.
- A Starlight docs site is only proposed (`openspec/changes/adopt-tailwind-and-starlight/`). Do not
  write Starlight-specific components, frontmatter or Expressive Code syntax until it lands.

## Page types

Pick one before writing, and keep to it:

| Type      | Job                                                 | Must have                                                       |
| --------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Concept   | Explain a model (ReBAC, trust chain, token binding) | One diagram with a text equivalent; links to primary standards  |
| Tutorial  | Take a newcomer to a working result                 | Prerequisites, numbered steps, the expected output of each step |
| How-to    | Solve one task for someone who knows the basics     | Goal in the first line, minimal steps, failure modes            |
| Reference | Exact facts (API, claims, errors, config)           | Tables, every value sourced, no narrative                       |
| Post      | Argue or explain for /writing                       | Frontmatter per §6.12, a concrete number, sources               |

## Code samples

- Samples must run. Prefer importing from a tested source file (`?raw` import or a generated snippet)
  over hand-typed code; never edit generated snippets by hand.
- Show the language and file name, keep each sample short enough to read, and show the output when
  it matters.
- Never put secrets, real tokens, `alg: none`, tokens in URLs, long-lived bearer tokens in
  `localStorage`, PKCE `plain`, or the implicit or password grants in a sample, even as a
  counterexample, unless it is clearly labelled as insecure and the page explains why.

## Diagrams

Build-time or static only (inline SVG or a pre-rendered image with intrinsic dimensions, DESIGN.md
§11.4), no client-side diagram libraries. Each diagram gets a text equivalent: a caption or a list
that states the same relationships (tuples, hops, decisions). It must still read correctly with
animations disabled.

## Standards and links

- Mention a standard with `<StandardChip>` (DESIGN.md §7.1) and link the primary source.
- External links carry `rel="noopener noreferrer"` with `target="_blank"`.
- State each standard's status correctly (RFC, BCP, W3C Recommendation, active draft); run
  `artagon-authz-content-review` on the page.

## Before you report done

Run the editorial checklist in DESIGN.md §10, `npm run check`, `npm run lint:taglines`, and the
relevant tests. Machine-readable exports (Markdown twins, `llms.txt`) are generated from the same
source only if a spec asks for them; never a second hand-written copy.
