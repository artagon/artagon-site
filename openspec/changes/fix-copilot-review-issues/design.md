# Design: Fix Remaining Copilot Review Issues

## Architecture

### 1. Vision Page Indentation Fix

**Current State:**
- Mixed indentation (4 spaces in some sections, 2 in others)
- Inconsistent with project Prettier config

**Target State:**
- Uniform 2-space indentation throughout
- Prettier-compliant formatting

**Implementation:**
```bash
# Run Prettier on vision.mdx
npx prettier --write src/content/pages/vision.mdx
```

### 2. FAQ XSS Vulnerability Fix

**Current Architecture:**

```
src/data/faq.ts
  └─> HTML strings
       └─> FaqItem.astro
            └─> set:html rendering (UNSAFE)
```

**Proposed Architecture:**

```
src/data/faq.ts
  └─> Markdown strings
       └─> FaqItem.astro
            └─> Astro Markdown rendering (SAFE)
```

## Implementation Approach

### Option A: Inline Markdown Rendering (Recommended)

Use Astro's `<Markdown />` component:

**faq.ts:**
```typescript
export const faqData = [
  {
    question: "What is Artagon?",
    answer: `Artagon is a **unified identity platform** that combines:
- High-assurance authentication (passkeys, WebAuthn)
- Verifiable credentials (SD-JWT, BBS+)
- Graph-based authorization (Zanzibar-style)`
  }
];
```

**FaqItem.astro:**
```astro
---
import { Markdown } from '@astrojs/markdown-remark';
const { question, answer } = Astro.props;
---

<details class="faq-item">
  <summary>{question}</summary>
  <div class="faq-answer">
    <Markdown content={answer} />
  </div>
</details>
```

### Option B: Content Collections (Over-engineered for this use case)

Would require creating `src/content/faq/*.md` files - unnecessary complexity for 20-30 FAQ items that rarely change.

### Option C: `marked` Library

```typescript
import { marked } from 'marked';

const htmlContent = marked(answer);
```

Still uses HTML rendering, just shifts the conversion point. Not recommended.

## Data Migration

### Current FAQ HTML Structure

```typescript
{
  question: "...",
  answer: `
    <p>...</p>
    <p><strong>Key features:</strong></p>
    <ul>
      <li><strong>Item:</strong> Description</li>
    </ul>
  `
}
```

### Target Markdown Structure

```typescript
{
  question: "...",
  answer: `
...

**Key features:**

- **Item:** Description
  `
}
```

### Conversion Rules

| HTML | Markdown |
|------|----------|
| `<p>text</p>` | `text\n\n` |
| `<strong>text</strong>` | `**text**` |
| `<em>text</em>` | `*text*` |
| `<ul><li>item</li></ul>` | `- item` |
| `<a href="url">text</a>` | `[text](url)` |
| `<code>text</code>` | `` `text` `` |

## File Changes

### Files to Modify

1. **src/data/faq.ts**
   - Convert all `answer` strings from HTML to Markdown
   - ~30 FAQ entries to convert

2. **src/components/FaqItem.astro**
   - Remove `set:html={answer}`
   - Add Markdown rendering component
   - Maintain existing CSS classes and structure

3. **src/pages/faq/index.astro**
   - No changes required (already passes data correctly)

## Testing Strategy

### Visual Regression

Compare before/after screenshots:
```bash
# Before changes
npm run preview
npx playwright screenshot http://localhost:4321/faq /tmp/faq-before.png

# After changes
npm run build && npm run preview
npx playwright screenshot http://localhost:4321/faq /tmp/faq-after.png

# Compare
compare /tmp/faq-before.png /tmp/faq-after.png /tmp/faq-diff.png
```

### Manual Testing

1. Verify all FAQ items expand/collapse
2. Check formatting (bold, italics, lists) renders correctly
3. Test search functionality still works
4. Verify schema.org markup intact

### Automated Tests

Add Playwright test for FAQ markdown rendering:

```typescript
test('FAQ answers render markdown correctly', async ({ page }) => {
  await page.goto('/faq/');

  // Expand first FAQ
  await page.click('[data-faq-item]:first-child summary');

  // Check for markdown-rendered elements
  const answer = page.locator('[data-faq-item]:first-child .faq-answer');
  await expect(answer.locator('strong')).toBeVisible();
  await expect(answer.locator('ul li')).toHaveCount(3);
});
```

## Security Analysis

### Current Risk

**Vulnerability:** XSS via `set:html`
**Severity:** Low (currently mitigated by hardcoded data)
**Attack Vector:** If FAQ data source changes to CMS/database with user input

**Example exploit (if data becomes dynamic):**
```typescript
answer: `<img src=x onerror="alert('XSS')">`
```

### Post-Fix Security

**Protection:** Markdown is parsed and sanitized by Astro
**Attack Vector Eliminated:** User input converted to text nodes
**Compliance:** Follows OWASP best practices

## Rollback Plan

If issues arise:
1. Git revert the commit
2. Redeploy previous version
3. FAQ data is in source control, safe to rollback

No database migration or external dependencies involved.
