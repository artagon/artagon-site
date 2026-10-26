// USMR 14.13: visual coverage uses the production tuple, and CSS defines
// exactly those themes. No host or Linux baselines are regenerated here.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { THEMES } from "../src/scripts/tweaks-state.ts";

const spec = readFileSync(new URL("./styling-snapshots.spec.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/assets/theme.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("styling-snapshots production themes (USMR 14.13)", () => {
  test("snapshot spec imports the shared tuple instead of maintaining a local list", () => {
    expect(spec).toMatch(/import\s*\{\s*THEMES\s*\}\s*from\s*["']\.\.\/src\/scripts\/tweaks-state\.ts["']/);
    expect(spec).not.toMatch(/\bconst\s+THEMES\s*=/);
  });

  test("live CSS root themes equal the complete production vocabulary", () => {
    // USMR site-g3f R3: a theme may have layered and unlayered blocks.
    const live = new Set([...css.matchAll(/^\s*:root\[data-theme="([a-z][a-z0-9-]*)"\]\s*\{/gm)]
      .map(match => match[1]!));
    expect([...live].sort()).toEqual([...THEMES].sort());
    expect(live.size).toBe(THEMES.length);
  });

  test("no retired dark/light theme selector remains, including descendant and accent rules", () => {
    expect(css).not.toMatch(/\[data-theme\s*=\s*["']?(?:dark|light)(?:["']|\])/);
  });
});
