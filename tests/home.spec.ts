import { test, expect } from "@playwright/test";

/**
 * Behavioural coverage for `/`. Two distinct layers:
 *
 *   1. home.mdx parse smoke — proves the content-collection schema +
 *      frontmatter wiring resolves end-to-end. A typo in `home.mdx` (e.g.
 *      drops `headline` or mistypes a Zod-validated key) crashes
 *      `astro build` only — silent in vitest, silent in dev until someone
 *      hits `/`. These tests are the smallest gate that surfaces the
 *      crash on every PR.
 *
 *   2. TrustChainIsland interactivity — the React island ships a
 *      scenario picker (click dot → swap chain) and a hover-to-claim
 *      affordance (hover/focus stage row → swap decision card). Visual
 *      snapshots only capture the SSR default state, so all behavioural
 *      regressions ship green without these tests.
 *
 * Tests run on every PR (no `VISUAL_REGRESSION=1` gate); they're cheap
 * (one `page.goto` per test, no per-theme/per-breakpoint sweep). The
 * `data-astro-cid` selectors are intentionally avoided — we target
 * stable BEM classnames + ids that the component contract explicitly
 * exposes.
 */

test.describe("Home (/) — content parse + render smoke", () => {
  test("home.mdx renders the expected hero + sections", async ({ page }) => {
    await page.goto("/");
    // Hero (USMR 5.1a): non-empty headline from home.mdx frontmatter.
    await expect(page.locator("h1#hero-h1")).not.toBeEmpty();
    await expect(page.locator("p#hero-sub")).not.toBeEmpty();
    // Pillar grid (5.1c): 3 #pillar-* cards from PILLARS const.
    await expect(page.locator("#pillar-identity")).toBeVisible();
    await expect(page.locator("#pillar-credentials")).toBeVisible();
    await expect(page.locator("#pillar-authorization")).toBeVisible();
    // Latest-writing strip (5.1f).
    await expect(page.locator("#writing")).toBeVisible();
    // On-ramp card (5.1b).
    await expect(page.locator("#get-started")).toBeVisible();
  });
});

test.describe("Home (/) — TrustChainIsland interactivity (desktop / mouse)", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Mouse-driven interactions: scenario-picker dots are 9px (sub-tappable on touch) and hover is unsupported on touch devices. See Mobile-specific tests below.",
  );

  test("scenario picker click swaps the decision card to a DENY scenario", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Default scenarioIdx=0 is the healthy PERMIT scenario (SSR state).
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=PERMIT",
    );
    // 2nd dot is SCENARIOS[1] ("Jailbroken phone · blocked", DENY).
    const dots = page.locator(".trust-chain__scenario-dot");
    await dots.nth(1).click();
    // Wait for the picker state to flip first (proves the React handler
    // ran post-hydration); the decision-claim text follows.
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=DENY",
    );
    await expect(page.locator(".trust-chain__decision")).toHaveClass(/is-deny/);
  });

  test("hovering a stage row swaps the decision claim to that stage's pass string", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("#trust-chain-passkey").hover();
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "user.webauthn.verified",
    );
    // Mousing out should restore the scenario's finalClaim.
    await page.mouse.move(0, 0);
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=PERMIT",
    );
  });
});

test.describe("Home (/) — visual contracts (5.1p slices)", () => {
  // Per-slice contract assertions that document the structural
  // commitments of the 5.1p delta close-out. Run on chromium only —
  // these check DOM structure / computed styles, not pixels (the
  // styling-snapshots suite owns visual regression).
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Visual-contract checks run on chromium only.",
    );
  });

  test("5.1p.3 — hero lede uses .lead, NOT .sub", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const lede = page.locator("#hero-sub");
    await expect(lede).toHaveClass(/lead/);
    await expect(lede).not.toHaveClass(/sub/);
  });

  test("5.1p.2 — hero h1 has no animation (no rainbow-shift)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const animationName = await page
      .locator("#hero-h1")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe("none");
  });

  test("5.1p.6 — hero .btn rules have no ::before content (legacy glyphs suppressed)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const btn = page.locator(".hero .btn").first();
    const beforeContent = await btn.evaluate(
      (el) => getComputedStyle(el, "::before").content,
    );
    // `content: none` resolves to `none` in the computed-style API.
    // Anything else (e.g., `"◆"`) means the legacy glyph still applies.
    expect(beforeContent).toBe("none");
  });

  test("5.1p.7 — trust-chain stage wrappers render the connector line (except the last)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const wraps = page.locator(".trust-chain__stage-wrap");
    await expect(wraps).toHaveCount(5);
    // The first 4 wrappers SHOULD render an ::after connector.
    for (let i = 0; i < 4; i++) {
      const afterContent = await wraps
        .nth(i)
        .evaluate((el) => getComputedStyle(el, "::after").content);
      expect(afterContent, `wrapper #${i} should have ::after content`).toBe(
        '""',
      );
    }
    // The last wrapper has `:not(:last-child)` excluded, so no ::after.
    const lastAfter = await wraps
      .nth(4)
      .evaluate((el) => getComputedStyle(el, "::after").content);
    expect(lastAfter, "last wrapper should NOT have ::after content").toBe(
      "none",
    );
  });
});

test.describe("Home (/) — TrustChainIsland a11y contract (all device classes)", () => {
  // Structural a11y assertions — no mouse / touch / hover required, so
  // they run on every project (desktop, mobile, tablet, TV).
  test("stage rows are keyboard-focusable + describe the live decision region", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The component contract: every stage row carries `tabIndex={0}` +
    // `role="button"` so it appears in the keyboard-tab order. We assert
    // the contract structurally rather than by event-driven simulation —
    // React's synthetic onFocus doesn't fire reliably from
    // `locator.focus()` / `dispatchEvent("focus")` through the
    // astro-island wrapper in chromium headless, but the focusable
    // contract is what matters for a11y and is the actual regression
    // surface (a future refactor that drops `tabIndex={0}` or `role`
    // would fail this test).
    // Stage rows are real `<button>` elements wrapped in `<li>` per
    // 5.1p.1 (aria-required-children fix). Tabindex + role come from
    // the button's implicit accessibility tree, not literal attributes,
    // so the contract assertion shifts from `tabindex="0"` /
    // `role="button"` to "the element IS a button" + the explicit
    // ARIA hookup we author.
    const stageRows = page.locator(".trust-chain__stage");
    await expect(stageRows).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(stageRows.nth(i)).toHaveJSProperty("tagName", "BUTTON");
      await expect(stageRows.nth(i)).toHaveAttribute(
        "aria-describedby",
        "trust-chain-decision",
      );
    }
    // Decision card carries the live region the rows describe.
    await expect(page.locator("#trust-chain-decision")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
