# Proposal: Fix Remaining Copilot Review Issues

## Problem Statement

Two issues identified in Copilot PR review for Content Collections refactoring (#3) remain unaddressed:

1. **Code Quality**: Content file formatting inconsistency
   - `src/content/pages/vision.md` has inconsistent indentation (4 spaces instead of standard 2)
   - Makes the file harder to maintain and read
   - Violates standard Markdown/HTML formatting conventions

2. **Security**: Potential XSS vulnerability in FAQ component
   - `src/components/FaqItem.astro` uses `set:html` for answer rendering
   - Currently safe (hardcoded data in `src/data/faq.ts`)
   - Future risk if extended to dynamic content or CMS integration
   - Could lead to XSS exploitation with untrusted HTML

## Proposed Solution

### 1. Normalize Vision Page Indentation

**File:** `src/content/pages/vision.md`

- Standardize all HTML indentation to 2 spaces (Prettier/web standard)
- Maintain existing structure and content unchanged
- Improve code readability and maintainability

### 2. Replace `set:html` with Safe Markdown Rendering

**Files:**
- `src/components/FaqItem.astro`
- `src/data/faq.ts`

**Approach:**

Convert FAQ answers from HTML strings to Markdown strings and use Astro's `<Content />` rendering:

```typescript
// Before (vulnerable)
<div set:html={answer} />

// After (safe)
<Content />
```

**Benefits:**
- Eliminates XSS risk entirely
- Maintains formatting capabilities (bold, italics, links, lists)
- Future-proof for CMS integration
- Follows Astro best practices (same pattern as vision.md)

**Migration:**
- Convert existing HTML in `faq.ts` to Markdown format
- Update `FaqItem.astro` to accept Markdown
- Use Astro's built-in sanitization via Content Collections or `marked` library

## Scope

**In Scope:**
- Reformat vision.md indentation
- Refactor FAQ component to use Markdown
- Convert FAQ data from HTML to Markdown
- Test all FAQ entries render correctly

**Out of Scope:**
- Other pages' formatting (separate cleanup if needed)
- Other components using `set:html` (to be addressed separately if found)

## Impact

**Risk Level:** Low
- Changes are non-breaking (visual output remains identical)
- FAQ functionality preserved
- No new dependencies required (use built-in Astro markdown rendering)

**Affected Pages:**
- `/vision/` - Formatting only (no visual change)
- `/faq/` - Rendering method changes (visual output identical)

## Success Criteria

1. Vision.md passes linting with consistent 2-space indentation
2. All FAQ entries render identically before/after refactor
3. FAQ component no longer uses `set:html`
4. Copilot review shows 16/16 comments addressed
5. All tests pass (existing Playwright tests)

## Implementation Strategy

1. Create GitHub issue
2. Create feature branch
3. Fix vision.md formatting (automated with Prettier)
4. Refactor FAQ to Markdown rendering
5. Test visual parity
6. Create PR
7. Merge after approval
