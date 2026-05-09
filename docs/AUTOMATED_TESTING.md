# Automated Testing Implementation

Complete automated testing setup for Artagon Web using Playwright.

## Overview

Automated testing ensures code quality, prevents regressions, and validates that changes don't break existing functionality. This implementation provides comprehensive coverage across functional, visual, accessibility, and schema validation testing.

## What Was Implemented

### 1. Playwright Test Framework

**Package:** `@playwright/test@1.59.1` (per `package.json`)

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
- All 11 sections with numbered headers (01-11)
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

- Config file existence (`src/content.config.ts` — Astro v6 path; was `src/content/config.ts` pre-v6)
- Content file existence (`src/content/pages/vision.mdx`)
- Page template using `getEntry()` + standalone `render()` API (v6 replaced `entry.render()`)

### 3. GitHub Actions Workflow

**File:** `.github/workflows/playwright.yml`

**Jobs:**

1. **test** - Run all tests (5 shards per `TOTAL_SHARDS: 5` in `.github/workflows/playwright.yml:22`)
   - Installs dependencies (`npm ci`, frozen lockfile)
   - Installs Playwright browsers (chromium / firefox / webkit bundled in CI image; Edge + Chrome stable channels installed via `npx playwright install msedge` / `chrome`)
   - Builds site (runs prebuild → astro build → 10-step postbuild)
   - Runs tests in parallel (1/5, 2/5, 3/5, 4/5, 5/5 shards)
   - Uploads per-shard test reports + screenshots on failure (14-day retention)

2. **merge-reports** - Combines shard results
   - Downloads all 5 shard reports
   - Merges into single HTML report
   - Uploads merged report artifact

3. **visual-regression** - Visual regression suite (`VISUAL_REGRESSION=1`)
   - Workflow invokes `tests/vision-page.spec.ts` + `tests/styling-snapshots.spec.ts` on 3 projects (chromium · webkit · Mobile Safari) per `playwright.yml:249,256`
   - The specs themselves currently skip non-chromium via `test.skip(testInfo.project.name !== "chromium", ...)` so net effect is chromium-only snapshot capture (the webkit / Mobile Safari Linux baselines do not exist yet — see AGENTS.md §Testing for the broader cross-engine guard via `tests/header.spec.ts` + `tests/home-axe.spec.ts`)
   - Uploads visual diffs on failure
   - On `workflow_dispatch`: regenerates baselines via `--update-snapshots` and auto-commits

4. **accessibility** - Accessibility audit
   - Runs `--grep "accessibility"` on 3 engines: chromium · webkit · Mobile Safari (per `playwright.yml:321`)
   - The axe-core gate at `tests/home-axe.spec.ts` is MANDATORY (pt5.1p.8 flipped from opt-in; per pt264 archaeology in AGENTS.md §Accessibility)
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

This section was originally a Phase-1-era snapshot (vision page only,
22 total tests). The redesign + a11y-coverage work that landed across
USMR Phase 5.x has expanded coverage substantially; the live tree in
[`tests/README.md`](../tests/README.md) is the authoritative source.

### Pages Covered

The full test suite now spans every live route (`/`, `/platform`,
`/vision`, `/roadmap`, `/faq`, `/use-cases`, `/standards`,
`/developers`, `/docs`, `/console`, `/search`, `/get-started`, `/how`,
`/status`, `/security`, `/privacy`, `/play`, `/bridge`, `/writing`,
`/writing/[slug]`, `/writing/feed.xml`, `/404` per
[`openspec/project.md`](../openspec/project.md)). Per-route Playwright
specs live under `tests/`; structural / schema / token gates live in
`tests/lint-*.test.mts` (vitest). Browser-engine breadth and the
chromium-only visual-snapshot scope are documented in
[`AGENTS.md`](../AGENTS.md) §Testing.

### Test Counts (authoritative)

Run the suites locally to get current counts:

- `npm run test:vitest -- --run` — vitest unit + lint suite
- `npm run test:ci` — Playwright suite under the canonical project
  matrix (5 shards in CI)

