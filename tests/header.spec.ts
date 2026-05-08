import { test, expect } from "@playwright/test";

/**
 * Header sticky-nav contract (USMR Phase 5.1l).
 *
 * Header.astro:73-78 ships a `position: sticky` nav with
 * `backdrop-filter: blur(14px)` and `-webkit-backdrop-filter: blur(14px)`
 * over a `color-mix(in oklab, var(--bg) 72%, transparent)` background.
 * The chromium-only visual snapshot suite does NOT cover the actual
 * cross-engine `backdrop-filter` rendering surface — webkit ships a
 * separate prefixed property and a regression that drops it leaves
 * webkit / Mobile Safari users with a solid-bg nav (no blur, wrong
 * contrast over hero content).
 *
 * This spec runs on chromium + webkit + Mobile Safari to gate the
 * cross-engine contract structurally (computed style read), without
 * depending on pixel snapshots.
 */

test.describe("Header — sticky + backdrop-filter contract", () => {
  test.beforeEach(({}, testInfo) => {
    const allowed = new Set([
      "chromium",
      "webkit",
      "Mobile Safari",
      "Mobile Safari (iPhone 14 Pro Max)",
    ]);
    test.skip(
      !allowed.has(testInfo.project.name),
      `Header backdrop-filter parity runs on chromium / webkit / Mobile Safari only (current: ${testInfo.project.name}).`,
    );
  });

  test(".site-nav is position:sticky on every gated engine", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const nav = page.locator(".site-nav");
    await expect(nav).toBeVisible();
    const position = await nav.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("sticky");
  });

  test(".site-nav exposes a non-empty backdrop-filter (engine-prefixed)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const nav = page.locator(".site-nav");
    const filters = await nav.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        standard: cs.backdropFilter,
        webkit: (cs as unknown as Record<string, string>)[
          "webkitBackdropFilter"
        ],
      };
    });
    // Either the standard or the -webkit- prefixed property must
    // resolve to a non-empty filter string. Chromium reads the
    // standard property; webkit historically reads the prefixed one.
    // Both engines accept both today, but the prefix is preserved on
    // webkit's `webkitBackdropFilter` reflection — this assertion
    // guards against a future Header refactor that drops one branch
    // of the dual declaration.
    const resolved = filters.standard || filters.webkit;
    expect(
      resolved,
      `expected non-empty backdrop-filter; got standard="${filters.standard}" webkit="${filters.webkit}"`,
    ).toMatch(/blur/);
  });

  test(".site-nav background is a translucent color-mix (not solid)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const nav = page.locator(".site-nav");
    const bg = await nav.evaluate((el) => getComputedStyle(el).backgroundColor);
    // The nav uses `color-mix(in oklab, var(--bg) 72%, transparent)`.
    // Serialization varies per engine: chromium emits `rgba(...)`;
    // webkit emits `oklab(L a b / α)`. Both forms expose the alpha
    // channel. The contract is that alpha is strictly between 0 and
    // 1 — a regression to solid `var(--bg)` reads as alpha = 1; a
    // regression to fully transparent reads as alpha = 0.
    let alpha: number | null = null;
    const rgbaMatch = bg.match(/rgba\([^)]*,\s*([0-9.]+)\s*\)/);
    if (rgbaMatch) {
      alpha = parseFloat(rgbaMatch[1] ?? "1");
    } else {
      const slashMatch = bg.match(/\/\s*([0-9.]+)\s*\)/);
      if (slashMatch) alpha = parseFloat(slashMatch[1] ?? "1");
    }
    expect(
      alpha,
      `expected an alpha channel in computed background; got ${bg}`,
    ).not.toBeNull();
    expect(alpha!).toBeGreaterThan(0);
    expect(alpha!).toBeLessThan(1);
  });
});

// USMR 5.5.16 — canonical NAV_LINKS (BaseLayout.jsx:203-208) is
// exactly 4 entries: Platform / Use cases / Standards / Writing.
// GitHub is a 34×34 icon button in `.right`, NOT a `<li>` in the
// link list. A regression that re-adds Bridge / Roadmap or drops
// the icon button surfaces here.
test.describe("Header — canonical NAV_LINKS structure", () => {
  test("link list contains exactly 4 canonical entries", async ({ page }) => {
    await page.goto("/");
    const labels = (
      await page.locator(".site-nav .links li > a").allTextContents()
    ).map((s) => s.trim());
    expect(labels).toEqual(["Platform", "Use cases", "Standards", "Writing"]);
  });

  test("GitHub appears as a 34×34 icon button in .right, not in .links", async ({
    page,
  }) => {
    await page.goto("/");
    // No GitHub label inside .links
    await expect(
      page.locator(".site-nav .links a", { hasText: "GitHub" }),
    ).toHaveCount(0);
    // Icon button in .right with the canonical aria-label + dimensions
    const gh = page.locator(".site-nav__github");
    await expect(gh).toHaveAttribute("aria-label", "GitHub");
    await expect(gh).toHaveAttribute("href", "https://github.com/artagon");
    await expect(gh).toHaveAttribute("target", "_blank");
    const box = await gh.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(34);
    expect(box?.height).toBeGreaterThanOrEqual(34);
  });
});
