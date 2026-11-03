// USMR 14.91: exercise the emitted inline bootstrap and runtime setter.
import { expect, test, type Page } from "@playwright/test";
import { THEME_COLORS, type CanvasTheme } from "../src/data/theme-colors";

type ThemeWindow = Window & {
  __setTheme: (theme: string) => void;
  __themeCspViolations: string[];
};

async function expectTheme(page: Page, theme: CanvasTheme): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const metas = page.locator('meta[name="theme-color"]');
  await expect(metas).toHaveCount(3);
  await expect.poll(() => metas.evaluateAll(nodes => nodes.map(node => node.getAttribute("content"))))
    .toEqual(Array(3).fill(THEME_COLORS[theme]));
}

test.describe("theme-color follows the selected canvas", () => {
  const pageErrors: string[] = [];
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Theme bootstrap coverage runs in Chromium.");
    pageErrors.length = 0;
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const state = window as unknown as ThemeWindow;
      state.__themeCspViolations = [];
      document.addEventListener("securitypolicyviolation", event => {
        state.__themeCspViolations.push(`${event.violatedDirective}: ${event.blockedURI}`);
      });
    });
  });
  test.afterEach(async ({ page }) => {
    if (page.url() !== "about:blank") {
      expect(await page.evaluate(() => (window as unknown as ThemeWindow).__themeCspViolations)).toEqual([]);
    }
    expect(pageErrors).toEqual([]);
  });

  for (const theme of ["twilight", "midnight"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${theme} URL overrides stored theme in ${colorScheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.addInitScript(stored => localStorage.setItem("artagon.theme", stored),
          theme === "twilight" ? "midnight" : "twilight");
        await page.goto(`/?theme=${theme}`, { waitUntil: "domcontentloaded" });
        await expectTheme(page, theme);
      });

      test(`${theme} stored theme in ${colorScheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.addInitScript(stored => localStorage.setItem("artagon.theme", stored), theme);
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expectTheme(page, theme);
      });
    }
  }

  test("invalid stored choice falls back to twilight", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("artagon.theme", "invalid"));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectTheme(page, "twilight");
  });

  test("invalid query overrides a stored midnight and falls back to twilight", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("artagon.theme", "midnight"));
    await page.goto("/?theme=invalid", { waitUntil: "domcontentloaded" });
    await expectTheme(page, "twilight");
  });

  test("a failed persistence write preserves the URL choice", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("artagon.theme", "twilight");
      Storage.prototype.setItem = function () { throw new DOMException("blocked", "SecurityError"); };
    });
    await page.goto("/?theme=midnight&persist=1", { waitUntil: "domcontentloaded" });
    await expectTheme(page, "midnight");
    await page.evaluate(() => (window as unknown as ThemeWindow).__setTheme("twilight"));
    await expectTheme(page, "twilight");
  });

  test("runtime setter handles both themes and invalid values", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    for (const [input, expected] of [
      ["midnight", "midnight"], ["twilight", "twilight"], ["invalid", "twilight"],
    ] as const) {
      await page.evaluate(value => (window as unknown as ThemeWindow).__setTheme(value), input);
      await expectTheme(page, expected);
    }
  });
});
