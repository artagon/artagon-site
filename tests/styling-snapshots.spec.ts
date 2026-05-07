import { test, expect, type Page } from "@playwright/test";

/**
 * Styling-architecture visual reference suite.
 *
 * Captures /vision rendered across 3 themes × 3 breakpoints. These snapshots
 * are NOT a refactor diff — the styling refactor already shipped, and no
 * pre-refactor baseline exists. This suite is a forward baseline: future
 * styling changes diff against these images. When intentional redesigns
 * land, regenerate via `--update-snapshots` and commit the new baseline as
 * part of that change.
 *
 * Authoritative baselines are Linux-pinned (Playwright names files
 * `*-chromium-linux.png` on ubuntu runners). Run via the
 * `.github/workflows/playwright.yml` visual-regression job's
 * `workflow_dispatch` mode to regenerate; the workflow auto-commits on
 * that path. Local darwin runs produce `*-chromium-darwin.png` which are
 * useful for spot-checks but NOT committed — they would not match CI.
 *
 * Run locally:  VISUAL_REGRESSION=1 npx playwright test styling-snapshots.spec.ts
 * Update (CI):  workflow_dispatch on .github/workflows/playwright.yml
 */

const runVisualRegression = process.env.VISUAL_REGRESSION === "1";

const BREAKPOINTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
] as const;

const THEMES = ["midnight", "twilight", "slate"] as const;

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

test.describe("Home (/) - 3 themes × 3 breakpoints reference", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !runVisualRegression,
      "Visual regression runs only when VISUAL_REGRESSION=1.",
    );
    test.skip(
      testInfo.project.name !== "chromium",
      "Snapshots are captured in chromium only to keep the baseline set bounded.",
    );
  });

  for (const theme of THEMES) {
    for (const bp of BREAKPOINTS) {
      test(`hero — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/");
        await setTheme(page, theme);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(200);
        // Hero (above-the-fold) — covers USMR Phase 5.1a content.
        await expect(page).toHaveScreenshot(
          `home-hero-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`onramp — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/");
        await setTheme(page, theme);
        await page.waitForLoadState("networkidle");
        // Scroll the on-ramp section into view, then snapshot the viewport.
        // Covers USMR Phase 5.1b content (design-partner card + contacts).
        await page.locator("#get-started").scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(
          `home-onramp-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`pillars — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/");
        await setTheme(page, theme);
        await page.waitForLoadState("networkidle");
        // Scroll the #platform pillar grid into view. Covers USMR
        // Phase 5.1c content (3-card pillar overview sourced from
        // src/data/pillars.ts).
        await page.locator("#platform").scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(
          `home-pillars-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`writing-strip — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/");
        await setTheme(page, theme);
        await page.waitForLoadState("networkidle");
        // Scroll the latest-writing strip into view. Covers USMR
        // Phase 5.1f content (3-up grid sourced from the writing
        // collection).
        await page.locator("#writing").scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(
          `home-writing-strip-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });
    }
  }
});

test.describe("Styling architecture - 3 themes × 3 breakpoints reference", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !runVisualRegression,
      "Visual regression runs only when VISUAL_REGRESSION=1.",
    );
    test.skip(
      testInfo.project.name !== "chromium",
      "Snapshots are captured in chromium only to keep the baseline set bounded.",
    );
  });

  for (const theme of THEMES) {
    for (const bp of BREAKPOINTS) {
      test(`${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/vision");
        await setTheme(page, theme);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(200);
        // Capture above-the-fold only. fullPage screenshots of the long-form
        // /vision document produced 4 MB PNGs each (36 MB × 9 permutations);
        // most styling regressions surface in the hero + first section of
        // cards, which the viewport already shows. Use the explicit
        // styling-snapshots.spec scoped fragment tests for finer detail.
        await expect(page).toHaveScreenshot(`vision-${theme}-${bp.name}.png`, {
          fullPage: false,
          animations: "disabled",
        });
      });
    }
  }
});
