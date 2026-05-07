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
});
