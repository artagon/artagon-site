import { describe, expect, test } from "vitest";
import {
  PRIMARY,
  SECONDARY,
  isExternal,
  type ExploreIdx,
} from "../src/data/home-explore.ts";

// USMR Phase 5.5.7 — HomeExplore registry invariants. PRIMARY (4 cards)
// + SECONDARY (2 wide cards) = 6 entry points into the marketing site.
// A future PR dropping a card silently halves the grid; a stray idx
// value breaks the canonical "01..06" mono-uppercase ordering.

describe("home-explore — tuple shape", () => {
  test("PRIMARY has exactly 4 cards", () => {
    expect(PRIMARY).toHaveLength(4);
  });

  test("SECONDARY has exactly 2 cards", () => {
    expect(SECONDARY).toHaveLength(2);
  });

  test("idx values are exactly '01'..'06' in order", () => {
    const all = [...PRIMARY, ...SECONDARY];
    const idxs = all.map((c) => c.idx);
    expect(idxs).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
    ] satisfies ExploreIdx[]);
  });

  test("idx values are unique", () => {
    const all = [...PRIMARY, ...SECONDARY];
    const idxs = all.map((c) => c.idx);
    expect(new Set(idxs).size).toBe(idxs.length);
  });
});

describe("home-explore — card content", () => {
  for (const card of [...PRIMARY, ...SECONDARY]) {
    describe(`${card.idx} ${card.title}`, () => {
      test("title + desc + href are non-empty", () => {
        expect(card.title.trim()).not.toBe("");
        expect(card.desc.trim()).not.toBe("");
        expect(card.href.trim()).not.toBe("");
      });

      test("href is either an absolute external URL or a root-relative path", () => {
        // Astro routes start with `/`; externals start with http(s):// or
        // protocol-relative `//`. No relative `../` paths — they break
        // when the card is mounted on a different route.
        const ok =
          card.href.startsWith("/") || /^(https?:\/\/|\/\/)/i.test(card.href);
        expect(
          ok,
          `href="${card.href}" must be absolute or root-relative`,
        ).toBe(true);
      });

      test("desc is a real sentence (>= 30 chars)", () => {
        // Catches accidental truncation. Shortest canonical desc is
        // ~60 chars; 30 is a generous floor.
        expect(card.desc.length).toBeGreaterThanOrEqual(30);
      });
    });
  }
});

describe("home-explore — canonical card destinations", () => {
  test("PRIMARY routes to the 4 product surfaces (Platform / Bridge / Use cases / Standards)", () => {
    const titles = PRIMARY.map((c) => c.title);
    expect(titles).toEqual([
      "Platform",
      "The Bridge",
      "Use cases",
      "Standards",
    ]);
    const hrefs = PRIMARY.map((c) => c.href);
    expect(hrefs).toEqual(["/platform", "/bridge", "/use-cases", "/standards"]);
  });

  test("SECONDARY is exactly Roadmap (internal) + GitHub (external)", () => {
    expect(SECONDARY[0]!.title).toBe("Roadmap");
    expect(SECONDARY[0]!.href).toBe("/roadmap");
    expect(SECONDARY[1]!.title).toBe("GitHub");
    expect(SECONDARY[1]!.href).toMatch(/^https?:\/\/github\.com\/artagon/i);
  });

  test("only the GitHub card is external", () => {
    const externals = [...PRIMARY, ...SECONDARY].filter((c) =>
      isExternal(c.href),
    );
    expect(externals).toHaveLength(1);
    expect(externals[0]!.title).toBe("GitHub");
  });
});

describe("home-explore — isExternal predicate", () => {
  test("matches https / http / protocol-relative", () => {
    expect(isExternal("https://github.com/artagon")).toBe(true);
    expect(isExternal("http://example.com")).toBe(true);
    expect(isExternal("//cdn.example.com/asset.js")).toBe(true);
  });

  test("rejects relative + absolute root paths", () => {
    expect(isExternal("/platform")).toBe(false);
    expect(isExternal("/bridge")).toBe(false);
    expect(isExternal("./relative")).toBe(false);
    expect(isExternal("#anchor")).toBe(false);
  });
});
