## ADDED Requirements

### Requirement: Content Collections

Long-form content pages SHALL be implemented using Astro Content Collections to ensure separation of content and presentation.

#### Scenario: Vision Page Content
- **WHEN** a developer edits `src/content/pages/vision.md`
- **THEN** the changes are reflected on the `/vision` route without modifying the page template logic.

### Requirement: Type-Safe Content Schemas

All content collections MUST have a defined Zod schema to validate frontmatter metadata.

#### Scenario: Missing Metadata
- **WHEN** a content file is created without required frontmatter (e.g., `title`, `description`)
- **THEN** the build fails with a validation error.
