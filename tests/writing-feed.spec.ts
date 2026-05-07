import { test, expect } from "@playwright/test";

/**
 * USMR Phase 5.1q.10 — RSS feed shape contract.
 *
 * `src/pages/writing/feed.xml.ts` emits an `@astrojs/rss` document that
 * external feed readers + the `<a rel="alternate" type="application/rss+xml">`
 * link consume. Zero coverage today: a draft-filter regression that
 * leaks unpublished posts ships green; an empty `context.site` produces
 * bare-link RSS that breaks readers.
 *
 * The spec runs on chromium only — RSS payload is engine-agnostic and
 * one engine covers the contract.
 */

test.describe("Writing feed (/writing/feed.xml) — shape contract", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "RSS payload is engine-agnostic; one engine covers the contract.",
    );
  });

  test("emits XML with the canonical channel title", async ({ page }) => {
    const response = await page.request.get("/writing/feed.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
    const body = await response.text();
    expect(body).toMatch(/^<\?xml/);
    expect(body).toContain("<title>Artagon — Writing</title>");
    expect(body).toContain("<language>en-us</language>");
  });

  test("every <item> has a non-empty <title> + <link> + <pubDate>", async ({
    page,
  }) => {
    const response = await page.request.get("/writing/feed.xml");
    const body = await response.text();
    const items = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    expect(items.length).toBeGreaterThan(0);
    for (const m of items) {
      const item = m[1] ?? "";
      expect(item).toMatch(/<title>[^<]+<\/title>/);
      expect(item).toMatch(/<link>https?:\/\/[^<]+<\/link>/);
      expect(item).toMatch(/<pubDate>[^<]+<\/pubDate>/);
    }
  });

  test("draft posts are filtered out (item count matches non-draft post count)", async ({
    page,
  }) => {
    // The real filter is `feed.xml.ts:6  !p.data.draft` (frontmatter
    // boolean), not a slug pattern. A polarity flip (`!p.data.draft` →
    // `p.data.draft`) would silently invert the feed: zero items where
    // every post is non-draft, or all-drafts where one is. Pin the
    // count against the page-rendered /writing index, which loops over
    // the same `getCollection('writing').filter(!draft)` set.
    const [feedResponse, indexResponse] = await Promise.all([
      page.request.get("/writing/feed.xml"),
      page.request.get("/writing"),
    ]);
    const feedBody = await feedResponse.text();
    const indexBody = await indexResponse.text();
    const feedItemCount = (feedBody.match(/<item>/g) ?? []).length;
    // The /writing index renders one `<li class="writing-index__item">`
    // per non-draft post (src/pages/writing/index.astro). If the index
    // template changes, this test needs updating — that's a feature,
    // not a bug.
    const indexCardCount = (
      indexBody.match(/<li class="writing-index__item"/g) ?? []
    ).length;
    // Sanity: at least one published post must exist (welcome.mdx).
    expect(feedItemCount, "RSS items").toBeGreaterThan(0);
    expect(feedItemCount).toBe(indexCardCount);
  });

  test("links are absolute URLs (context.site is wired)", async ({ page }) => {
    const response = await page.request.get("/writing/feed.xml");
    const body = await response.text();
    const linkMatches = [...body.matchAll(/<link>([^<]+)<\/link>/g)];
    // The first <link> is the channel self-link; subsequent ones are
    // per-item permalinks. All MUST be absolute URLs (starting with
    // http(s)://) — bare /writing/welcome paths are a regression.
    for (const m of linkMatches) {
      expect(m[1]!).toMatch(/^https?:\/\//);
    }
  });
});
