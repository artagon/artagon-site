// Reduced-motion coverage follows CSS sources that ship motion behavior or
// already define the contract, so color-only transitions stay out of scope.

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
  "src/components/FaqItem.astro",
  "src/components/HomeExplore.astro",
  "src/pages/index.astro",
  "public/assets/theme.css",
] as const;
const REDUCED_MOTION =
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i;
const ANIMATION = /@keyframes\b|\banimation(?:-[a-z-]+)?\s*:/i;
const TRANSITION_TO_MOTION =
  /\btransition(?:-[a-z-]+)?\s*:[^;{}]*(?:\btransform\b|\ball\b)/i;
const INTERACTION_TRANSFORM =
  /(?:^|})\s*[^{}]*(?::hover|:focus(?:-visible)?)[^{}]*\{[^{}]*(?:transform|translate|scale|rotate)\s*:/i;

function isDevelopmentOnly(source: string): boolean {
  return /\bimport\.meta\.env\.DEV\b/.test(source) && /\bisDev\s*&&/.test(source);
}

function hasMotion(css: string): boolean {
  return (
    ANIMATION.test(css) ||
    TRANSITION_TO_MOTION.test(css) ||
    INTERACTION_TRANSFORM.test(css)
  );
}

const REQUIRED_SOURCES = discoverStyleSources(ROOT, STYLE_ROOTS)
  .map((source) => ({ ...source, css: stripCssComments(source.css) }))
  .filter(
    ({ source, css }) =>
      !isDevelopmentOnly(source) && (hasMotion(css) || REDUCED_MOTION.test(css)),
  );

describe("prefers-reduced-motion coverage", () => {
  for (const source of REQUIRED_SOURCES) {
    test(`${source.relativePath} ships @media (prefers-reduced-motion: reduce) override`, () => {
      expect(
        REDUCED_MOTION.test(source.css),
        `${source.relativePath} must include @media (prefers-reduced-motion: reduce) — DESIGN.md §8.2`,
      ).toBe(true);
    });
  }

  test("discovers motion behavior and existing reduced-motion contracts", () => {
    expect(REQUIRED_SOURCES.length).toBeGreaterThan(0);
  });

  test("retains every historically required motion surface", () => {
    const discovered = new Set(REQUIRED_SOURCES.map((source) => source.relativePath));
    const missing = HISTORICALLY_REQUIRED.filter((path) => !discovered.has(path));
    expect(missing, "historically required reduced-motion sources must be discovered").toEqual([]);
  });
});
