# Vision & Roadmap

This file was originally an empty placeholder
("(Your full Vision & Roadmap text goes here; abbreviated in this
bundle to keep the archive lean.)") that was never populated.

The canonical Vision content lives at:

- `src/content/pages/vision.mdx` — long-form Vision document
  (rendered at `/vision`, ~29 KB body via `<Content />`).
- `src/content/pages/home.mdx` — home-page hero / on-ramp
  frontmatter for the vision tagline ("Verified, Private,
  Attested").
- `.agents/llm-config.json` — `brand.mission` + `brand.tagline`
  (the canonical short-form for agent prompts).

The canonical Roadmap content lives at:

- `src/data/roadmap.ts` — typed roadmap registry. The
  `RoadmapPhase` shape exports `{ id, version, when, title, status,
items[] }` for each of the 5 phases V1–V5; `RoadmapStatus` is the
  `shipping | in-build | design | planned` enum. The earlier 5.1c
  stub shape (which carried a `kpis[]` field) was dropped in USMR
  Phase 5.7 — the field was never consumed downstream. Consumed by
  `src/components/RoadmapTimeline.astro` at `/roadmap`.

Agents looking for first-context bootstrap should read those
sources directly rather than relying on a duplicate copy here —
duplicating would invite drift the moment vision.mdx or
roadmap.ts changes.
