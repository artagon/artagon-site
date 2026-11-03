# Update the homepage hero

<!-- LAYOUT-06A -->

Use `src/content/pages/home.mdx` for editorial copy. The homepage route reads that entry with `getEntry("pages", "home")` and renders the fields from `home.data`.

## Editorial copy

- Edit the frontmatter fields in `src/content/pages/home.mdx`: `eyebrow`, `headline`, `lede`, `ctas`, and any requested `title` or `description` metadata.
- Preserve the content schema's required fields and the current CTA structure.
- Do not edit the route template to make a copy-only change.

## Template and layout

`src/pages/index.astro` owns the homepage markup and rendering. Change it only when the request asks for a layout, styling, or behavior change. Keep editorial values in `src/content/pages/home.mdx` and keep template logic in `src/pages/index.astro`.

## Verify

Run `npm run check`, then build and preview the site to confirm the requested copy or template change on the homepage.
