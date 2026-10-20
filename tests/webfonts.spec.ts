// USMR 5.5.16 — webfont-loading gate. Confirms BaseLayout.astro
// preconnects + loads the three production typefaces (Inter Tight,
// JetBrains Mono, Fraunces), and that the live h1 resolves to Fraunces.
// USMR 14.14: alternate faces belong to the dev-only Tweaks loader.
//
// Pre-fix the site loaded zero webfonts and every --f-* token fell
// back to system-ui (San Francisco on macOS, Segoe UI on Windows).
// This spec is the durable backstop that prevents a quiet regression
// where the <link rel="stylesheet"> is removed from BaseLayout.

import { test, expect } from "@playwright/test";

test.describe("webfont loading", () => {
  // Pinned to chromium per the project pattern (styling-snapshots.spec.ts
  // does the same). The contract being gated — the <link> tags and the
  // resolved font-family strings — is engine-agnostic; running on
  // webkit / Mobile Safari adds 30+ s of dev-server transport flakiness
  // (the dev server binds IPv6-only on this host) without testing
  // anything new. Cross-engine font *rendering* differences are caught
  // by tests/header.spec.ts's chromium / webkit / Mobile Safari triple.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      `Webfont contract gate is chromium-only (current: ${testInfo.project.name}).`,
    );
  });

  test("BaseLayout preconnects + loads Google Fonts", async ({ page }) => {
    // `domcontentloaded` instead of the default `load` — webkit blocks
    // load on the Google Fonts CSS roundtrip and times out at 30 s on
    // the dev server, even though the head <link> is already present
    // in the parsed DOM. We're not testing fetch latency.
    await page.goto("/", { waitUntil: "domcontentloaded" });
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
    // This head stylesheet is the production request, even in dev.
    for (const family of [
      "Inter+Tight",
      "JetBrains+Mono",
      "Fraunces",
    ]) {
      expect(fontsCss!.href).toContain(family);
    }
    for (const family of ["Instrument+Serif", "DM+Serif+Display", "Space+Grotesk"]) {
      expect(fontsCss!.href).not.toContain(family);
    }
  });

  test("default h1 resolves to Fraunces after fonts.ready", async ({ page }) => {
    // `domcontentloaded` instead of the default `load` — webkit blocks
    // load on the Google Fonts CSS roundtrip and times out at 30 s on
    // the dev server, even though the head <link> is already present
    // in the parsed DOM. We're not testing fetch latency.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for FontFaceSet to flush. Bound the wait to 20 s — webkit
    // has finished by ~12 s on the dev server even with cold cache.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const t = setTimeout(
            () => reject(new Error("fonts.ready timeout")),
            20000,
          );
          document.fonts.ready.then(() => {
            clearTimeout(t);
            resolve();
          });
        }),
    );

    // Empty-storage dev hydration and production use the same face.
    const h1Family = await page.$eval(
      "h1.display",
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(h1Family).toMatch(/^Fraunces/);

    const bodyFamily = await page.$eval(
      "body",
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(bodyFamily).toMatch(/Inter Tight/);

    const loaded = await page.evaluate(() =>
      [...document.fonts].filter(f => f.status === "loaded").map(f => f.family),
    );
    expect(loaded).toEqual(expect.arrayContaining(["Fraunces", "Inter Tight", "JetBrains Mono"]));
  });
});
