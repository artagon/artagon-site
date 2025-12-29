## ADDED Requirements

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
