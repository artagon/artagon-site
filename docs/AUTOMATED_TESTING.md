# Automated Testing Implementation

Complete automated testing setup for Artagon Web using Playwright.

## Overview

Automated testing ensures code quality, prevents regressions, and validates that changes don't break existing functionality. This implementation provides comprehensive coverage across functional, visual, accessibility, and schema validation testing.

## What Was Implemented

### 1. Playwright Test Framework

**Package:** `@playwright/test@1.57.0`

Playwright provides:
- Cross-browser testing (Chromium, Firefox, WebKit)
- Visual regression testing with screenshot comparison
- Built-in auto-waiting and retry logic
- Parallel test execution
- Rich debugging tools (trace viewer, UI mode)

### 2. Test Suites

#### **vision-page.spec.ts** - Vision Page Tests

Comprehensive testing for the refactored Vision page using Content Collections:

**Functional Tests:**
- Page title and meta tags validation
- Hero section rendering
- All 7 sections with numbered headers (01-07)
- Three domain cards (High-Assurance, Decentralized, Authorization)
- Three strategic pillars with numbers
- Interactive hover effects
- Responsive layout (mobile/desktop)
- Console error detection
- CSS loading verification

**Visual Regression Tests:**
- Full page screenshot
- Hero section screenshot
- Domain cards screenshot

**Accessibility Tests:**
- Semantic HTML validation (article, h1 hierarchy)
- Heading structure (single h1, multiple h2s)
- ARIA attributes

**Responsive Tests:**
- Mobile viewport (375x667)
- Tablet viewport
- Desktop viewport
- Flexbox direction changes
- Card stacking behavior

#### **content-collections.spec.ts** - Schema Validation Tests

Tests Content Collections schema enforcement:

**Schema Validation:**
- Required fields (`title`, `description`)
- Optional fields (`hero`)
- Nested object validation (`hero.title`, `hero.subtitle`, `hero.missionText`)
- Build failure on invalid schema

**File Structure:**
- Config file existence (`src/content/config.ts`)
- Content file existence (`src/content/pages/vision.md`)
- Page template using `getEntry()` API

### 3. GitHub Actions Workflow

**File:** `.github/workflows/playwright.yml`

**Jobs:**

1. **test** - Run all tests (3 shards for parallel execution)
   - Installs dependencies
   - Installs Playwright browsers
   - Builds site
   - Runs tests in parallel (1/3, 2/3, 3/3 shards)
   - Uploads test reports and screenshots

2. **merge-reports** - Combines shard results
   - Downloads all shard reports
   - Merges into single HTML report
   - Uploads merged report artifact

3. **visual-regression** - Visual regression only
   - Runs chromium-only visual tests
   - Uploads visual diffs on failure

4. **accessibility** - Accessibility tests only
   - Runs chromium-only a11y tests
   - Uploads failures for review

**Triggers:**
- Push to `main` or `feature/*` branches
- Pull requests to `main`
- Manual workflow dispatch

**Artifacts Retention:**
- Test reports: 30 days
- Screenshots/failures: 7 days

### 4. NPM Scripts

Added to `package.json`:

```json
{
  "test": "playwright test",
  "test:headed": "playwright test --headed",
  "test:ui": "playwright test --ui",
  "test:update-snapshots": "playwright test --update-snapshots",
  "test:ci": "playwright test --reporter=github"
}
```

### 5. Configuration

**playwright.config.ts:**
- Test directory: `./tests`
- Base URL: `http://localhost:4321`
- Auto-start preview server before tests
- Parallel execution (local: unlimited, CI: 1 worker)
- Retries: 0 locally, 2 on CI
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Reporters: HTML locally, GitHub on CI
- Screenshots on failure
- Traces on first retry

### 6. .gitignore

Added Playwright artifacts:
```
test-results/
playwright-report/
playwright/.cache/
```

## Usage Guide

### Local Development

```bash
# Install dependencies
npm install

# Install browsers (one-time)
npx playwright install

# Run all tests
npm test

# Run with UI (recommended for development)
npm run test:ui

# Update visual snapshots after intentional changes
npm run test:update-snapshots

# Run specific test file
npx playwright test vision-page

# Run tests matching pattern
npx playwright test --grep "visual regression"

# Run on specific browser
npx playwright test --project=chromium
```

### CI/CD

Tests run automatically on:
- Every push to `main` or `feature/*` branches
- Every pull request to `main`

View results:
1. Go to GitHub Actions tab
2. Click on workflow run
3. View inline results or download HTML report artifact

### Debugging

**View Test Report:**
```bash
npx playwright show-report
```

**Trace Viewer (for failures):**
```bash
npx playwright test --trace on
npx playwright show-trace test-results/.../trace.zip
```

**VS Code Extension:**
Install [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) for:
- Run/debug from editor
- Breakpoints
- Step-through debugging
- Live DOM inspection

## Test Coverage

### Pages Covered

