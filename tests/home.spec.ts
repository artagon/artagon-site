import { test, expect } from "@playwright/test";
import { waitForTrustChainHydration } from "./helpers/trust-chain-hydration.js";

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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Hero (USMR 5.1a): non-empty headline from home.mdx frontmatter.
    await expect(page.locator("h1#hero-h1")).not.toBeEmpty();
    await expect(page.locator("p#hero-sub")).not.toBeEmpty();
    // USMR 5.5.2 — home composition restructured to canonical
    // <Hero/><Writing/><HomeExplore/><CTA/> per index.html:1658.
    // The 3-card pillar grid (#pillar-identity etc) was dropped from
    // home; pillars now surface on /platform as the PillarsIsland
    // tablist. Verify the canonical home sections instead.
    // Latest-writing strip (5.1f).
    await expect(page.locator("#writing")).toBeVisible();
    // HomeExplore 6-card grid (5.5.2) — also serves as the
    // `#playground` anchor target since 5.5.6.
    await expect(page.locator("#playground")).toBeVisible();
    await expect(page.locator(".home-explore__card")).toHaveCount(6);
    // On-ramp / design-partner CTA (5.1b).
    await expect(page.locator("#get-started")).toBeVisible();
  });
});

test.describe("Home (/) — TrustChainIsland interactivity", () => {
  test.setTimeout(45_000);

  test("scenario picker click swaps the decision card to a DENY scenario", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);
    // Default scenarioIdx=0 is the healthy PERMIT scenario (SSR state).
    await expect(page.locator(".trust-chain__decision-claim")).toContainText(
      "decision=PERMIT",
    );
    // 2nd dot is SCENARIOS[1] ("Jailbroken phone · blocked", DENY).
    const dots = page.locator(".trust-chain__scenario-dot");
    const hitAreas = await dots.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return { width, height };
      }),
    );
    for (const [index, hitArea] of hitAreas.entries()) {
      expect(
        hitArea.width,
        `scenario button ${index} width`,
      ).toBeGreaterThanOrEqual(44);
      expect(
        hitArea.height,
        `scenario button ${index} height`,
      ).toBeGreaterThanOrEqual(44);
    }
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
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Stage-row hover interactions are mouse-only; tap behavior is covered separately.",
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);
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

