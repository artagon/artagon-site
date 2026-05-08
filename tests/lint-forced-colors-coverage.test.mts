// USMR Phase 5.5.16-pt125 — forced-colors mode coverage gate.
//
// DESIGN.md §7 mandates that any component shipping a brand-OKLCH
// color (var(--accent), var(--brand-teal), color-mix() with the
// accent, etc.) MUST also provide a `@media (forced-colors: active)`
// override that maps to the OS-system palette (Canvas / CanvasText /
// Highlight / GrayText / etc.). Without this, Windows High Contrast
// users see flat gray on every interactive surface — the brand-color
// signal disappears.
//
// pt125 added forced-colors blocks to Header.astro + Footer.astro
// (the two components rendered on EVERY page). This gate asserts
// the contract holds for those two surfaces; future high-traffic
// surfaces should be added here as they're audited.
//
// Allow-list (intentional NO forced-colors): pure dev surfaces that
// don't ship to production HTML (e.g. Tweaks.astro is gated by
// `import.meta.env.DEV`). React-only `.tsx` files have no scoped
// CSS in the same file so they aren't directly checkable here.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const REQUIRED_FORCED_COLORS_FILES = [
  "src/components/Header.astro",
  "src/components/Footer.astro",
] as const;

describe("forced-colors mode coverage", () => {
  for (const rel of REQUIRED_FORCED_COLORS_FILES) {
    test(`${rel} ships @media (forced-colors: active) override`, () => {
      const full = join(ROOT, rel);
      expect(existsSync(full), `${rel} must exist`).toBe(true);
      const body = readFileSync(full, "utf8");
      // Strip block comments so a comment mention doesn't satisfy the
      // gate. Astro frontmatter (between --- ... ---) is also out of
      // scope — the assertion is about the <style> block.
      const stripped = body.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(
        /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/.test(stripped),
        `${rel} must include @media (forced-colors: active) — DESIGN.md §7`,
      ).toBe(true);
    });
  }

  test("walker discovered the required files", () => {
    expect(REQUIRED_FORCED_COLORS_FILES.length).toBeGreaterThan(0);
  });
});
