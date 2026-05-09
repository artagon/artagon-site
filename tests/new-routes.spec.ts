import { test, expect } from "@playwright/test";

// USMR Phase 5.5.7 — Smoke spec for the routes shipped in 5.2.8 / 5.3
// / 5.4 / 5.7. Data-shape invariants are gated by vitest
// (bridge-data, use-cases-data, standards-data, roadmap-data tests);
// this spec catches rendered-route regressions where the data is fine
// but a layout import / collection filter / island hydration breaks
// silently.

test.describe("/bridge — BridgeFlow island", () => {
  test("renders the canonical hero + 3-party board + 4-step strip", async ({
    page,
  }) => {
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Canonical hero from BridgeFlow.tsx — "Your legacy OIDC app, now
    // cryptographically verified.". The `cryptographically verified`
    // span is serif italic via .bridge-flow__title-emphasis.
    await expect(page.locator(".bridge-flow__title")).toContainText(
      /Your legacy.*OIDC.*app/i,
    );
    await expect(page.locator(".bridge-flow__title-emphasis")).toBeVisible();

    // 3 party cards — Relying party / Trust service / Holder.
    await expect(page.locator(".bridge-party")).toHaveCount(3);

    // 4 protocol steps.
    await expect(page.locator(".bridge-step")).toHaveCount(4);

    // Result sentence with cyan-accented "high-assurance identity".
    await expect(page.locator(".bridge-flow__result-accent")).toContainText(
      /high-assurance identity/i,
    );
  });
});

test.describe("/use-cases — UseCasesIsland tablist", () => {
  test("renders the canonical hero + 4 scenario tabs + active panel", async ({
    page,
  }) => {
    await page.goto("/use-cases");
    await page.waitForLoadState("networkidle");

    // Canonical hero "The hard identity problems — solved cleanly."
    // with serif italic on "solved cleanly".
    await expect(page.locator("#use-cases-heading")).toContainText(
      /hard identity problems/i,
    );
    await expect(page.locator(".use-cases__title-emphasis")).toBeVisible();

    // 4 vertical-rail tabs.
    const tabs = page.locator('.use-cases__rail [role="tab"]');
    await expect(tabs).toHaveCount(4);

    // Active panel renders the metrics strip (3 KVs) + protocol trace.
    const activePanel = page.locator(".use-cases__panel:not([hidden])");
    await expect(activePanel.locator(".use-cases__metric")).toHaveCount(3);
    await expect(activePanel.locator(".use-cases__trace-line")).not.toHaveCount(
      0,
    );

    // Decision line (last trace line) is rendered with .is-decision
    // class so the renderer can paint it in --accent.
    await expect(
      activePanel.locator(".use-cases__trace-line.is-decision"),
    ).toHaveCount(1);
  });
});

test.describe("/standards — StandardsWall", () => {
  test("renders the 3-column wall + 4-badge affiliation row", async ({
    page,
  }) => {
    await page.goto("/standards");

    // Static Astro — no hydration to wait for.
    // Canonical hero "We don't invent protocols." per StandardsWall.astro.
    await expect(page.locator("#standards-wall-heading")).toContainText(
      /We.*implement/i,
    );

    // 3 columns: Authn & Authz / Decentralized ID / Authorization.
    await expect(page.locator(".standards-col")).toHaveCount(3);

    // 4 affiliation badges below the wall.
    await expect(page.locator(".standards-badge")).toHaveCount(4);
  });
});

test.describe("/roadmap — RoadmapTimeline", () => {
  test("renders 5 phase cards V1..V5 with status dots", async ({ page }) => {
    await page.goto("/roadmap");

    // 5-phase horizontal timeline (li.roadmap-phase children of the
    // roadmap-timeline__phases <ol>).
    await expect(page.locator("li.roadmap-phase")).toHaveCount(5);

    // Status dots — every phase has one.
    await expect(page.locator(".roadmap-phase__dot")).toHaveCount(5);

    // V1..V5 mono prefixes.
    const versions = await page
      .locator(".roadmap-phase__version")
      .allTextContents();
    expect(versions).toEqual(["V1", "V2", "V3", "V4", "V5"]);
  });
});

test.describe("/platform — PillarsIsland tablist", () => {
  test("renders 3 pillar tabs with canonical taxonomy + Identity panel as default", async ({
    page,
  }) => {
    await page.goto("/platform");
    await page.waitForLoadState("networkidle");

    // 3 pillar tabs — canonical taxonomy IDENTITY / CREDENTIALS / AUTHORIZATION.
    // PillarsIsland uses a horizontal tablist (no aria-orientation
    // attribute, since horizontal is the default). Scope by the
    // tab-strip container to avoid matching the trust-chain tablist
    // on /platform's mounted islands.
    const tabs = page.locator('.pillars__tabs [role="tab"]');
    await expect(tabs).toHaveCount(3);

    // Default selected tab is Identity (per PillarsIsland.tsx initial
    // state). All 3 tabpanels render in the DOM (hidden via [hidden]);
    // scope to the visible panel's specimen head.
    const activeHead = page.locator(
      '[role="tabpanel"]:not([hidden]) .pillar-specimen__head',
    );
    await expect(activeHead).toContainText(/alg/i);
    await expect(activeHead).toContainText(/jwk/i);
  });
});
