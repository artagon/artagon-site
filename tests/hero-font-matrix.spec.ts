import { test, expect } from "@playwright/test";

// USMR Phase 5.5.15 — Hero-font matrix gate. DESIGN.md §3.4 lists a
// 4-row matrix of `[data-hero-font]` variants (`grotesk` / `fraunces`
// / `dmserif` / `mono`) each with its own `--display-tracking` and
// `--display-weight` + `--f-emphasis` resolution. The earlier
// `tests/home.spec.ts` only exercised `fraunces`. This spec covers
// the full matrix so a regression on any per-face tracking / weight /
// emphasis-face cascade fails CI before the canonical-fidelity drift
// reaches users.
//
// Closes the phantom-test claim DESIGN.md §3.4 had been making since
// Phase 5.2.7 — "the `tests/hero-font-matrix.spec.ts` Playwright
// contract gates the table against future regressions" was authored
// before the file existed.

interface Variant {
  attr: "grotesk" | "fraunces" | "dmserif" | "mono";
  /** First family token in the canonical `--f-display` stack. */
  expectedFamilyHead: RegExp;
  expectedTracking: string;
  expectedWeight: string;
  /**
   * `--f-emphasis` resolution per Phase 5.2.5 + DESIGN.md §3.4
   * "Hero display override" line 326 (the 4 × 2 emphasis-span audit
   * matrix; pre-pt379 cite was incorrectly §6.25 which is the "404
   * page" component entry — unrelated to font emphasis): grotesk →
   * serif (editorial contrast); the other 3 inherit so italic stays
   * in-family.
   */
  emphasisInheritsParent: boolean;
}

const VARIANTS: readonly Variant[] = [
  {
    attr: "grotesk",
    expectedFamilyHead: /Space Grotesk/i,
    expectedTracking: "-0.035em",
    expectedWeight: "500",
    emphasisInheritsParent: false,
  },
  {
    attr: "fraunces",
    expectedFamilyHead: /Fraunces/i,
    expectedTracking: "-0.025em",
    expectedWeight: "400",
    emphasisInheritsParent: true,
  },
  {
    attr: "dmserif",
    expectedFamilyHead: /DM Serif Display/i,
    expectedTracking: "-0.015em",
    expectedWeight: "400",
    emphasisInheritsParent: true,
  },
  {
    attr: "mono",
    expectedFamilyHead: /JetBrains Mono/i,
    expectedTracking: "-0.04em",
    expectedWeight: "400",
    emphasisInheritsParent: true,
  },
];

for (const variant of VARIANTS) {
  test.describe(`[data-hero-font="${variant.attr}"]`, () => {
    test("resolves --f-display, --display-tracking, --display-weight per DESIGN.md §3.4", async ({
      page,
    }) => {
      await page.goto("/");
      await page.evaluate((attr) => {
        document.documentElement.setAttribute("data-hero-font", attr);
      }, variant.attr);

      // Resolve the cascading tokens off the document element. Using
      // getComputedStyle is more reliable than reading the inline rule
      // — it captures the actual cascade.
      const tokens = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return {
          fDisplay: cs.getPropertyValue("--f-display").trim(),
          tracking: cs.getPropertyValue("--display-tracking").trim(),
          weight: cs.getPropertyValue("--display-weight").trim(),
          fEmphasis: cs.getPropertyValue("--f-emphasis").trim(),
          fSerif: cs.getPropertyValue("--f-serif").trim(),
        };
      });

      expect(tokens.fDisplay, `--f-display under ${variant.attr}`).toMatch(
        variant.expectedFamilyHead,
      );
      expect(tokens.tracking, `--display-tracking under ${variant.attr}`).toBe(
        variant.expectedTracking,
      );
      expect(tokens.weight, `--display-weight under ${variant.attr}`).toBe(
        variant.expectedWeight,
      );

      if (variant.emphasisInheritsParent) {
        // For non-grotesk faces --f-emphasis is `inherit`; the
        // computed value resolves through the cascade. The browser
        // treats it as the parent's font-family — verify it's NOT
        // the literal serif stack.
        expect(
          tokens.fEmphasis,
          `--f-emphasis under ${variant.attr} should not equal --f-serif (inherit cascade)`,
        ).not.toBe(tokens.fSerif);
      } else {
        // Grotesk variant — emphasis swaps to serif explicitly.
        expect(
          tokens.fEmphasis,
          `--f-emphasis under grotesk should resolve to --f-serif`,
        ).toBe(tokens.fSerif);
      }
    });

    test("hero <h1> renders with the resolved face on the home page", async ({
      page,
    }) => {
      await page.goto("/");
      await page.evaluate((attr) => {
        document.documentElement.setAttribute("data-hero-font", attr);
      }, variant.attr);

      const h1FontFamily = await page
        .locator("h1#hero-h1")
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(h1FontFamily).toMatch(variant.expectedFamilyHead);
    });
  });
}
