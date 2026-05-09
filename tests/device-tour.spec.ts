import { test } from "@playwright/test";

/**
 * Per-device "tour" screenshot of `/`. Captures one above-the-fold PNG
 * for each playwright project (15 projects: chromium / firefox / webkit
 * / Edge / Chrome / Mobile Chrome × 3 / Mobile Safari × 2 / Tablet
 * Safari × 2 / Tablet Chrome / TV / TV 4K) and attaches it via
 * `testInfo.attach()` so the CI workflow uploads the resulting PNGs as
 * a single `device-tour` artifact. PR reviewers download the artifact
 * zip to scan device parity at a glance.
 *
 * This is NOT a snapshot diff — there is no Linux-pinned baseline to
 * compare against. The screenshots are evidence, not enforcement. The
 * real visual-regression gate lives in `tests/styling-snapshots.spec.ts`
 * with its committed `*-chromium-linux.png` / `*-webkit-linux.png` /
 * `*-Mobile-Safari-linux.png` triple per home section. Adding the tour
 * to enforcement would explode baseline storage; keeping it as
 * artifact-only is the deliberate trade.
 *
 * Browser-profile isolation: every Playwright project here is configured
 * via `devices[...]` in `playwright.config.ts`, which spins up an
 * ephemeral browser context per test. We deliberately do NOT use
 * `chromium.launchPersistentContext('/path/to/real/profile')` — that
 * would expose the developer's Edge / Chrome keychain to test runs and
 * is a security regression vector. Profiles stay isolated, no
 * keychain reads, no cookie persistence across tests.
 */

test.describe("Device tour — / above-the-fold per project", () => {
  test("home page above-the-fold screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const buf = await page.screenshot({
      fullPage: false,
      animations: "disabled",
    });
    // Filename includes the project name (Playwright sanitises it for
    // filesystem safety) so all 15 PNGs land in the same artifact zip
    // distinguishable at a glance.
    const safe = testInfo.project.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    await testInfo.attach(`tour-home-above-fold-${safe}.png`, {
      body: buf,
      contentType: "image/png",
    });
  });
});
