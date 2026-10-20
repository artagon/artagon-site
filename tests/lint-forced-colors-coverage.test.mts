// Forced-colors coverage follows CSS-bearing production sources instead of
// maintaining a list that can drift when components or pages are added.

import { describe, expect, test } from "vitest";
import {
  discoverStyleSources,
  stripCssComments,
} from "./helpers/lint-discovery.js";

const ROOT = new URL("..", import.meta.url).pathname;
const STYLE_ROOTS = [
  "src/components",
  "src/pages",
  "src/styles",
  "public/assets",
] as const;
const HISTORICALLY_REQUIRED = [
  "src/components/Header.astro",
  "src/components/Footer.astro",
  "src/components/FaqItem.astro",
  "src/components/FaqSearch.astro",
  "src/components/StandardsWall.astro",
  "src/pages/faq/index.astro",
  "src/pages/index.astro",
] as const;
const FORCED_COLORS = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/i;
const BRANDED_COLOR = /--(?:accent|brand-teal)(?:-[\w-]+)?\b/i;

function isDevelopmentOnly(source: string): boolean {
  return /\bimport\.meta\.env\.DEV\b/.test(source) && /\bisDev\s*&&/.test(source);
}

function requiresForcedColors(source: string, css: string): boolean {
  return (
    !isDevelopmentOnly(source) &&
    (BRANDED_COLOR.test(css) || FORCED_COLORS.test(css))
  );
}

const REQUIRED_SOURCES = discoverStyleSources(ROOT, STYLE_ROOTS)
  .map((source) => ({ ...source, css: stripCssComments(source.css) }))
  .filter(({ source, css }) => requiresForcedColors(source, css));
const GLOBAL_THEME = REQUIRED_SOURCES.find(
  (source) => source.relativePath === "public/assets/theme.css",
);

function hasGlobalAccentMapping(css: string): boolean {
  const query = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/gi;
  for (const match of css.matchAll(query)) {
    const openBrace = css.indexOf("{", match.index! + match[0].length);
    if (openBrace < 0) continue;

    let depth = 0;
    for (let index = openBrace; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;
      if (depth === 0) {
        const block = css.slice(openBrace + 1, index);
        if (/--accent\s*:\s*Highlight\s*;/i.test(block)) return true;
        break;
      }
    }
  }
  return false;
}

const HAS_GLOBAL_ACCENT_MAPPING = GLOBAL_THEME
  ? hasGlobalAccentMapping(GLOBAL_THEME.css)
  : false;

function hasForcedColorsCoverage(source: string, css: string): boolean {
  return (
    FORCED_COLORS.test(css) ||
    (source.startsWith("src/styles/") && HAS_GLOBAL_ACCENT_MAPPING)
  );
}

describe("forced-colors mode coverage", () => {
  for (const source of REQUIRED_SOURCES) {
    test(`${source.relativePath} has forced-colors coverage`, () => {
      expect(
        hasForcedColorsCoverage(source.relativePath, source.css),
        `${source.relativePath} must include a forced-colors override or inherit the global accent mapping — DESIGN.md §11.7`,
      ).toBe(true);
    });
  }

  test("discovers branded colors and existing forced-colors contracts", () => {
    expect(REQUIRED_SOURCES.length).toBeGreaterThan(0);
  });

  test("retains every historically required production surface", () => {
    const discovered = new Set(REQUIRED_SOURCES.map((source) => source.relativePath));
    const missing = HISTORICALLY_REQUIRED.filter((path) => !discovered.has(path));
    expect(missing, "historically required forced-colors sources must be discovered").toEqual([]);
  });

  test("keeps an accent-only source required if its override is removed", () => {
    const accentOnlyCss = ".accent-label { color: var(--accent); }";

    expect(requiresForcedColors("src/components/AccentOnly.astro", accentOnlyCss))
      .toBe(true);
    expect(hasForcedColorsCoverage("src/components/AccentOnly.astro", accentOnlyCss))
      .toBe(false);
  });

  test("the global stylesheet maps branded accents to system colors", () => {
    expect(HAS_GLOBAL_ACCENT_MAPPING).toBe(true);
  });
});
