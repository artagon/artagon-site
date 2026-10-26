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
      async (timeoutMs) => {
        let timeoutId: number | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error("fonts.ready timeout")),
            timeoutMs,
          );
        });

        await Promise.race([
          document.fonts.ready.then((fontFaces) => {
            const failedFamilies = Array.from(fontFaces)
              .filter((fontFace) => fontFace.status === "error")
              .map((fontFace) => fontFace.family);
            if (failedFamilies.length > 0) {
              throw new Error(
                `font face load failed: ${[...new Set(failedFamilies)].join(", ")}`,
              );
            }
            return true;
          }),
          timeout,
        ]).finally(() => {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        });
      },
      REAL_FONT_WAIT_TIMEOUT_MS,
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed while waiting for the production font stylesheet or document fonts (each wait has a ${REAL_FONT_WAIT_TIMEOUT_MS} ms timeout; ${PRODUCTION_FONT_STYLESHEET}): ${detail}`,
    );
  }
}
