// USMR 5.5.16 — webfont-loading gate. Confirms BaseLayout.astro
// preconnects + loads the 6 canonical typefaces (Inter Tight,
// Space Grotesk, JetBrains Mono, Fraunces, Instrument Serif,
// DM Serif Display) per new-design index.html, and that the live h1
// resolves to Space Grotesk after document.fonts.ready settles.
//
// Pre-fix the site loaded zero webfonts and every --f-* token fell
// back to system-ui (San Francisco on macOS, Segoe UI on Windows).
// This spec is the durable backstop that prevents a quiet regression
// where the <link rel="stylesheet"> is removed from BaseLayout.

import { test, expect } from "@playwright/test";

test.describe("webfont loading", () => {
  test("BaseLayout preconnects + loads Google Fonts", async ({ page }) => {
    await page.goto("/");
    const linkHrefs = await page.$$eval("head link", (links) =>
      links.map((l) => ({
        rel: l.getAttribute("rel") ?? "",
        href: l.getAttribute("href") ?? "",
      })),
    );

    const preconnects = linkHrefs.filter((l) => l.rel === "preconnect");
    expect(
      preconnects.some((l) => l.href === "https://fonts.googleapis.com"),
    ).toBe(true);
    expect(
      preconnects.some((l) => l.href === "https://fonts.gstatic.com"),
    ).toBe(true);

    const fontsCss = linkHrefs.find(
      (l) =>
        l.rel === "stylesheet" &&
        l.href.startsWith("https://fonts.googleapis.com/css2"),
    );
    expect(fontsCss).toBeDefined();
    // Each canonical family must appear in the css2 query string.
    for (const family of [
      "Inter+Tight",
      "JetBrains+Mono",
      "Instrument+Serif",
      "Fraunces",
      "DM+Serif+Display",
      "Space+Grotesk",
    ]) {
      expect(fontsCss!.href).toContain(family);
    }
  });

  test("h1 resolves to Space Grotesk after fonts.ready", async ({ page }) => {
    await page.goto("/");
    // Wait for FontFaceSet to flush.
    await page.evaluate(() => document.fonts.ready);

    const h1Family = await page.$eval(
      "h1.display",
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(h1Family).toMatch(/Space Grotesk/);

    const bodyFamily = await page.$eval(
      "body",
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(bodyFamily).toMatch(/Inter Tight/);

    const monoLoaded = await page.evaluate(() =>
      [...document.fonts].some(
        (f) => f.family === "JetBrains Mono" && f.status === "loaded",
      ),
    );
    expect(monoLoaded).toBe(true);
  });
});
