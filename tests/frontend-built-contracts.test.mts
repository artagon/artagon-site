import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "cheerio";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { parseGlossaryText } from "../src/data/glossary";

const dist = ".build/dist";
const page = (route: string) =>
  load(readFileSync(join(dist, route, "index.html"), "utf8"));

describe("WP-E built frontend contracts (build required)", () => {
  it.each(["platform", "bridge", "use-cases", "standards", "roadmap"])(
    "renders one content-owned h1 on /%s",
    (route) => {
      const $ = page(route);
      const { frontmatter } = parseFrontmatter(
        readFileSync(`src/content/pages/${route}.mdx`, "utf8"),
      );
      expect($("main h1")).toHaveLength(1);
      expect($("main h1").text().replace(/\s/g, "")).toBe(
        frontmatter.headline.replace(/[\s*\[\]]/g, ""),
      );
      expect($("meta[name=description]").attr("content")).toBe(
        frontmatter.description,
      );
      if (route === "platform" || route === "roadmap") {
        expect(frontmatter.description.length).toBeGreaterThanOrEqual(150);
        expect(frontmatter.description.length).toBeLessThanOrEqual(160);
      }
    },
  );

  it.each([
    ["platform", 3],
    ["use-cases", 4],
  ] as const)(
    "matches enhanced first paint and provides a no-script panel override on /%s",
    (route, count) => {
      const $ = page(route);
      expect($("[role=tabpanel]")).toHaveLength(count);
      expect($("[role=tabpanel][hidden]")).toHaveLength(count - 1);
      expect($("[role=tabpanel]").first().is("[hidden]")).toBe(false);
      expect($("[role=tab][disabled]")).toHaveLength(count);
      expect($("astro-island")).toHaveLength(0);
      const css = $('link[rel="stylesheet"]')
        .toArray()
        .map((el) => $(el).attr("href")!)
        .filter((href) => href.startsWith("/_astro/"))
        .map((href) => readFileSync(join(dist, href.slice(1)), "utf8"))
        // USMR 14.10: Astro may inline a stylesheet after consolidation.
        .concat($("style").toArray().map((el) => $(el).html() ?? ""))
        .join("")
        .replace(/\s/g, "");
      const prefix = route === "platform" ? "pillars" : "use-cases";
      const display = route === "platform" ? "grid" : "flex";
      expect(css).toMatch(
        new RegExp(
          `@media\\(scripting:none\\)\\{[^@]*?\\.${prefix}__panel\\[hidden\\]\\{display:${display}[;}]`,
        ),
      );
      expect(css).not.toContain(":not([data-tabs-ready])");
    },
  );

  it("renders bridge step glossary abbreviations and retains external links elsewhere", () => {
    const $ = page("bridge");
    expect($(".bridge-step a, .bridge-step button")).toHaveLength(0);
    expect($(".bridge-step abbr.standard-chip[title]")).toHaveLength(4);
    expect($(".bridge-party a.standard-chip").length).toBeGreaterThan(0);
    expect($("astro-island")).toHaveLength(0);
    expect($(".bridge-step.is-active .bridge-step__title").text()).toBe(
      "Verify",
    );
  });

  it("emits real anchor targets and conversion destinations", () => {
    const home = load(readFileSync(join(dist, "index.html"), "utf8"));
    expect(home('.hero a[href="#playground"]')).toHaveLength(1);
    for (const link of home('a[href^="#"]').toArray()) {
      const target = home(link).attr("href")!.slice(1);
      // Empty fragments are valid links to the top of the current document.
      if (!target || target.toLowerCase() === "top") continue;
      expect(
        home(`[id="${target}"]`).length,
        `home #${target}`,
      ).toBeGreaterThan(0);
    }
    expect(page("how")('a[href="/platform#pillars"]')).toHaveLength(1);
    expect(page("platform")("#pillars")).toHaveLength(1);
    for (const slug of [
      "welcome",
      "bridge-strategy",
      "compounding-trust-chain",
    ]) {
      expect(
        page(`writing/${slug}`)('.post-footer__cta-card[href="/get-started"]'),
      ).toHaveLength(1);
    }
    const roadmap = page("roadmap");
    expect(roadmap(".roadmap-phase[style]")).toHaveLength(0);
    for (const id of ["v1", "v2", "v3", "v4", "v5"])
      expect(roadmap(`li#${id}`)).toHaveLength(1);
  });

  it("compiles FAQ paragraph selectors without requiring child scope attributes", () => {
    const $ = page("faq");
    const styles = $('link[rel="stylesheet"]')
      .toArray()
      .map((el) => $(el).attr("href")!)
      .filter((href) => href.startsWith("/_astro/"));
    const css = styles
      .map((href) => readFileSync(join(dist, href.slice(1)), "utf8"))
      .join("\n");
    expect(css).toMatch(/\.faq-answer(?:\[[^\]]+\])? p\{margin:0[;}]/);
    expect(
      Object.keys($(".faq-answer p").first().attr() ?? {}).some((key) =>
        key.startsWith("data-astro-cid"),
      ),
    ).toBe(false);
  });

  it("omits unconfigured search assets and SearchAction while retaining __setTheme", () => {
    const search = readFileSync(join(dist, "search/index.html"), "utf8");
    expect(search).not.toContain("cdn.jsdelivr.net/npm/@docsearch");
    expect(search).not.toContain('"@type":"SearchAction"');
    expect(search).toContain("__setTheme");
    expect(page("search")("html").attr("class") ?? "").not.toContain("no-js");
    expect(page("search")("#docsearch-fallback").text()).toContain(
      "coming soon",
    );
    expect(page("search")("#docsearch, #results")).toHaveLength(0);
  });

  it("uses closed glossary tokens and rejects unknown marked frontmatter terms", () => {
    expect(parseGlossaryText("Your [OIDC] app")).toEqual([
      { kind: "text", value: "Your " },
      { kind: "term", value: "OIDC" },
      { kind: "text", value: " app" },
    ]);
    expect(() => parseGlossaryText("[OIDC-typo]")).toThrow(
      /Unknown glossary term/,
    );
  });
});