- ✅ `/vision/` - Full coverage (functional, visual, a11y, responsive)
- 🔜 `/` - Homepage (to be added)
- 🔜 `/platform/` - Platform page (to be added)
- 🔜 `/roadmap/` - Roadmap page (to be added)
- 🔜 `/faq/` - FAQ page (to be added)

### Test Types

| Type | Count | Coverage |
|------|-------|----------|
| Functional | 12 | Vision page structure, content, interactions |
| Visual Regression | 3 | Full page, hero, cards |
| Accessibility | 2 | Semantic HTML, heading hierarchy |
| Responsive | 1 | Mobile viewport layout |
| Schema Validation | 4 | Content Collections schema enforcement |
| **Total** | **22** | **Vision page + Content Collections** |

## Benefits

### 1. Regression Prevention

Visual regression tests catch unintended changes:
- Layout shifts
- Styling regressions
- Component breakage
- Cross-browser inconsistencies

### 2. Confidence in Refactoring

Tests ensure refactoring doesn't break functionality:
- Content Collections migration validated
- Original rendering preserved
- Schema validation working

### 3. Faster Feedback

Automated tests provide immediate feedback:
- PRs show test status
- Failures visible before merge
- No manual testing required

### 4. Cross-Browser Coverage

Tests run on 5 browser configurations:
- Desktop: Chromium, Firefox, WebKit
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

### 5. Documentation

Tests serve as living documentation:
- Expected page structure
- Required elements
- Schema requirements

## Best Practices

### 1. Write Descriptive Test Names

```typescript
// Good
test('should render three domain cards with icons and titles', ...)

// Bad
test('test1', ...)
```

### 2. Use Stable Locators

```typescript
// Prefer role-based or text-based
page.getByRole('heading', { level: 1 })
page.getByText('Executive Summary')

// Avoid brittle selectors
page.locator('div.container > div:nth-child(3)') // Bad
```

### 3. Leverage Auto-Waiting

```typescript
// Playwright auto-waits for elements
await expect(element).toBeVisible(); // Waits automatically

// Avoid manual waits
await page.waitForTimeout(1000); // Avoid
```

### 4. Test Isolation

Each test should be independent:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/vision/'); // Fresh page for each test
});
```

### 5. Update Snapshots Intentionally

Only update visual snapshots after reviewing changes:
```bash
# Review diffs first
npm test

# If changes are intentional
npm run test:update-snapshots

# Commit updated snapshots
git add tests/*-snapshots
git commit -m "Update visual snapshots after design changes"
```

## Extending Tests

### Adding New Page Tests

1. Create `tests/[page-name].spec.ts`
2. Follow vision-page.spec.ts pattern
3. Include functional, visual, and a11y tests
4. Run `npm run test:update-snapshots` for initial baselines

### Adding Schema Tests

When adding new Content Collections:

1. Add validation tests in `content-collections.spec.ts`
2. Test required/optional fields
3. Test type validation
4. Test build failure on invalid schema

### Adding Accessibility Tests

Use Playwright's accessibility features:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/vision/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Performance Considerations

### Parallel Execution

Tests run in parallel for speed:
- **Local:** Unlimited workers (based on CPU cores)
- **CI:** 3 shards (1/3, 2/3, 3/3)

### Browser Optimization

For faster local development:
```bash
# Run only Chromium (fastest)
npx playwright test --project=chromium

# Skip visual regression (slow)
npx playwright test --grep-invert "visual regression"
```

### Caching

CI caches:
- npm dependencies
- Playwright browsers
- Build artifacts

## Troubleshooting

### Tests Timeout

Increase timeout:
```typescript
test.setTimeout(60000); // 60 seconds
```

Or globally in `playwright.config.ts`.

### Flaky Tests

If tests are flaky:
1. Check for race conditions
2. Use proper auto-waiting (`expect().toBeVisible()`)
3. Avoid hard-coded waits
4. Check for animations (disable if needed)

### Visual Regression Failures

1. View diff in test report
2. Determine if change is intentional
3. If yes: `npm run test:update-snapshots`
4. If no: fix the regression

### CI Failures, Local Pass

Common causes:
- Different viewport sizes
- Font rendering differences
- Timing issues (use retries on CI)
- Missing environment variables

## Future Enhancements

### Potential Additions

1. **Axe Accessibility Testing**
   - Install `@axe-core/playwright`
   - Add comprehensive a11y scans

2. **Performance Testing**
   - Add Lighthouse integration
   - Test Core Web Vitals
   - Monitor bundle sizes

3. **E2E User Flows**
   - Test complete user journeys
   - Form submissions
   - Navigation flows

4. **API Testing**
   - Test Content Collections API
   - Validate data fetching

5. **Cross-Device Testing**
   - Add more mobile viewports
   - Test touch interactions
   - Test orientation changes

6. **Visual Regression on All Pages**
   - Extend to all site pages
   - Automate baseline creation
   - Track design system changes

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Patterns](https://playwright.dev/docs/test-patterns)
- [CI/CD Guide](https://playwright.dev/docs/ci)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)

## Support

For testing questions or issues:
1. Check `tests/README.md`
2. Review test output and traces
3. Consult Playwright documentation
4. Open issue with test failure details
