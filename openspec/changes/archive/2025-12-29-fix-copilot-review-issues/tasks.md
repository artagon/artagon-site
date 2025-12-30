## 1. Spec Updates

- [x] 1.1 Add site-content spec delta for formatting and safe FAQ rendering.

## 2. Implementation

- [x] 2.1 Normalize indentation in `src/content/pages/vision.mdx`.
- [x] 2.2 Convert FAQ answers to Markdown in `src/data/faq.ts`.
- [x] 2.3 Replace `set:html` usage with Markdown rendering in `src/components/FaqItem.astro`.
- [x] 2.4 Add or update tests to verify FAQ markdown rendering.

## 3. Validation

- [x] 3.1 Run `openspec validate fix-copilot-review-issues --strict`.
