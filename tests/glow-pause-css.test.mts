import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const THEME_CSS = join(ROOT, "public", "assets", "theme.css");
const GLOW_SECTION_END = "/* USMR Phase 5.5.16-pt131";
const PAUSED_HOST = ".glow-tag[data-glow-paused]";

function glowSection(css: string): string {
  const start = css.indexOf(".glow-tag {");
  const end = css.indexOf(GLOW_SECTION_END, start);
  if (start === -1 || end === -1) {
    throw new Error("Could not find the glow component section in theme.css");
  }
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
}

function animatedGlowSelectors(section: string): string[] {
  const selectors = new Set<string>();
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of section.matchAll(rulePattern)) {
    const selector = match[1]?.trim();
    const declarations = match[2] ?? "";
    const usesGlowAnimation = /(?:^|;)\s*animation(?:-name)?\s*:\s*[^;]*\bglow-[\w-]+\b[^;]*(?:;|$)/i.test(
      declarations,
    );
    if (!selector || selector.startsWith("@") || !usesGlowAnimation) continue;

    for (const item of selector.split(",")) selectors.add(item.trim());
  }

  return [...selectors].sort();
}

function expectedPauseSelector(animatedSelector: string): string {
  if (animatedSelector.startsWith(".glow-tag")) {
    return `${PAUSED_HOST}${animatedSelector.slice(".glow-tag".length)}`;
  }
  return `${PAUSED_HOST} ${animatedSelector}`;
}

function pauseSelectors(section: string): string[] {
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of section.matchAll(rulePattern)) {
    const selector = match[1]?.trim();
    const declarations = match[2] ?? "";
    if (
      selector?.includes(PAUSED_HOST) &&
      /(?:^|;)\s*animation-play-state\s*:\s*paused\s*(?:;|$)/i.test(
        declarations,
      )
    ) {
      return selector.split(",").map((item) => item.trim());
    }
  }
  return [];
}

function missingPauseSelectors(
  animatedSelectors: string[],
  pausedSelectors: string[],
): string[] {
  const paused = new Set(pausedSelectors);
  return animatedSelectors
    .map(expectedPauseSelector)
    .filter((selector) => !paused.has(selector));
}

describe("glow animation pause CSS coverage", () => {
  const section = glowSection(readFileSync(THEME_CSS, "utf8"));
  const animatedSelectors = animatedGlowSelectors(section);
  const pausedSelectors = pauseSelectors(section);

  test("the paused rule covers every animated glow element and pseudo-element", () => {
    expect(animatedSelectors.length).toBeGreaterThan(0);
    expect(pausedSelectors).toContain(`${PAUSED_HOST} .glow-dot`);
    expect(missingPauseSelectors(animatedSelectors, pausedSelectors)).toEqual([]);
  });

  test("a missing pause selector is detected by the coverage check", () => {
    const omittedSelector = expectedPauseSelector(animatedSelectors[0]!);
    const negativeControl = pausedSelectors.filter(
      (selector) => selector !== omittedSelector,
    );

    expect(missingPauseSelectors(animatedSelectors, negativeControl)).toContain(
      omittedSelector,
    );
  });
});
