# Automated Testing

This directory contains automated tests for the Artagon Web site using [Playwright](https://playwright.dev/).

## Test Structure

```
tests/
├── vision-page.spec.ts          # Vision page functional and visual regression tests
├── content-collections.spec.ts  # Content Collections schema validation tests
└── README.md                    # This file
```

## Running Tests Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

This opens the Playwright UI where you can:
- See all tests
- Run tests individually
- Debug failures
- View screenshots and traces

### Run Tests in Headed Mode

```bash
npm run test:headed
```

See the browser while tests run (useful for debugging).

### Update Visual Snapshots

```bash
npm run test:update-snapshots
```

Run this after intentional visual changes to update baseline screenshots.

### Run Specific Tests

```bash
# Run only vision page tests
npx playwright test vision-page

# Run only content collections tests
npx playwright test content-collections

# Run tests matching a pattern
npx playwright test --grep "visual regression"

# Run tests on specific browser
npx playwright test --project=chromium
```

## Test Types

### 1. Functional Tests

Test that page functionality works correctly:
- Page title and meta tags
- Content rendering
- Section structure
- Card counts and content
- Interactive elements

**Example:**
```typescript
test('should render three domain cards', async ({ page }) => {
  const domainCards = page.locator('.domain-card');
  await expect(domainCards).toHaveCount(3);
});
```

### 2. Visual Regression Tests

Compare screenshots against baselines to detect unintended visual changes:
- Full page screenshots
- Component screenshots
- Different viewport sizes

**Example:**
```typescript
test('visual regression - full page screenshot', async ({ page }) => {
  await expect(page).toHaveScreenshot('vision-page-full.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
```

When visual changes are intentional, update baselines:
```bash
npm run test:update-snapshots
```

### 3. Schema Validation Tests

Test Content Collections schema enforcement:
- Required fields validation
- Type checking
- Optional field handling

**Example:**
```typescript
test('should validate required frontmatter fields', () => {
  // Test that missing required fields cause build failure
});
```

### 4. Accessibility Tests

Test accessibility features:
- Semantic HTML
- Heading hierarchy
- ARIA attributes
- Keyboard navigation

**Example:**
```typescript
test('should have proper accessibility attributes', async ({ page }) => {
  await expect(page.locator('article.vision-doc')).toBeVisible();
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
});
```

### 5. Responsive Tests

Test layout at different viewport sizes:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

**Example:**
```typescript
test('should be responsive on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  // Test mobile layout
});
```

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Push to `main` or `feature/*` branches
- Pull requests to `main`
- Manual workflow dispatch

### Workflow: `.github/workflows/playwright.yml`

**Jobs:**
1. **test** - Run all tests in parallel (3 shards)
2. **visual-regression** - Run visual regression tests
3. **accessibility** - Run accessibility tests
4. **merge-reports** - Combine test reports from shards

**Artifacts:**
- Test reports (HTML)
- Screenshots on failure
- Visual regression diffs

View test results:
1. Go to GitHub Actions tab
2. Click on the workflow run
3. Download artifacts or view in-line results

## Debugging Failures

### View Test Report

```bash
npx playwright show-report
```

Opens an HTML report with:
- Test results
- Screenshots
- Video recordings
- Trace viewer

### Debug in VS Code

Install [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension.

Features:
- Run/debug tests from editor
- Set breakpoints
- Step through tests
- View DOM snapshots

### Trace Viewer

```bash
npx playwright test --trace on
npx playwright show-trace test-results/.../trace.zip
```

Interactive trace viewer shows:
- Actions taken
- DOM snapshots at each step
- Network activity
- Console logs

## Writing New Tests

### Test File Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('.some-element');

    // Act
    await element.click();

    // Assert
    await expect(element).toHaveText('Expected text');
  });
});
```

### Best Practices

1. **Use descriptive test names**
   ```typescript
   // Good
   test('should render hero section with mission statement', ...)

   // Bad
   test('test1', ...)
   ```

2. **Use proper locators**
   ```typescript
   // Prefer role-based or text-based locators
   page.getByRole('button', { name: 'Submit' })
   page.getByText('Welcome')

   // Avoid brittle CSS selectors when possible
   page.locator('.btn.btn-primary.btn-lg') // brittle
   ```

3. **Wait for proper states**
   ```typescript
   await page.waitForLoadState('networkidle');
   await expect(element).toBeVisible();
   ```

4. **Isolate tests**
   - Each test should be independent
   - Use `beforeEach` for common setup
   - Clean up in `afterEach` if needed

5. **Group related tests**
   ```typescript
   test.describe('Vision Page', () => {
     test.describe('Hero Section', () => {
       // Hero-related tests
     });

     test.describe('Domain Cards', () => {
       // Card-related tests
     });
   });
   ```

## Configuration

Playwright configuration: `playwright.config.ts`

Key settings:
- **testDir**: `./tests`
- **workers**: Parallel execution (1 on CI, unlimited locally)
- **retries**: 2 on CI, 0 locally
- **browsers**: Chromium, Firefox, WebKit, Mobile Chrome/Safari
- **webServer**: Auto-starts preview server on http://localhost:4321

## Troubleshooting

### Tests timing out

Increase timeout in test or config:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Flaky tests

Use auto-waiting and proper assertions:
```typescript
// Don't use hard waits
await page.waitForTimeout(1000); // Bad

// Use auto-waiting locators
await expect(element).toBeVisible(); // Good
```

### Visual regression failures

1. Review diff in test report
2. If change is intentional:
   ```bash
   npm run test:update-snapshots
   ```
3. Commit updated snapshots

### Browser not found

Reinstall browsers:
```bash
npx playwright install --with-deps
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)
