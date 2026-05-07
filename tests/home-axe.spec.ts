import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

/**
 * Automated WCAG audit on `/`. Uses axe-core via the @axe-core/playwright
 * adapter to walk the rendered DOM and assert zero violations against
 * the WCAG 2.1 AA ruleset (the standard baseline for public web
 * properties; tighter than 2.0 A and broader than 2.1 AAA).
 *
 * Coverage relative to the structural a11y assertions in
 * `tests/home.spec.ts`:
 *   - The structural test verifies the *contract* (tabIndex/role/
 *     aria-* attributes are present on the right elements).
 *   - This axe scan verifies the *implementation* (color contrast,
 *     ARIA usage validity, document-language, region/landmark coverage,
 *     image alt-text, etc.) across the rendered tree.
 *
 * Failure mode: a future commit that introduces e.g. `color: #999 on
 * #ccc` or a button without an accessible name fails this gate before
 * merge. The output includes which rule fired, which elements, and the
 * remediation pointer to deque.com/axe/.
 *
 * Mobile/tablet projects skip — axe-core's headless runner is reliable
 * on chromium / webkit only; the device-emulation projects re-render
 * the same DOM and would just multiply CI cost without finding new
 * violations. Run on chromium + webkit + Mobile Safari for engine
 * parity (matching the visual-regression and accessibility job scope).
 */

test.describe("Home (/) — automated WCAG 2.1 AA audit (axe-core)", () => {
  test.beforeEach(({}, testInfo) => {
    // USMR Phase 5.1p.8 — gate flipped from `AXE_AUDIT=1`-opt-in to
    // MANDATORY now that round-3 violations cleared (1 critical
    // `aria-required-children` fixed in 5.1p.1; 9 `color-contrast`
    // failures fixed in 5.1p.8). Future regressions block merge.
    // Engine scope stays narrow — chromium / webkit / Mobile Safari
    // catch the cross-engine focus-visible / forced-colors deltas
    // without ballooning CI.
    const allowed = new Set([
      "chromium",
      "webkit",
      "Mobile Safari",
      "Mobile Safari (iPhone 14 Pro Max)",
    ]);
    test.skip(
      !allowed.has(testInfo.project.name),
      `axe-core runs on chromium / webkit / Mobile Safari only (current project: ${testInfo.project.name}).`,
    );
  });

  test("zero WCAG 2.1 AA violations on /", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Disable the `region` rule for the on-ramp's contact `<dl>`
      // wrapped in an `<aside>` — axe flags landmarks-not-in-region for
      // the dl's child `<div>` but this is a structural pattern with
      // explicit aria-labelledby. Re-evaluate after the visual
      // transition (5.1l Header redesign) lands its proper landmark
      // tree.
      .disableRules([])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        `axe-core flagged ${results.violations.length} violation(s):`,
      );
      for (const v of results.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`    help: ${v.helpUrl}`);
        for (const node of v.nodes) {
          console.log(`    target: ${node.target.join(" ")}`);
          console.log(`    summary: ${node.failureSummary}`);
        }
      }
    }

    expect(results.violations).toEqual([]);
  });
});
