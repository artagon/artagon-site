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

test.describe("Home (/) — content split rendering (chromium)", () => {
  // USMR Phase 5.1q.9 — pin the headline split-on-`. ` and the eyebrow
  // ampersand-split shapes. Authors editing home.mdx that drop the
  // trailing period collapse the headline to a single line; using a
  // unicode `＆` instead of `&` bypasses the split. These tests catch
  // both regressions on every PR.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "DOM-shape checks; one engine covers the contract.",
    );
  });

  test("hero headline splits into 3 stacked lines (current home.mdx: 'Verified. Private. Attested.')", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const brCount = await page.locator("h1#hero-h1 br").count();
    // 3 sentence parts → 2 <br> elements between them. A regression to
    // a single-line headline produces 0 <br>s.
    expect(brCount).toBe(2);
  });

  test("hero eyebrow renders glow-amp `<em>` for the ampersand", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // The eyebrow string in home.mdx contains exactly one `&` ("for
    // machines & humans"). The split logic in index.astro emits one
    // `<em class="glow-amp">&</em>` per ampersand. A regression that
    // drops the ampersand split renders the literal `&` character.
    const ampCount = await page.locator(".glow-amp").count();
    expect(ampCount).toBeGreaterThanOrEqual(1);
    const ampText = await page.locator(".glow-amp").first().textContent();
    expect(ampText?.trim()).toBe("&");
  });
});

test.describe("Home (/) — scenario picker keyboard navigation (chromium / desktop)", () => {
  // USMR Phase 5.1q.6 — WAI-ARIA tablist keyboard pattern.
  test.skip(
    ({ isMobile }) => isMobile,
    "Keyboard nav simulation is desktop-only; tap-toggle on touch is in enhance-a11y-coverage.",
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Keyboard event simulation through the React island stays narrow to chromium.",
    );
  });

  test("ArrowRight from dot 0 advances to dot 1 and swaps the decision class", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const dots = page.locator(".trust-chain__scenario-dot");
    await dots.nth(0).focus();
    // Default scenarioIdx=0 is PERMIT.
    await expect(page.locator(".trust-chain__decision")).toHaveClass(
      /is-permit/,
    );
    await page.keyboard.press("ArrowRight");
    // SCENARIOS[1] is the DENY scenario (jailbroken phone).
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".trust-chain__decision")).toHaveClass(/is-deny/);
  });

  test("Home jumps to the first dot; End jumps to the last", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const dots = page.locator(".trust-chain__scenario-dot");
    const dotCount = await dots.count();
    await dots.nth(2).focus();
    await page.keyboard.press("End");
    await expect(dots.nth(dotCount - 1)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("Home");
    await expect(dots.nth(0)).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Home (/) — token paint contracts (chromium / desktop)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Token-paint checks read computed CSS variables; chromium covers the contract.",
    );
  });

  test("data-accent='violet' resolves --accent to a violet OKLCH (5.1o)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim(),
    );
    // The shipped violet sits in the 0.66 0.18 290 ± neighborhood (per
    // theme.css `[data-accent="violet"]`). Don't pin the exact triple —
    // any future contrast tweak would force a test churn — but assert
    // the structural shape (oklch(...) function) AND the hue band 270-310
    // so a regression that swaps to teal (~190) or amber (~80) fails.
    expect(accent).toMatch(/^oklch\(/);
    const hueMatch = accent.match(/oklch\([^)]*\s+(-?\d+(?:\.\d+)?)\)/);
    expect(
      hueMatch,
      `--accent should expose an OKLCH hue: got ${accent}`,
    ).not.toBeNull();
    const hue = parseFloat(hueMatch![1] ?? "");
    expect(hue).toBeGreaterThanOrEqual(270);
    expect(hue).toBeLessThanOrEqual(310);
  });

  test("data-hero-font='fraunces' resolves the heading font to a Fraunces stack (5.1o)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const heroFont = await page
      .locator("#hero-h1")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    // Fraunces is self-hosted in a follow-up (self-host-woff2-fonts);
    // for now the stack falls back through Fraunces → Georgia → serif.
    // We just need the family token to advertise Fraunces or its
    // documented fallback (the stack must not collapse to the
    // sans-serif Inter Tight default).
    expect(heroFont.toLowerCase()).toMatch(/fraunces|georgia|serif/);
    expect(heroFont.toLowerCase()).not.toMatch(/inter\s*tight/);
  });

  test("primary CTA paints --accent solid (Header.astro:130)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const cta = page.locator(".site-nav .right .btn.primary").first();
    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Computed bg should be a non-transparent rgb()/oklch() — a
    // regression that drops `[data-accent="violet"]` collapses --accent
    // to its fallback and the button reads as the default ghost.
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });
});

test.describe("Home (/) — pre-paint theme bootstrap (security gate)", () => {
  // The inline bootstrap at BaseLayout.astro:24-55 carries an allow-list
  // ['twilight', 'midnight']; any other ?theme=… value MUST collapse to
  // the default and MUST NOT be persisted. Regressions here are
  // security-shaped (XSS via persisted localStorage that later inline
  // scripts read).
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Allow-list semantics are JS-only; one engine covers the contract.",
    );
  });

  test("?theme=fakevalue&persist=1 collapses to twilight and is not persisted", async ({
    page,
  }) => {
    await page.goto("/?theme=fakevalue&persist=1");
    await page.waitForLoadState("networkidle");
    const applied = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(applied).toBe("twilight");
    const persisted = await page.evaluate(() =>
      localStorage.getItem("artagon.theme"),
    );
    expect(persisted).toBe("twilight");
  });

  test("?theme=javascript:alert(1)&persist=1 also collapses (no eval-shaped strings persisted)", async ({
    page,
  }) => {
    await page.goto("/?theme=javascript:alert(1)&persist=1");
    await page.waitForLoadState("networkidle");
    const applied = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    const persisted = await page.evaluate(() =>
      localStorage.getItem("artagon.theme"),
    );
    expect(applied).toBe("twilight");
    expect(persisted).toBe("twilight");
  });

  test("?theme=midnight&persist=1 is honored (positive control)", async ({
    page,
  }) => {
    await page.goto("/?theme=midnight&persist=1");
    await page.waitForLoadState("networkidle");
    const applied = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    const persisted = await page.evaluate(() =>
      localStorage.getItem("artagon.theme"),
    );
    expect(applied).toBe("midnight");
    expect(persisted).toBe("midnight");
  });
});

test.describe("Home (/) — TrustChainIsland keyboard focus contract", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Keyboard focus simulation is desktop-only; touch projects exercise the tap-toggle path covered by enhance-a11y-coverage.",
  );

  test("focusing a stage row swaps the decision claim to that stage's pass string", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // SSR baseline: the scenario's finalClaim is what the decision card
    // shows before any focus event fires.
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=PERMIT",
    );
    // Programmatic focus drives the React onFocus handler. Stage rows
    // are real <button> elements (5.1p.1) so .focus() fires the event
    // synchronously through the astro-island wrapper — unlike the
    // earlier <li role="button"> pattern that the structural test in
    // home.spec.ts:172-179 documented as unreliable.
    await page.locator("#trust-chain-passkey").focus();
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "user.webauthn.verified",
    );
    // Blurring restores the scenario finalClaim.
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur(),
    );
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=PERMIT",
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
