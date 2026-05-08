import { test, expect, type Page } from "@playwright/test";

/**
 * Styling-architecture accessibility suite.
 *
 * Covers keyboard navigation and focus-visible indicators for the
 * styling architecture (rationale + history archived under
 * `refactor-styling-architecture`). Runs in chromium-only — focus-visible
 * styles are not browser-engine-dependent, and the Lighthouse a11y audit
 * (run separately via lhci) covers cross-engine concerns.
 */

test.describe("Styling architecture - keyboard navigation + focus indicators", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Keyboard/focus checks run in chromium only.",
    );
    await page.goto("/vision");
    await page.waitForLoadState("networkidle");
  });

  // USMR 5.5.16-pt7 — skip-link visibility transition. The link is
  // hidden at `left: -9999px` until focused; on focus it should snap
  // to `position: fixed; left: 12px; top: 12px` and render visibly.
  // A regression that drops the focus-visible rule (or breaks the
  // canonical-token migration) would silently leave the skip-link
  // at -9999px — keyboard users can land on it but never see it.
  test("Skip-link snaps to visible position on focus", async ({ page }) => {
    const skip = page.locator("a.skip-link").first();
    const offscreen = await skip.evaluate((el) => ({
      left: getComputedStyle(el).left,
      position: getComputedStyle(el).position,
    }));
    expect(offscreen.position).toBe("absolute");
    expect(parseFloat(offscreen.left)).toBeLessThan(0);

    await page.keyboard.press("Tab");
    const focused = await skip.evaluate((el) => ({
      left: getComputedStyle(el).left,
      top: getComputedStyle(el).top,
      position: getComputedStyle(el).position,
      bg: getComputedStyle(el).backgroundColor,
    }));
    expect(focused.position).toBe("fixed");
    expect(focused.left).toBe("12px");
    expect(focused.top).toBe("12px");
    // Background must resolve to an opaque color (canonical --bg-1)
    // not transparent. Webkit/chromium serialize as oklab() / rgb().
    expect(focused.bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(focused.bg).not.toBe("transparent");
  });

  test("Tab cycles through interactive elements without dead-ends", async ({
    page,
  }) => {
    // Skip-link is the first focusable element; assert it exists and receives focus.
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? { tag: el.tagName, text: el.textContent?.trim().slice(0, 40) ?? "" }
        : null;
    });
    expect(firstFocused).not.toBeNull();
    expect(firstFocused!.tag).toBe("A");
    expect((firstFocused!.text ?? "").toLowerCase()).toMatch(/skip|main/);

    // Tab through the next 20 elements. Each step must advance to a NEW
    // element (no infinite loops on a single trap), and every focused
    // element must be a real interactive control.
    const seen = new Set<string>();
    seen.add(`${firstFocused!.tag}:${firstFocused!.text}`);

    let advanced = 0;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const cur = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        return {
          tag: el.tagName,
          role: el.getAttribute("role") ?? "",
          text: el.textContent?.trim().slice(0, 40) ?? "",
          tabIndex: el.tabIndex,
        };
      });
      if (!cur) break;
      const key = `${cur.tag}:${cur.text}:${cur.role}`;
      if (!seen.has(key)) {
        seen.add(key);
        advanced++;
      }
      // Every focused element must be naturally focusable (A/BUTTON/INPUT/etc.)
      // OR explicitly tabIndex >= 0.
      const isFocusable =
        ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(cur.tag) ||
        cur.tabIndex >= 0;
      expect(isFocusable, `non-interactive element got focus: ${key}`).toBe(
        true,
      );
    }

    // Sanity: at least 5 distinct elements should be reachable on /vision
    // (skip-link + nav links + cards/anchors).
    expect(advanced, "tab traversal stalled").toBeGreaterThanOrEqual(5);
  });

  test("focus rings render on links, and :focus-within lights up parent cards", async ({
    page,
  }) => {
    // theme.css uses `.ui-card:focus-within` (greppable) — cards
    // aren't focusable themselves; an inner anchor takes focus and the
    // card outline appears via :focus-within. Test the actual mechanism.
    // Use the skip-link first focusable, falling back to any anchor in main.
    // Skip-link is hidden until focused, but it IS focusable from a fresh
    // tab traversal — the prior test already proved that.
    await page.keyboard.press("Tab");
    const directLink = page.locator(":focus");
    await expect(directLink).toBeAttached();

    const linkRing = await directLink.evaluate((node) => {
      const cs = window.getComputedStyle(node);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    const linkHasRing =
      (linkRing.outlineStyle !== "none" && linkRing.outlineWidth !== "0px") ||
      (linkRing.boxShadow && linkRing.boxShadow !== "none");
    expect(
      linkHasRing,
      `link has no focus ring (outline=${linkRing.outlineWidth}/${linkRing.outlineStyle}, boxShadow=${linkRing.boxShadow})`,
    ).toBe(true);

    // Now exercise :focus-within: focus a link inside a domain card and
    // assert the card itself shows a non-empty outline. If no card has
    // focusable children on /vision, the card structure doesn't surface a
    // keyboard interaction and this assertion is N/A.
    const linkInsideCard = page.locator(".ui-card--domain a[href]").first();
    if ((await linkInsideCard.count()) > 0) {
      await linkInsideCard.focus();
      const card = linkInsideCard.locator(
        "xpath=ancestor::*[contains(@class,'ui-card--domain')][1]",
      );
      const cardOutline = await card.evaluate((node) => {
        const cs = window.getComputedStyle(node);
        return { width: cs.outlineWidth, style: cs.outlineStyle };
      });
      expect(
        cardOutline.style,
        ":focus-within outline-style on .ui-card--domain should not be 'none' while inner link is focused",
      ).not.toBe("none");
      expect(cardOutline.width).not.toBe("0px");
    }
  });
});
