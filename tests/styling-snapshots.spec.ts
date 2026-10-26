import { test, expect, type Page } from "@playwright/test";
// USMR 14.13: snapshot every production theme from the same typed tuple as Tweaks.
import { THEMES } from "../src/scripts/tweaks-state.ts";
import { waitForRealFonts } from "./helpers/real-fonts.js";
import { waitForTrustChainFinalDecision } from "./helpers/trust-chain-hydration.js";

/**
 * Styling-architecture visual reference suite.
 *
 * Captures home sections, /platform pillars, and /vision rendered across the
 * THEMES array (currently 2 — twilight + midnight; pre-pt167 was 3 with slate)
 * × 3 breakpoints. These snapshots
 * are NOT a refactor diff — the styling refactor already shipped, and no
 * pre-refactor baseline exists. This suite is a forward baseline: future
 * styling changes diff against these images. For an intentional visual
 * change, merge it to main, dispatch update-snapshots on main, then push a
 * follow-up commit to main or open/update a PR to trigger a fresh comparison
 * against the new baselines.
 *
 * Authoritative baselines are Linux-pinned (Playwright names files
 * `*-chromium-linux.png` on ubuntu runners). The
 * `.github/workflows/playwright.yml` update-snapshots job runs on
 * `workflow_dispatch` of main and auto-commits Linux baselines. The
 * visual-regression job is skipped for that event, and the GITHUB_TOKEN push
 * does not start a new run. Use a follow-up main push or a new/updated PR to
 * compare against the new baselines. Local darwin runs produce
 * `*-chromium-darwin.png` for spot-checks but are NOT committed.
 *
 * Run locally:  VISUAL_REGRESSION=1 npx playwright test styling-snapshots.spec.ts
 * Update (CI):  workflow_dispatch on main; then main push or new/updated PR
 */

const runVisualRegression = process.env.VISUAL_REGRESSION === "1";

const BREAKPOINTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
] as const;

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

test.describe("Home (/) - THEMES × 3 breakpoints reference", () => {
  test.setTimeout(45_000);

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
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
        if (bp.name !== "mobile") {
          await waitForTrustChainFinalDecision(page);
        }
        // Hero (above-the-fold) — covers USMR Phase 5.1a content.
        await expect(page).toHaveScreenshot(
          `home-hero-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`onramp — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
        // Scroll the on-ramp section into view, then snapshot the viewport.
        // Covers USMR Phase 5.1b content (design-partner card + contacts).
        await page.locator("#get-started").scrollIntoViewIfNeeded();
        await expect(page).toHaveScreenshot(
          `home-onramp-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`explore — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
        // Scroll the current home explore grid into view. The former
        // #platform pillar section has moved to /platform.
        await page.locator("#playground").scrollIntoViewIfNeeded();
        await expect(page).toHaveScreenshot(
          `home-explore-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });

      test(`writing-strip — ${theme} @ ${bp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
        // Scroll the latest-writing strip into view. Covers USMR
        // Phase 5.1f content (3-up grid sourced from the writing
        // collection).
        await page.locator("#writing").scrollIntoViewIfNeeded();
        await expect(page).toHaveScreenshot(
          `home-writing-strip-${theme}-${bp.name}.png`,
          { fullPage: false, animations: "disabled" },
        );
      });
    }
  }
});

test.describe("/platform pillars - THEMES × 3 breakpoints reference", () => {
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
      test("pillars — " + theme + " @ " + bp.name, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto("/platform", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
        const pillars = page.locator("#pillars");
        await pillars.scrollIntoViewIfNeeded();
        await expect(pillars).toBeVisible();
        await expect(pillars).toHaveScreenshot(
          "platform-pillars-" + theme + "-" + bp.name + ".png",
          { animations: "disabled" },
        );
      });
    }
  }
});

test.describe("Styling architecture - THEMES × 3 breakpoints reference", () => {
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
        await page.goto("/vision", { waitUntil: "domcontentloaded" });
        await setTheme(page, theme);
        await waitForRealFonts(page);
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
