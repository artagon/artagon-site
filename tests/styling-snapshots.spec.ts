import { test, expect, type Page } from "@playwright/test";

/**
 * Styling-architecture visual reference suite.
 *
 * Captures /vision rendered across 3 themes × 3 breakpoints. These snapshots
 * are NOT a refactor diff — the styling refactor (`refactor-styling-architecture`)
 * already shipped weeks ago, and no pre-refactor baseline exists. This suite
 * is a forward baseline: future styling changes diff against these images.
 *
 * Run with: VISUAL_REGRESSION=1 npx playwright test styling-snapshots.spec.ts
 * Update:   VISUAL_REGRESSION=1 npx playwright test styling-snapshots.spec.ts --update-snapshots
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
