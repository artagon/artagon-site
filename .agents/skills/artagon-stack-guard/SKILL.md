---
name: artagon-stack-guard
description: Version and migration guard for artagon-site. Use before adding or changing Astro components, pages, layouts, integrations, styles, content collections, client directives, or dependencies, and before following any framework advice from a skill, a doc, or memory. Reads the installed stack, routes framework questions to live docs, and runs the stack check.
---

# Artagon stack guard

Framework advice goes stale fast, and other skills (and your training data) describe stacks this repo
does not use. This skill stops that advice from landing in artagon-site.

## 1. Read the stack that is installed, not the one you remember

Run `npm run verify:stack`. It prints the installed versions of `astro`, the `@astrojs/*`
integrations, `react` and Node from `package.json`, `package-lock.json` and `.nvmrc`, then scans the tree for
patterns this stack forbids. Treat its version list as the truth for this task. Never hardcode a
version into code comments, docs or another skill.

Today the contract (AGENTS.md "Stack contract") is: Astro 6 static output, MDX, React islands only,
scoped Astro `<style>` plus semantic tokens from `public/assets/theme.css`, **no Tailwind**
(`docs/decisions/0001-no-tailwind.md`), **no Starlight**. A Tailwind v4 and Starlight adoption is only
proposed (`openspec/changes/adopt-tailwind-and-starlight/`). Until that change is approved and its
tasks land, write nothing that assumes either.

## 2. Get framework facts from live documentation

For any Astro, MDX or integration API you are not certain of in the installed major version, ask the
Astro Docs MCP (`astro-docs`, tool `search_astro_docs`) or `context7`. Do not rely on memory: Astro 5
→ 6 changed real APIs, and Astro 7 changes more.

## 3. Hard failures (`npm run verify:stack` exits 1)

| Pattern                                                                                      | Why                                                                                                                              |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Astro.glob(`                                                                                | Removed. Use content collections or `import.meta.glob()`.                                                                        |
| `<ViewTransitions`                                                                           | Removed. `<ClientRouter />` exists, but this site does not add client routing without a spec change (CSP and zero-JS contracts). |
| `@tailwind base`, `@tailwind components`, `@tailwind utilities`, `@import "tailwindcss"`     | Tailwind directives; ADR 0001.                                                                                                   |
| `tailwindcss`, `@tailwindcss/*`, `@astrojs/tailwind`, `@astrojs/starlight` in `package.json` | Not adopted; changes go through OpenSpec first.                                                                                  |
| `tailwind.config.*` at the repo root                                                         | Same.                                                                                                                            |

## 4. Review items (no script; you check them in your own diff)

- A new `client:*` directive: is interactivity required, and is it the least eager one
  (`client:visible` or `client:idle` before `client:load`)?
- A new external origin for scripts, styles, fonts or images: `scripts/csp.mjs` and
  `scripts/sri.mjs` will reject it; self-host or drop it.
- A new remark or rehype plugin, a new integration, or anything that changes `astro.config.ts`.
- Any server-rendered route or `export const prerender = false`: the site is `output: "static"`.
- Logic in Astro frontmatter that belongs in `src/lib/` or `src/data/` (ast-grep and ripwire cannot
  see frontmatter).

## 5. Before you report done

Run the repo's own checks for what you touched: `npm run check`, `npm run lint:sg`,
`npm run test:node`, the targeted vitest files, and `npm run verify:stack`. Name each command and its
result in your report.
