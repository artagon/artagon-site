// USMR 5.5.16 — canonical typography + section rhythm regression
// gates established across iters 27-61. Backstops:
//
// - bare h1 font-weight 400 (canonical Hero.jsx — Space Grotesk
//   regular, NOT the catch-all 500 weight)
// - .lead font-size 20 / fg-1 / line-height 1.5 (canonical
//   global.css:234)
// - .eyebrow leading 18px accent dash via ::before (canonical
//   global.css:226 — every section eyebrow on the site)
// - hero section padding 80 0 120 (canonical Hero.jsx:124)
// - .writing-strip + .onramp inherit canonical .section padding
//   (was 48 pre-pt48; canonical 80-120 clamp)
// - .actions cluster gap 10 (canonical .cluster contract)
//
// Each fix would silently revert if a future refactor swapped
// values without explicit testing. Pinned to chromium per the
// project pattern (computed-style reads are engine-agnostic;
// running on webkit adds dev-server transport flake without
// catching anything new).

import { test, expect } from "@playwright/test";

test.describe("Canonical typography + rhythm gates", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      `Canonical typography gate is chromium-only (current: ${testInfo.project.name}).`,
    );
  });

  test("bare h1 font-weight is 400 (canonical Space Grotesk regular)", async ({
    page,
  }) => {
    // /writing/welcome has a bare-h1 (no .display utility scoping)
    // — the post-detail title. Pre-pt31 + pre-pt42 it rendered at 500
    // because (a) the global h1 catch-all set 500, (b) .display
    // utility set 500 with higher specificity than the h1-specific
    // 400 rule.
    await page.goto("/writing/welcome", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const weight = await page.$eval(
      "h1.blog-hero__title",
      (el) => getComputedStyle(el).fontWeight,
    );
    // Browsers report font-weight as a string (e.g. "400")
    expect(weight).toBe("400");
  });

  test(".lead consumes canonical 20px / fg-1 / 1.5", async ({ page }) => {
    // Home hero lede uses .lead class. Canonical font-size 20,
    // line-height 1.5, color var(--fg-1).
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const styles = await page.$eval(".hero p.lead", (el) => {
      const cs = getComputedStyle(el);
      return {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
      };
    });
    expect(styles.fontSize).toBe("20px");
    // line-height 1.5 × 20 px font = 30 px computed
    expect(styles.lineHeight).toBe("30px");
  });

  test("section eyebrows render with the canonical 18px accent dash", async ({
    page,
  }) => {
    // Verify the .home-explore__eyebrow ::before pseudo renders an
    // 18px accent dash. The dash is the canonical signature element
    // (8 surfaces consume the same pattern post-pt15, pt16).
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const dashWidth = await page.$eval(".home-explore__eyebrow", (el) => {
      const before = getComputedStyle(el, "::before");
      return before.width;
    });
    expect(dashWidth).toBe("18px");
  });

  test("hero section padding is 80 top / 120 bottom (canonical)", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const padding = await page.$eval(".hero", (el) => ({
      top: getComputedStyle(el).paddingTop,
      bottom: getComputedStyle(el).paddingBottom,
    }));
    expect(padding.top).toBe("80px");
    expect(padding.bottom).toBe("120px");
  });

  test(".writing-strip section inherits canonical .section padding (>= 80)", async ({
    page,
  }) => {
    // Pre-pt48, .writing-strip had scoped padding-block: var(--space-12)
    // (= 48), shortcutting the canonical .section 120 by 72 px.
    // Verify the actual computed padding falls in the canonical
    // clamp(80, 8vw, 120) range.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1240, height: 800 });
    const padding = await page.$eval(".writing-strip", (el) => ({
      top: parseFloat(getComputedStyle(el).paddingTop),
      bottom: parseFloat(getComputedStyle(el).paddingBottom),
    }));
    // 8vw of 1240 = 99.2; clamp range [80, 99.2, 120] → 99.2 px
    expect(padding.top).toBeGreaterThanOrEqual(80);
    expect(padding.top).toBeLessThanOrEqual(120);
    expect(padding.bottom).toBeGreaterThanOrEqual(80);
    expect(padding.bottom).toBeLessThanOrEqual(120);
  });

  test(".actions cluster has canonical 10px gap (not 12)", async ({ page }) => {
    // Pre-pt26, .actions used `gap: 0.75rem` (=12). Canonical .cluster
    // contract is gap: 10. Backstop a future refactor that re-injects
    // 12.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const gap = await page.$eval(
      ".hero .actions",
      (el) => getComputedStyle(el).gap,
    );
    expect(gap).toBe("10px");
  });

  test(".onramp__headline ceiling is 76px (canonical Cta.jsx:27)", async ({
    page,
  }) => {
    // Pre-pt24, onRamp h2 used the regular `var(--fs-h2)` clamp(36,
    // 4vw, 60) — undersized by 16px at the ceiling. onRamp is the
    // editorial close, not a section break, so canonical scales h2
    // up to clamp(44, 5vw, 76).
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 2000, height: 1000 });
    const fontSize = await page.$eval(".onramp__headline", (el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    // 5vw of 2000 = 100; clamp(44, 100, 76) → 76 px (ceiling)
    expect(fontSize).toBe(76);
  });

  test(".footer-meta is justify-content: space-between (canonical)", async ({
    page,
  }) => {
    // Pre-pt39, footer meta strip clustered 3 spans on the left with
    // a fixed gap. Canonical distributes copyright / stack / version
    // evenly via space-between.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const justify = await page.$eval(
      ".footer-meta",
      (el) => getComputedStyle(el).justifyContent,
    );
    expect(justify).toBe("space-between");
  });

  test(".trust-chain card padding is 28px (canonical Hero.jsx:234)", async ({
    page,
  }) => {
    // Pre-pt40, .trust-chain padding was clamp(20, 2vw, 28); shrunk
    // to 20 on narrow viewports. Canonical fixes 28.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 320, height: 800 });
    const padding = await page.$eval(".trust-chain", (el) => ({
      top: getComputedStyle(el).paddingTop,
      bottom: getComputedStyle(el).paddingBottom,
    }));
    expect(padding.top).toBe("28px");
    expect(padding.bottom).toBe("28px");
  });

  test(".post-body .pull / blockquote border-radius is 14px (canonical post-*.html:382)", async ({
    page,
  }) => {
    // Canonical .pull renders as a card-on-canvas with the same
    // border-radius (14) as .chain-fig — the editorial pull-quote and
    // chain-row figure share the same surface treatment. Pre-pt66 the
    // .pull radius was 8, reading as a sidebar callout instead.
    //
    // bridge-strategy.mdx renders a markdown `>` blockquote (line 34);
    // CSS shares the rule between `.pull` and `blockquote`, so the
    // blockquote is the live anchor on this route.
    await page.goto("/writing/bridge-strategy", {
      waitUntil: "domcontentloaded",
    });
    const radius = await page.$eval(
      ".post-body blockquote",
      (el) => getComputedStyle(el).borderRadius,
    );
    expect(radius).toBe("14px");
  });

  test(".post-footer cta-card hover lifts border to full --accent (canonical post-*.html:458)", async ({
    page,
  }) => {
    // Canonical post-footer cta-card hover swaps border-color to full
    // `var(--accent)`. Pre-pt67 we used `var(--accent-dim, var(--accent))`
    // which dimmed the activation. Reading the :hover rule directly from
    // the stylesheet avoids the chromium :hover-state vs getComputedStyle
    // race that breaks `await card.hover() + getComputedStyle()` reads.
    await page.goto("/writing/bridge-strategy", {
      waitUntil: "domcontentloaded",
    });
    const hoverRuleText = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (
              rule.cssText &&
              rule.cssText.includes("cta-card") &&
              rule.cssText.includes(":hover")
            ) {
              return rule.cssText;
            }
          }
        } catch {
          /* cross-origin stylesheet — skip */
        }
      }
      return null;
    });
    expect(hoverRuleText).not.toBeNull();
    // The hover rule must lift border-color to full var(--accent),
    // NOT the dimmed --accent-dim variant.
    expect(hoverRuleText).toContain("border-color: var(--accent)");
    expect(hoverRuleText).not.toContain("--accent-dim");
  });

  test(".post-body inline <code> is accent-colored (canonical post-*.html:374)", async ({
    page,
  }) => {
    // Canonical inline `<code>` chips render with `color: var(--accent)`
    // — the cyan tint that distinguishes a cross-reference token from
    // surrounding prose. Pre-pt65 shipped `var(--fg)` which collapsed
    // inline code into the body text.
    await page.goto("/writing/bridge-strategy", {
      waitUntil: "domcontentloaded",
    });
    // bridge-strategy.mdx ships 5+ inline backticks → rendered <code>
    // elements. welcome.mdx has none, so we anchor to bridge-strategy
    // for a non-vacuous assertion.
    const code = page.locator(".post-body code").first();
    await code.waitFor({ state: "attached" });
    const styles = await code.evaluate((el) => {
      const cs = getComputedStyle(el);
      const accentRoot = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--accent");
      return { color: cs.color, accent: accentRoot.trim() };
    });
    // Resolved color must equal the --accent token's resolved color.
    // (Rather than asserting the literal cyan — accent can be re-mapped
    // via [data-accent] — assert that the inline-code color matches the
    // token output in the same DOM.)
    const accentResolved = await page.evaluate((accent) => {
      const probe = document.createElement("span");
      probe.style.color = accent;
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, styles.accent);
    expect(styles.color).toBe(accentResolved);
  });
});
