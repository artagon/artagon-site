import { test, expect } from "@playwright/test";

// USMR Phase 5.5.7 — Footer column structure invariants. The 5.5.3
// rewrite landed the canonical 4×5 shape (Platform / Developers /
// Company / Legal × 5 links each per `new-design/extracted/src/pages/
// index.html:605-660`); a future PR dropping a column or renaming a
// label silently misroutes footer nav. This spec gates the contract
// at Playwright time.

test.describe("Footer (canonical 4×5 structure)", () => {
  test("renders exactly 4 columns with the canonical headings", async ({
    page,
  }) => {
    await page.goto("/");
    const headings = await page
      .locator(".site-footer .footer-col-heading")
      .allTextContents();
    expect(headings).toEqual(["Platform", "Developers", "Company", "Legal"]);
  });

  test("each column has exactly 5 links", async ({ page }) => {
    await page.goto("/");
    const cols = page.locator(".site-footer .footer-col");
    await expect(cols).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const links = cols.nth(i).locator("ul li a");
      await expect(links, `column ${i} link count`).toHaveCount(5);
    }
  });

  test("Platform column lists the 3 pillars + Bridge + Use cases", async ({
    page,
  }) => {
    await page.goto("/");
    const labels = (
      await page
        .locator(".site-footer .footer-col")
        .nth(0)
        .locator("ul li a")
        .allTextContents()
    ).map((s) => s.trim());
    expect(labels).toEqual([
      "Identity",
      "Credentials",
      "Authorization",
      "Bridge",
      "Use cases",
    ]);
  });

  test("Developers column has Standards (5.4) and external GitHub", async ({
    page,
  }) => {
    await page.goto("/");
    const col = page.locator(".site-footer .footer-col").nth(1);
    await expect(
      col.locator("ul li a", { hasText: "Standards" }),
    ).toHaveAttribute("href", "/standards");
    const github = col.locator("ul li a", { hasText: "GitHub" });
    await expect(github).toHaveAttribute("href", "https://github.com/artagon");
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", /noopener.*noreferrer/);
  });

  // USMR 5.5.16-pt5 — canonical Developers col composition is
  // Docs · SDKs · CLI · GitHub · Standards (BaseLayout.jsx:258-264).
  // The 5.5.3 port renamed CLI → Playground; pt5 reverted that rename.
  test("Developers column is canonical: Docs · SDKs · CLI · GitHub · Standards", async ({
    page,
  }) => {
    await page.goto("/");
    const labels = (
      await page
        .locator(".site-footer .footer-col")
        .nth(1)
        .locator("ul li a")
        .allTextContents()
    ).map((s) => s.trim());
    expect(labels).toEqual(["Docs", "SDKs", "CLI", "GitHub", "Standards"]);
  });

  test("Legal column placeholders use '#' anchors (canonical pattern)", async ({
    page,
  }) => {
    await page.goto("/");
    // Per 5.5.4 — Terms / Trust center / DPA / Sub-processors point at
    // '#' until dedicated pages ship. Privacy is a real route. Anything
    // mapping to /privacy or /security with the wrong label would
    // silently misroute users (the silent-failure-hunter Major).
    const col = page.locator(".site-footer .footer-col").nth(3);
    await expect(
      col.locator("ul li a", { hasText: "Privacy" }),
    ).toHaveAttribute("href", "/privacy");
    for (const placeholder of [
      "Terms",
      "Trust center",
      "DPA",
      "Sub-processors",
    ]) {
      const link = col.locator("ul li a", { hasText: placeholder });
      await expect(
        link,
        `${placeholder} should be a placeholder`,
      ).toHaveAttribute("href", "#");
    }
  });

  test("brand glyph is the canonical inline SVG (no raster)", async ({
    page,
  }) => {
    await page.goto("/");
    const brand = page.locator(".footer-wordmark");
    // ArtagonGlyph component renders an inline <svg>; the legacy
    // /icons/icon-64.png raster should NOT be present.
    await expect(brand.locator("svg.footer-glyph")).toBeVisible();
    await expect(brand.locator('img[src*="icon-64"]')).toHaveCount(0);
  });

  // USMR 5.5.16 — canonical flat 5-col grid (BaseLayout.jsx:283
  // `gridTemplateColumns:'1.4fr repeat(4, 1fr)'`). Pre-fix the layout
  // was a 220 px brand col + 1fr nested 4-col grid which created
  // visual asymmetry on wide viewports.
  test("footer-inner grid is canonical 1.4fr repeat(4, 1fr)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1240, height: 800 });
    const cols = await page.$eval(
      ".site-footer .footer-inner",
      (el) => getComputedStyle(el).gridTemplateColumns,
    );
    // Computed values are pixel widths; assert ratio holds: brand col
    // ≈ 1.4× each link col. At maxw 1240 + gap 40 px × 4, we expect
    // brand col ≈ 280 px and each link col ≈ 200 px.
    const widths = cols.split(/\s+/).map((v) => parseFloat(v));
    expect(widths).toHaveLength(5);
    const brand = widths[0]!;
    const links = widths.slice(1);
    const linkAvg = links.reduce((a, b) => a + b, 0) / links.length;
    expect(brand / linkAvg).toBeGreaterThan(1.25);
    expect(brand / linkAvg).toBeLessThan(1.6);
  });

  // USMR 5.5.16 — ThemeToggle was removed from the footer brand col
  // (canonical Footer fn lines 284-288 has wordmark + positioning blurb
  // ONLY). The header lost its toggle in pt87 and the standalone
  // ThemeToggle component was deleted as orphan in pt166; the
  // dev-only Tweaks panel (TweaksPanel.tsx) is now the canonical
  // theme-switcher surface. A regression that re-injects a theme
  // control into the footer brand cell would surface as a visible
  // control next to the wordmark.
  test("footer brand has no theme toggle control", async ({ page }) => {
    await page.goto("/");
    const brandToggles = page.locator(
      ".footer-brand [data-theme-toggle], .footer-brand button[aria-pressed]",
    );
    await expect(brandToggles).toHaveCount(0);
  });
});
