## Why

Currently, long-form content (specifically the Vision page at `/vision`) is hardcoded directly into Astro page templates (`.astro` files) mixed with HTML and CSS. This violates separation of concerns, makes the content difficult for non-developers to edit, and complicates future localization or content repurposing.

## What Changes

- **Refactor to Content Collections:** Implement Astro Content Collections to manage long-form content.
- **Migrate Vision Page:** Move the content from `src/pages/vision/index.astro` to a Markdown file in `src/content/`.
- **Schema Validation:** Define a strict Zod schema for the content metadata to ensure data integrity.

## Impact

- **Affected Specs:** `site-content` (New Capability)
- **Affected Code:**
    - `src/pages/vision/index.astro` (Logic overhaul)
    - `src/content/config.ts` (New file/Config)
    - `src/content/pages/vision.md` (New file)
