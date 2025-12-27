## Why

The current styling implementation suffers from duplication and maintenance challenges. Specifically, `src/pages/vision/index.astro` contains a large block (~300 lines) of scoped CSS that duplicates patterns found in `public/assets/theme.css` and `src/pages/index.astro` (e.g., `.card`, `.hero-section`). This lack of abstraction makes it difficult to maintain a consistent design system across the site.

## What Changes

- **Extract Components:** Identify and extract reusable UI components from `src/pages/vision/index.astro` (e.g., `Card`, `SectionHeader`, `FeatureList`).
- **Global Styles:** Move common utility classes (like `.hero-section`, `.highlight-box`) to the global `public/assets/theme.css` or a new CSS layer if appropriate.
- **Refactor Vision Page:** Update `src/pages/vision/index.astro` to use these new components and global styles, removing the duplicated CSS block.

## Impact

- **Affected Specs:** `style-system` (New Capability)
- **Affected Code:**
    - `src/pages/vision/index.astro` (Heavy refactor)
    - `public/assets/theme.css` (additions)
    - `src/components/ui/` (New directory for UI primitives)