test.describe("Home (/) — TrustChainIsland mouse toggle", () => {
  test.setTimeout(45_000);

  test("clicking stage 0 toggles its pressed state", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Touch input is covered by the mobile tap tests.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);

    const stage0 = page.locator(".trust-chain__stage").nth(0);
    const claim = page.locator(".trust-chain__decision-claim");
    await expect(claim).toContainText("decision=PERMIT");

    await stage0.click();
    await expect(stage0).toHaveAttribute("aria-pressed", "true");
    await expect(claim).toContainText("user.webauthn.verified");

    await stage0.click();
    await expect(stage0).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking another stage moves the pressed state", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Touch input is covered by the mobile tap tests.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);

    const stages = page.locator(".trust-chain__stage");
    await stages.nth(0).click();
    await expect(stages.nth(0)).toHaveAttribute("aria-pressed", "true");

    await stages.nth(2).click();
    await expect(stages.nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(stages.nth(2)).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Home (/) — TrustChainIsland touch toggle", () => {
  test.setTimeout(45_000);

  test("tapping stage 0 toggles its pressed state", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "This case verifies actual touch input.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);

    const stage0 = page.locator(".trust-chain__stage").nth(0);
    const claim = page.locator(".trust-chain__decision-claim");
    await expect(claim).toContainText("decision=PERMIT");

    await stage0.tap();
    await expect(stage0).toHaveAttribute("aria-pressed", "true");
    await expect(claim).toContainText("user.webauthn.verified");

    await stage0.tap();
    await expect(stage0).toHaveAttribute("aria-pressed", "false");
  });

  test("tapping another stage moves the pressed state", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "This case verifies actual touch input.");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);

    const stages = page.locator(".trust-chain__stage");
    await stages.nth(0).tap();
    await expect(stages.nth(0)).toHaveAttribute("aria-pressed", "true");

    await stages.nth(2).tap();
    await expect(stages.nth(0)).toHaveAttribute("aria-pressed", "false");
    await expect(stages.nth(2)).toHaveAttribute("aria-pressed", "true");
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const lede = page.locator("#hero-sub");
    await expect(lede).toHaveClass(/lead/);
    await expect(lede).not.toHaveClass(/sub/);
  });

  test("5.1p.2 — hero h1 has no animation (no rainbow-shift)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heroHeading = page.locator("#hero-h1");
    await heroHeading.waitFor({ state: "attached" });
    const animationName = await heroHeading.evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(animationName).toBe("none");
  });

  test("5.1p.6 — hero .btn rules have no ::before content (legacy glyphs suppressed)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const btn = page.locator(".hero .btn").first();
    await btn.waitFor({ state: "attached" });
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("h1#hero-h1").waitFor({ state: "attached" });
    const brCount = await page.locator("h1#hero-h1 br").count();
    // 3 sentence parts → 2 <br> elements between them. A regression to
    // a single-line headline produces 0 <br>s.
    expect(brCount).toBe(2);
  });

  test("hero eyebrow renders glow-amp `<em>` for the ampersand", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .locator(".glow-amp")
      .first()
      .waitFor({ state: "attached" });
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
  test.setTimeout(45_000);

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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);
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

  test("data-accent='cyan' resolves --accent to the canonical teal OKLCH", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page
      .locator('html[data-accent="cyan"]')
      .waitFor({ state: "attached" });
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim(),
    );
    // BaseLayout sets `data-accent="cyan"` to match the new-design
    // canonical default — `oklch(0.86 0.14 185)`
    // (new-design/extracted/src/styles/tokens.css:12). Hue band
    // 170-200 catches the triple while rejecting violet (~300),
    // amber (~75), and lime (~135). The cyan label aligns with the
    // Tweaks-panel preset name even though the OKLCH triple is in
    // the teal/cyan border band — preserving the canonical naming
    // matters for the tweaks UX.
    expect(accent).toMatch(/^oklch\(/);
    const hueMatch = accent.match(/oklch\([^)]*\s+(-?\d+(?:\.\d+)?)\)/);
    expect(
      hueMatch,
      `--accent should expose an OKLCH hue: got ${accent}`,
    ).not.toBeNull();
    const hue = parseFloat(hueMatch![1] ?? "");
    expect(hue).toBeGreaterThanOrEqual(170);
    expect(hue).toBeLessThanOrEqual(200);
  });

  test("data-hero-font='fraunces' resolves the heading font to a Fraunces stack (5.1o)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heroHeading = page.locator("#hero-h1");
    await heroHeading.waitFor({ state: "attached" });
    const heroFont = await heroHeading.evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    // Fraunces is self-hosted in a follow-up (self-host-woff2-fonts);
    // for now the stack falls back through Fraunces → Georgia → serif.
    // We just need the family token to advertise Fraunces or its
    // documented fallback (the stack must not collapse to the
    // sans-serif Inter Tight default).
    expect(heroFont.toLowerCase()).toMatch(/fraunces|georgia|serif/);
    expect(heroFont.toLowerCase()).not.toMatch(/inter\s*tight/);
  });

  test("primary CTA paints the accent color as a solid", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const cta = page.locator(".site-nav .right .btn.primary").first();
    await cta.waitFor({ state: "attached" });
    const bg = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Computed bg should be a non-transparent rgb()/oklch() — a
    // regression that drops `[data-accent="cyan"]` collapses --accent
    // to its fallback and the button reads as the default ghost.
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });
});

test.describe("Home (/) — pre-paint theme bootstrap (security gate)", () => {
  // The inline bootstrap at BaseLayout.astro:38-68 carries an allow-list
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
    await page.goto("/?theme=fakevalue&persist=1", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-theme"),
    );
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
    await page.goto("/?theme=javascript:alert(1)&persist=1", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-theme"),
    );
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
    await page.goto("/?theme=midnight&persist=1", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-theme"),
    );
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
  test.setTimeout(45_000);

  test.skip(
    ({ isMobile }) => isMobile,
    "Keyboard focus simulation is desktop-only; touch projects exercise the tap-toggle path covered by enhance-a11y-coverage.",
  );

  test("focusing a stage row swaps the decision claim to that stage's pass string", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForTrustChainHydration(page);
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
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
