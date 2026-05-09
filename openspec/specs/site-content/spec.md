# site-content Specification

## Purpose

This capability defines the contracts that govern how long-form
content (Vision, FAQ, Writing posts, page-level frontmatter) is
authored, validated, and rendered across the artagon-site Astro
build. Content lives in Astro Content Collections (`src/content/`)
with Zod-typed schemas; presentation is decoupled from content
authoring so non-engineering contributors can edit MDX/Markdown
without touching component templates. The capability was created
by archiving the `refactor-content-collections` change
(`openspec/changes/archive/2025-12-29-refactor-content-collections/`)
and has since been MODIFIED by `update-site-marketing-redesign` for
USMR Phase 4.x frontmatter contracts (eyebrow, headline, lede,
ctas[], optional bridge / on-ramp / accent / tags / heroFont).

## Requirements

### Requirement: Content Collections

Long-form content pages SHALL be implemented using Astro Content Collections to ensure separation of content and presentation.

#### Scenario: Vision Page Content

- **WHEN** a developer edits `src/content/pages/vision.mdx`
- **THEN** the changes are reflected on the `/vision` route without modifying the page template logic.

### Requirement: Type-Safe Content Schemas

All content collections MUST have a defined Zod schema to validate frontmatter metadata.

#### Scenario: Missing Metadata

- **WHEN** a content file is created without required frontmatter (e.g., `title`, `description`)
- **THEN** the build fails with a validation error.

### Requirement: Content markdown formatting is standardized

Content markdown files that include raw HTML SHALL use 2-space indentation for nested HTML elements.

#### Scenario: Vision content formatting

- **WHEN** a maintainer edits `src/content/pages/vision.mdx`
- **THEN** embedded HTML blocks use 2-space indentation and remain Prettier-compliant.

### Requirement: FAQ answers are rendered from Markdown

FAQ answers SHALL be stored as Markdown strings and rendered with Astro's Markdown pipeline (aligned with the project's content collection rendering); direct HTML injection via `set:html` MUST NOT be used.

#### Scenario: FAQ rendering avoids HTML injection

- **WHEN** FAQ items are rendered in `src/components/FaqItem.astro`
- **THEN** the component renders Markdown content and does not use `set:html`.

#### Scenario: FAQ data is Markdown

- **WHEN** FAQ answers are authored in `src/data/faq.ts`
- **THEN** the answers use Markdown formatting rather than raw HTML strings.

#### Scenario: Shared Markdown pipeline

- **WHEN** FAQ answers are rendered
- **THEN** the Markdown is processed through the project's configured Astro Markdown pipeline for consistent output with content collections.