The Phase-1-era 22-test fixed table that previously appeared here was
retired in pt233 because it drifted under every USMR-Phase increment;
no static count survives the next iteration in the active redesign
loop.

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
page.getByRole("heading", { level: 1 });
page.getByText("Executive Summary");

// Avoid brittle selectors
page.locator("div.container > div:nth-child(3)"); // Bad
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
  await page.goto("/vision/"); // Fresh page for each test
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

1. Create `tests/<page-name>.spec.ts`
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
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("should have no accessibility violations", async ({ page }) => {
  await page.goto("/vision/");

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Performance Considerations

### Parallel Execution

Tests run in parallel for speed:

- **Local:** Unlimited workers (based on CPU cores)
- **CI:** 5 shards per `TOTAL_SHARDS: 5` in `.github/workflows/playwright.yml:22` (shards 1/5–5/5; pre-pt234 was 3 shards before the device-matrix expansion required tighter parallelization)

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

## Enhancements

The original Phase-1-era "Future Enhancements" list shipped several
items that the doc was never re-narrated to reflect. Status as of
pt297 (most items ✅ SHIPPED, some still partial):

1. **Axe Accessibility Testing — ✅ SHIPPED**
   - `@axe-core/playwright` installed.
   - `tests/home-axe.spec.ts` runs WCAG 2.1 A + AA tags on
     chromium · webkit · Mobile Safari — gate is MANDATORY
     (flipped from opt-in in USMR Phase 5.1p.8 per pt264
     archaeology in `AGENTS.md` §Accessibility).

2. **Performance Testing — ✅ SHIPPED**
   - Lighthouse CI configured at `lighthouserc.json` (generated from `build.config.json` + `scripts/fixtures/lhci-assertions.json` per `scripts/sync-build-config.mjs`).
   - `scripts/lhci-serve.mjs` provides the LHCI local server with READY signal.
   - `.github/workflows/lighthouse.yml` runs Lighthouse audits on push to `main` (per pt262 README CI/CD section).
   - Thresholds: Performance ≥85% (warn), Accessibility ≥90% (error), Best Practices ≥90% (warn), SEO ≥90% (warn) per `scripts/fixtures/lhci-assertions.json`.

3. **E2E User Flows — ✅ PARTIALLY SHIPPED**
   - Header navigation: `tests/header.spec.ts` covers
     desktop nav + mobile hamburger menu (touch + keyboard).
   - Footer navigation: `tests/footer.spec.ts` covers 4×5
     column structure + Legal placeholders + brand/glyph.
   - Theme switching: `tests/canonical-typography.spec.ts`
     covers cross-route consistency.
   - Form-submission flows are out of scope today (the
     marketing site has no live form submissions; the
     `/get-started` design-partner page is a `mailto:` link).

4. **Content Collections Validation — ✅ SHIPPED**
   - `tests/content-collections.spec.ts` validates the Zod
     schema enforcement at build time (chromium-only because
     it mutates `src/content/pages/*.mdx` and would race
     across parallel browser projects per `tests/README.md`
     gating notes).
   - `tests/writing-collection.test.mts` (vitest) validates
     writing post frontmatter + author references.

5. **Cross-Device Testing — ✅ SHIPPED**
   - 15-device matrix per `playwright.config.ts` `projects[]`
     (5 desktop · 5 mobile · 3 tablet · 2 large) per pt276
     `tests/README.md` device-matrix expansion.
   - Touch interactions tested via `test.skip(({isMobile}) =>
isMobile, ...)` patterns; the `enhance-a11y-coverage`
     proposal (in flight) tracks the touch-affordance gap.

6. **Visual Regression on All Pages — ✅ PARTIALLY SHIPPED**
   - `tests/styling-snapshots.spec.ts` covers the home (`/`)
     and styling-architecture reference (`/vision`) on the
     THEMES array (currently 2: twilight + midnight) × 3
     breakpoints, chromium-only (per pt261 fix). The
     `enhance-a11y-coverage` proposal Phase 4 broadens this
     scope.

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
