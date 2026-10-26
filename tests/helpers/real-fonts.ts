import { type Page } from "@playwright/test";
import { PRODUCTION_FONT_STYLESHEET } from "../../src/data/font-stylesheets";

const REAL_FONT_WAIT_TIMEOUT_MS = 15_000;

export async function waitForRealFonts(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      (expectedHref) => {
        const stylesheet = Array.from(
          document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
        ).find((link) => link.getAttribute("href") === expectedHref);
        return stylesheet?.sheet != null;
      },
      PRODUCTION_FONT_STYLESHEET,
      { timeout: REAL_FONT_WAIT_TIMEOUT_MS },
    );
    await page.evaluate(
      (timeoutMs) =>
        Promise.race([
          document.fonts.ready.then(() => true),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("fonts.ready timeout")),
              timeoutMs,
            ),
          ),
        ]),
      REAL_FONT_WAIT_TIMEOUT_MS,
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load the production font stylesheet and document fonts within ${REAL_FONT_WAIT_TIMEOUT_MS} ms (${PRODUCTION_FONT_STYLESHEET}): ${detail}`,
    );
  }
}
