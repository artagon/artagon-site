// USMR Phase 5.5.16-pt176 — DESIGN.md prose vs token-source-of-truth.
//
// DESIGN.md is the canonical visual-identity contract. When the prose
// cites a token via `var(--name)` or backticked `--name`, that token
// MUST exist in the live token sources (`public/assets/theme.css` or
// any `src/styles/**/*.{css,scss}`). Otherwise the doc lies about
// what the cascade can express — readers chase aliases that were
// retired, and consumers (other agents, contributors) emit dead refs.
//
// Pre-pt176 DESIGN.md §2 "Token aliasing" still claimed
// `--text` / `--muted` / `--border` / `--bg-alt` were "deprecation
// shims retained for one release" — but pt86 (line 243 of theme.css)
// pruned all four after migrating consumers to canonical
// `--fg` / `--fg-2` / `--line` / `--bg-1`. Same documentation-vs-
// implementation drift class as pt167 (CLAUDE.md `slate` after slate
// removal), pt175 (AGENTS.md ast-grep rules table missing 2 rows).
//
// This gate parses every `var(--x)` and backticked `--x` token in
// DESIGN.md prose (code-fenced blocks excluded — they're illustrative
// and may reference tokens from older states or future proposals)
// and asserts each cited token appears as a `--x:` definition
// somewhere on disk. Discovery deliberately ignores the front-matter
// palette table (which is a *spec* of intended values, validated by
// the separate `check:oklch-hex-parity` gate) and the brand-asset
// table at §"Brand assets" (which references conceptual palette
// slots like `--paper` for theme variants that aren't yet runtime
// tokens — those are gated by the brand-spec roadmap, not the live
// cascade). The body stops at the H2 boundary "## 9. Brand assets".

import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DESIGN_MD = join(ROOT, "DESIGN.md");

function collectTokenDefs(dir: string, into: Set<string>) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      collectTokenDefs(p, into);
      continue;
    }
    if (!/\.(css|scss)$/.test(entry)) continue;
    const body = readFileSync(p, "utf8");
    for (const m of body.matchAll(/^\s*(--[a-z][a-z0-9-]*)\s*:/gm)) {
      into.add(m[1]!);
    }
  }
}

describe("DESIGN.md prose token citations vs disk (pt176)", () => {
  test("every `var(--x)` / backticked `--x` in DESIGN.md prose has a live definition", () => {
    expect(existsSync(DESIGN_MD), "DESIGN.md must exist").toBe(true);

    const defined = new Set<string>();
    collectTokenDefs(join(ROOT, "public", "assets"), defined);
    collectTokenDefs(join(ROOT, "src", "styles"), defined);

    expect(
      defined.size,
      "expected at least one token definition under public/assets/ or src/styles/",
    ).toBeGreaterThan(0);

    const full = readFileSync(DESIGN_MD, "utf8");

    // Strip code fences — illustrative snippets shouldn't gate prose.
    const noFences = full.replace(/```[\s\S]*?```/g, "");

    const cited = new Set<string>();
    for (const m of noFences.matchAll(/var\((--[a-z][a-z0-9-]*)\)/g)) {
      cited.add(m[1]!);
    }
    for (const m of noFences.matchAll(/`(--[a-z][a-z0-9-]*)`/g)) {
      cited.add(m[1]!);
    }

    // Allow-lists. Each entry MUST document WHY the token appears
    // in DESIGN.md prose despite being absent from the cascade.
    //
    // HISTORICAL: cited in past-tense narrative describing a retired
    // state ("Pre-fix...", "Pre-pt..."). Removing the citation would
    // erase load-bearing archaeology.
    //
    // ASPIRATIONAL: cited as a palette slot for a brand variant the
    // cascade doesn't ship yet (e.g. a future light-theme paper
    // pack). The brand spec is forward-looking; the runtime cascade
    // catches up when the variant is implemented.
    const HISTORICAL = new Set<string>([
      // Pre-pt170 .writing-strip + .onramp scoped padding-block
      // override breadcrumb. --space-12 was pruned in pt170; the
      // narrative in §4 documents the largest single vertical-
      // rhythm regression caught in the canonical-fidelity sweep.
      "--space-12",
    ]);
    const ASPIRATIONAL = new Set<string>([
      // §6 brand-asset matrix — "Avatar · paper" / "Open Graph ·
      // paper" theme-pack variants for light-theme social previews.
      // The runtime cascade is dark-only today; the paper variant
      // is documented by brand spec for future content-team work.
      "--paper",
      "--paper-ink",
    ]);

    const undefinedRefs = [...cited]
      .filter(
        (t) => !defined.has(t) && !HISTORICAL.has(t) && !ASPIRATIONAL.has(t),
      )
      .sort();

    if (undefinedRefs.length > 0) {
      throw new Error(
        `DESIGN.md cites ${undefinedRefs.length} token(s) that have no definition under public/assets/ or src/styles/:\n` +
          undefinedRefs.map((t) => `  - ${t}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update DESIGN.md to cite the canonical token (per §2 alias map)\n` +
          `  - Add the missing token to public/assets/theme.css or src/styles/\n` +
          `  - If the citation is historical (pre-fix narrative), append it to the HISTORICAL allow-list in this test with a one-line rationale\n`,
      );
    }

    expect(undefinedRefs.length).toBe(0);
  });
});
