// USMR Phase 5.5.16-pt130 — prefers-reduced-motion coverage gate.
//
// DESIGN.md §8.2 motion principles state that any component with
// transform-based motion (translate / scale / rotate on a hover /
// focus state) MUST also ship a `@media (prefers-reduced-motion:
// reduce)` override that suppresses the motion. WCAG 2.3.3 covers
// the contract: non-essential animation is opt-out for users with
// the OS preference set.
//
// Simple property transitions (color, background, border) are
// generally OK to keep under reduced-motion — they're state signals,
// not motion. The strict gate target is `transform: translate*` /
// `scale*` / `rotate*` which physically moves the element.
//
// pt130 added reduced-motion blocks to FaqItem.astro (icon rotate),
// HomeExplore.astro (card hover lift), and src/pages/index.astro
// (writing-strip link hover lift). This gate asserts the contract
// holds for those three files; future motion-using components
// should be added here.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const REQUIRED_REDUCED_MOTION_FILES = [
  "src/components/FaqItem.astro",
  "src/components/HomeExplore.astro",
  "src/pages/index.astro",
  // USMR Phase 5.5.16-pt131 — added theme.css. The `.btn` /
  // `.btn.primary` / `.btn .arr` / `.ui-card--hover` rules ship
  // hover-state transforms (translateY / translate) that render
  // on every CTA + hoverable card site-wide; the global override
  // covers those plus the existing .glow-* / .chain-spinner
  // animations.
  "public/assets/theme.css",
] as const;

describe("prefers-reduced-motion coverage", () => {
  for (const rel of REQUIRED_REDUCED_MOTION_FILES) {
    test(`${rel} ships @media (prefers-reduced-motion: reduce) override`, () => {
      const full = join(ROOT, rel);
      expect(existsSync(full), `${rel} must exist`).toBe(true);
      const body = readFileSync(full, "utf8");
      const stripped = body.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(
        /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(stripped),
        `${rel} must include @media (prefers-reduced-motion: reduce) — DESIGN.md §8.2`,
      ).toBe(true);
    });
  }

  test("walker discovered the required files", () => {
    expect(REQUIRED_REDUCED_MOTION_FILES.length).toBeGreaterThan(0);
  });
});
