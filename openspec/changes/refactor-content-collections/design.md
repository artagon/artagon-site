## Context

The site uses Astro, which provides "Content Collections" for type-safe content management. We want to leverage this for standard pages that have rich content structure.

## Goals / Non-Goals

- **Goals:**
    - Type-safe content frontmatter.
    - Separation of content (MDX) and layout (Astro).
    - Preserved visual design.
- **Non-Goals:**
    - Refactoring the entire site's content (e.g., landing page features) in this first pass. Focus is on the "Vision" page as the pilot.

## Decisions

- **Collection Name:** `pages`
    - Why: A generic collection for standalone pages like "Vision", "Terms", "Privacy" allows for a shared schema for standard page metadata (SEO title, description).

- **Format:** Markdown (`.md`)
    - Why: Markdown with embedded HTML provides sufficient flexibility for the Vision page content while avoiding the complexity of adding MDX integration.
    - The Vision page contains structured HTML (cards, grids, sections) that will be migrated as-is into the Markdown file.
    - Markdown natively supports HTML, so all existing structure is preserved.
    - This approach separates content from the page template logic without requiring additional dependencies.

- **Content Strategy:**
    - **Migrate HTML structure to Markdown:** The entire article content (sections, cards, grids) will move to `src/content/pages/vision.mdx`
    - **Keep layout in Astro:** The page wrapper (`BaseLayout`, `Header`, `Footer`) stays in `src/pages/vision/index.astro`
    - **Handle CSS:** Component-specific styles will remain scoped in the page template but we'll explore moving reusable patterns to global theme in a future refactor (see `refactor-styling-architecture`)

- **Custom Components:**
    - No custom Astro components are currently used in the Vision page
    - Future enhancement: If MDX integration is added, pages could import components, but this is out of scope for this change

## Schema

```typescript
const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero: z.object({
      title: z.string(),
      subtitle: z.string(),
      missionText: z.string(),
    }).optional(),
  }),
});
```
