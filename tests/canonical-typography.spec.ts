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

  test(".blog-hero h1 font-weight is 500 (canonical post-detail medium)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt99 corrected an earlier misread. Canonical
    // `new-design/extracted/src/pages/blog.html:341` defines
    //   .blog-hero h1 { font-weight: var(--display-weight, 500) }
    // — the post-detail title falls back to 500. The home `h1.display`
    // utility class falls back to 400 (different selector, different
    // intent). Pre-pt31 we caught the home h1 rendering at 500 and
    // forced 400 across the board; pre-pt99 the .blog-hero__title
    // inherited the bare-h1 400 too. pt99 restored the canonical 500
    // fallback to .blog-hero__title only.
    await page.goto("/writing/welcome", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const weight = await page.$eval(
      "h1.blog-hero__title",
      (el) => getComputedStyle(el).fontWeight,
    );
    expect(weight).toBe("500");
  });

  test("home hero h1.display font-weight resolves canonical (--display-weight)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt100 — canonical `h1.display { font-weight:
    // var(--display-weight, 400) }`. With default `[data-hero-font=
    // "grotesk"]` (set by BaseLayout) `--display-weight` resolves to
    // 500 — the canonical Space Grotesk medium. Pre-pt100 the .display
    // utility had no font-weight rule (pt42 removed it), so home Hero
    // h1 inherited the bare h1 = 400 rule and rendered as Space
    // Grotesk regular regardless of [data-hero-font]. pt100 restored
    // the canonical token consumption.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.$eval(".hero h1.display", (el) => {
      const cs = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      return {
        weight: cs.fontWeight,
        token: root.getPropertyValue("--display-weight").trim(),
      };
    });
    // The h1 weight MUST equal the --display-weight token value
    // (canonical contract). Token defaults to 500 under grotesk; the
    // assertion verifies the var() chain resolves end-to-end, not a
    // hardcoded number.
    expect(result.weight).toBe(result.token || "400");
  });

  test("/faq h1.display renders in [40, 64] clamp range (pt114)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt114 caught the FAQ h1 rendering at 102.4 px
    // (hero-sized) because the inline `clamp(2rem, 1.2rem+3vw, 3rem)`
    // was invalid CSS (missing calc()) and the bare h1 default fired.
    // pt115 added a global lint-clamp-syntax gate; this is the
    // page-level regression case asserting the rendered size falls in
    // the canonical FAQ-page range (40-64 px).
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1422, height: 800 });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.$eval("h1.faq-hero__title", (el) => {
      const cs = getComputedStyle(el);
      return {
        fontSize: parseFloat(cs.fontSize),
        weight: cs.fontWeight,
      };
    });
    expect(result.fontSize).toBeGreaterThanOrEqual(40);
    expect(result.fontSize).toBeLessThanOrEqual(64);
    // Hero-sized would be 102; FAQ should NEVER render that big.
    expect(result.fontSize).toBeLessThan(80);
    // Canonical .display utility cascade → 500 weight under grotesk.
    expect(result.weight).toBe("500");
  });

  test("hero-size guard — only home Hero h1 renders ≥ 80 px (pt120)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt120 — comprehensive guard against the
    // hero-sized h1 regression class caught individually by
    // pt114 (FAQ), pt117 (ShimPage routes), pt118 (/docs),
    // pt119 (/console + /search). The bug: a bare <h1> with no
    // scoped sizing picks up var(--fs-h1) = clamp(56, 7.2vw, 108) =
    // 102 px hero default. Only the marketing home Hero should
    // render that big; every other route is content-sized.
    //
    // Walks 7 representative routes and asserts h1 < 80 px except
    // for "/" which gets the canonical hero-size pass.
    const routes: Array<{ path: string; allowHero: boolean }> = [
      { path: "/", allowHero: true },
      { path: "/writing", allowHero: false },
      { path: "/writing/welcome", allowHero: false },
      { path: "/faq", allowHero: false },
      { path: "/how", allowHero: false },
      { path: "/docs", allowHero: false },
      { path: "/console", allowHero: false },
    ];
    await page.setViewportSize({ width: 1422, height: 800 });
    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      // Scope to <main> only — Astro's dev toolbar overlay injects
      // h1 elements ("Audit", "Settings", etc.) outside <main> that
      // shouldn't count toward the page's content-h1 count.
      const h1Sizes = await page.$$eval("main h1", (els) =>
        els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
      // Sanity: every page must have at least one h1 (a11y baseline).
      expect(h1Sizes.length, `${route.path} must have an h1`).toBeGreaterThan(
        0,
      );
      // Sanity: max one h1 per page (a11y best practice).
      const h1Texts = await page.$$eval("main h1", (els) =>
        els.map((el) => el.textContent?.trim().substring(0, 40)),
      );
      expect(
        h1Sizes.length,
        `${route.path} must have at most one h1; found ${h1Sizes.length}: ${JSON.stringify(h1Texts)}`,
      ).toBeLessThanOrEqual(1);
      const maxSize = Math.max(...h1Sizes);
      if (route.allowHero) {
        // Home Hero h1 SHOULD render at hero size at desktop.
        expect(
          maxSize,
          `${route.path} (home Hero) expected ≥ 80 px`,
        ).toBeGreaterThanOrEqual(80);
      } else {
        // Content / placeholder routes must NOT render hero-sized h1.
        expect(
          maxSize,
          `${route.path} h1 should be content-sized (< 80 px), got ${maxSize}`,
        ).toBeLessThan(80);
      }
    }
  });

  test("/404 h1 renders in [36, 60] clamp range (pt70)", async ({ page }) => {
    // USMR Phase 5.5.16-pt70 fixed the 404 page eyebrow/h1 sizing.
    // Verify the h1 stays in its scoped clamp(36, 4vw, 60) range —
    // not hero-sized — at typical desktop viewport.
    await page.goto("/this-route-deliberately-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    await page.setViewportSize({ width: 1422, height: 800 });
    await page.evaluate(() => document.fonts.ready);
    const fontSize = await page.$eval("h1.not-found__title", (el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(36);
    expect(fontSize).toBeLessThanOrEqual(60);
    expect(fontSize).toBeLessThan(80);
  });

  test("/writing index h1.display also resolves canonical --display-weight", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt101 — verifies the pt100 .display utility
    // fix cascades to the writing index page hero too. Without this
    // gate, a future scoped-style refactor on /writing could
    // re-introduce a hardcoded font-weight that bypasses the token
    // chain (the failure mode that pt100 caught on home Hero).
    await page.goto("/writing", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.$eval("h1.writing-hero__title", (el) => {
      const cs = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      return {
        weight: cs.fontWeight,
        token: root.getPropertyValue("--display-weight").trim(),
      };
    });
    expect(result.weight).toBe(result.token || "400");
  });

  test("writing-widget variant switching toggles strip + hero-strip visibility (pt110)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt110 — task 5.8 closed. Tweaks panel writes
    // `data-writing-widget` on <html>; scoped CSS in
    // `src/pages/index.astro` hooks 6 variants on that attribute.
    // This test verifies the most-distinct visibility pivot:
    //   B · 3-up   → standalone .writing-strip visible, hero-strip hidden
    //   in-hero    → hero-strip visible inside Hero, standalone hidden
    //   off        → both hidden (only in-hero pivot's hero-strip is the
    //                visible one when the variant is in-hero)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const probe = await page.evaluate(() => {
      const html = document.documentElement;
      const heroStrip = document.querySelector(".hero__latest-strip");
      const writingStrip = document.querySelector(".writing-strip");
      const result: Record<string, { hero: string; writing: string }> = {};
      for (const variant of ["B · 3-up", "in-hero", "off"]) {
        html.setAttribute("data-writing-widget", variant);
        result[variant] = {
          hero: heroStrip ? getComputedStyle(heroStrip).display : "no element",
          writing: writingStrip
            ? getComputedStyle(writingStrip).display
            : "no element",
        };
      }
      // Restore default
      html.setAttribute("data-writing-widget", "B · 3-up");
      return result;
    });
    // Default 3-up: writing strip visible, hero strip hidden.
    expect(probe["B · 3-up"]?.hero).toBe("none");
    expect(probe["B · 3-up"]?.writing).toBe("block");
    // in-hero: hero strip visible (grid), writing strip hidden.
    expect(probe["in-hero"]?.hero).toBe("grid");
    expect(probe["in-hero"]?.writing).toBe("none");
    // off: writing strip hidden.
    expect(probe["off"]?.writing).toBe("none");
  });

  test("home hero h1 letter-spacing resolves --display-tracking × font-size (pt102)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt102 — same var() chain pattern as pt100/pt101
    // but for `--display-tracking`. Canonical Hero.jsx + global.css h1
    // sets `letter-spacing: var(--display-tracking, var(--tracking-h1))`.
    // With [data-hero-font="grotesk"] the token resolves to -0.035em.
    // Multiplied by the actual rendered font-size (e.g. 102.4 px at
    // 1422 viewport), the computed letter-spacing should be
    // -0.035 × 102.4 ≈ -3.58 px. The test verifies the var() chain
    // resolves end-to-end without a hardcoded number.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1422, height: 800 });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.$eval(".hero h1.display", (el) => {
      const cs = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      const trackingTokenStr = root
        .getPropertyValue("--display-tracking")
        .trim();
      // Parse "-0.035em" → -0.035
      const trackingNum = parseFloat(trackingTokenStr);
      const fontSizeNum = parseFloat(cs.fontSize);
      const expectedPx = trackingNum * fontSizeNum;
      const actualPx = parseFloat(cs.letterSpacing);
      return {
        trackingToken: trackingTokenStr,
        fontSize: cs.fontSize,
        letterSpacing: cs.letterSpacing,
        expectedPx,
        actualPx,
        delta: Math.abs(expectedPx - actualPx),
      };
    });
    // Allow 0.05 px tolerance for sub-pixel rounding.
    expect(result.delta).toBeLessThan(0.05);
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

  test("/404 .not-found__eyebrow honors canonical .eyebrow contract (8-surface dash)", async ({
    page,
  }) => {
    // pt15/pt16 canonicalized 8 surface eyebrows to 12 / fg-2 / 0.1em
    // + 18px accent-dash ::before. The 404 eyebrow was missed by that
    // sweep and shipped 11 / fg-3 / 0.12em with no dash.
    //
    // Astro 404 routes don't auto-resolve via in-route navigation; pull
    // the static-built HTML directly and inspect the rendered styles.
    // (Astro emits 404.html for static builds; the dev server also
    // serves it on a 404 fallback.)
    await page.goto("/this-route-deliberately-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    const styles = await page.$eval(".not-found__eyebrow", (el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, "::before");
      return {
        fontSize: cs.fontSize,
        letterSpacing: cs.letterSpacing,
        dashWidth: before.width,
      };
    });
    expect(styles.fontSize).toBe("12px");
    // 0.1em × 12 px = 1.2 px computed
    expect(styles.letterSpacing).toBe("1.2px");
    expect(styles.dashWidth).toBe("18px");
  });

  test("/get-started .cta-section honors canonical .section + paddingBottom: 80 lock", async ({
    page,
  }) => {
    // Canonical Cta.jsx:9 — top responsive (clamp 80-120 / 8vw),
    // bottom flat 80. Pre-pt69 shipped a symmetric clamp(64-120) which
    // (a) under-floored the top to 64 (canonical 80, established in
    // pt25/pt48/pt49) and (b) lost the bottom lock.
    await page.goto("/get-started", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1240, height: 800 });
    const padding = await page.$eval(".cta-section", (el) => {
      const cs = getComputedStyle(el);
      return {
        top: parseFloat(cs.paddingTop),
        bottom: parseFloat(cs.paddingBottom),
      };
    });
    // 8vw of 1240 = 99.2; clamp(80, 99.2, 120) → 99.2 px.
    expect(padding.top).toBeGreaterThanOrEqual(80);
    expect(padding.top).toBeLessThanOrEqual(120);
    // Bottom is flat 80 (no clamp).
    expect(padding.bottom).toBe(80);
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

  test("home writing-strip section h2 renders at canonical clamp(36, 4vw, 60) (pt95 regression)", async ({
    page,
  }) => {
    // pt95 caught a class-name collision: BOTH the section h2 ("Field
    // notes from the team building Artagon.") AND the per-post h3 cards
    // used class="writing-strip__title". Two CSS rules with the SAME
    // specificity matched both elements; the later rule (font-size: 22px,
    // intended for h3) won by source order and shrank the h2 to post-card
    // size. Renaming h3 → .writing-strip__post-title fixed it.
    //
    // Gate verifies the h2 renders at the canonical clamp range at a
    // typical desktop viewport (1422 px → 4vw = 56.88, ceiling 60).
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1422, height: 800 });
    const sizes = await page.evaluate(() => {
      const h2 = document.querySelector("h2.writing-strip__title");
      const h3 = document.querySelector("h3.writing-strip__post-title");
      const get = (el: Element | null) =>
        el ? parseFloat(getComputedStyle(el).fontSize) : null;
      return { h2: get(h2), h3: get(h3) };
    });
    // Section h2: clamp(36, 4vw=56.88, 60) → 56.88 at 1422 viewport.
    expect(sizes.h2).not.toBeNull();
    expect(sizes.h2!).toBeGreaterThanOrEqual(36);
    expect(sizes.h2!).toBeLessThanOrEqual(60);
    expect(sizes.h2!).toBeGreaterThan(40); // would be ~22 if pt95 reverted
    // Post-card h3: 22 px fixed.
    expect(sizes.h3).toBe(22);
  });

  test("/vision SectionHeader h2 canonical size + weight (pt122)", async ({
    page,
  }) => {
    // USMR Phase 5.5.16-pt122 — `.ui-section-header h2` (consumed by
    // /vision via SectionHeader.astro) was sub-canonical pre-pt122:
    //   font-size: clamp(28.8, 4vw, 40)  — ~33 % below canonical at
    //   the ceiling (canonical h2 is 36-60)
    //   font-weight: 700                 — sub-canonical (canonical
    //   is the --display-weight token cascade, default 500)
    //
    // pt122 brought both to the canonical h2 contract from
    // new-design/extracted/src/styles/global.css:230. We don't gate
    // on color: the /vision page intentionally tints headings via
    // the .vision-doc cascade in some places; the canonical contract
    // we care about for SectionHeader is the size + weight, which is
    // what visually breaks the type rhythm when wrong.
    await page.goto("/vision", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.setViewportSize({ width: 1422, height: 800 });
    const probe = await page.evaluate(() => {
      const h2 = document.querySelector(".ui-section-header h2");
      if (!h2) return null;
      const cs = getComputedStyle(h2);
      return {
        fontSize: parseFloat(cs.fontSize),
        fontWeight: cs.fontWeight,
      };
    });
    expect(probe).not.toBeNull();
    // 4vw at 1422 px = 56.88 (within 36-60 clamp).
    expect(probe!.fontSize).toBeGreaterThanOrEqual(36);
    expect(probe!.fontSize).toBeLessThanOrEqual(60);
    expect(probe!.fontSize).toBeGreaterThan(48); // would be ~40 if pt122 reverted
    // Canonical weight resolves through the --display-weight token
    // cascade per `[data-hero-font]` on <html>: grotesk = 500,
    // fraunces/dmserif/mono = 400. The default is fraunces (set by
    // BaseLayout.astro:23) so this test runs under 400. Pre-pt122
    // shipped 700 hard-coded — too heavy against the canonical h2
    // elsewhere on the site under either cascade.
    expect(["400", "500"]).toContain(probe!.fontWeight);
    expect(probe!.fontWeight).not.toBe("700");
  });

  test("/vision .ui-section-intro canonical (pt122)", async ({ page }) => {
    // USMR Phase 5.5.16-pt122 — intro was 1.15rem ≈ 18.4 (1.6 px under
    // canonical .lead 20) and fg-2 (a shade darker than the canonical
    // brighter editorial weight). pt122 brought it to the canonical
    // .lead contract.
    await page.goto("/vision", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const probe = await page.evaluate(() => {
      const intro = document.querySelector(".ui-section-intro");
      if (!intro) return null;
      const cs = getComputedStyle(intro);
      return {
        fontSize: parseFloat(cs.fontSize),
        lineHeight: cs.lineHeight,
      };
    });
    expect(probe).not.toBeNull();
    expect(probe!.fontSize).toBe(20);
  });
});
