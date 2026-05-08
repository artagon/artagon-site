// USMR Phase 5.5.16-pt177 — DESIGN.md prose vs CSS class-source-of-truth.
//
// Sibling of the pt176 token-citation gate. DESIGN.md cites CSS
// classes via backticked selectors (e.g. `.glow-tag`, `.num-h2`).
// When the prose presents a class as a *live* primitive (e.g.
// "renders identically across …", "consume `.foo`"), the class
// MUST be authored somewhere a consumer can use it. Otherwise the
// doc promises infrastructure that doesn't exist.
//
// Pre-pt177 §1.1.5 "Portable aesthetic" claimed
// `.glow-tag` / `.num-h2` "render identically across Astro
// components, static HTML prototypes, and third-party embeds" —
// but `.num-h2` is documented two screens later (§6.7) as
// "Planned. ... has not been authored in `public/assets/theme.css`
// yet." Same drift class as pt176 (DESIGN.md §2 retired aliases),
// pt175 (AGENTS.md ast-grep table), pt167 (CLAUDE.md slate ref).
//
// pt177 rewrote §1.1.5 to qualify `.num-h2` as planned-not-shipped
// and locks the contract here: every backticked `.foo` in DESIGN.md
// prose MUST have a definition under `src/` or `public/`, OR
// appear in a small allow-list with documented rationale
// (HISTORICAL: removed-class breadcrumbs; ASPIRATIONAL: planned
// classes documented in §6.x with explicit "Planned" status).

import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DESIGN_MD = join(ROOT, "DESIGN.md");

function collectClassDefs(dir: string, into: Set<string>) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      // Skip vendored / build / extracted-canonical surfaces; the
      // gate cares about what the live cascade ships, not what the
      // new-design extraction archive shows.
      if (
        entry === "node_modules" ||
        entry === ".astro" ||
        entry === ".build" ||
        entry === "new-design"
      ) {
        continue;
      }
      collectClassDefs(p, into);
      continue;
    }
    if (!/\.(css|scss|astro|tsx|jsx|html)$/.test(entry)) continue;
    const body = readFileSync(p, "utf8");
    // CSS-style selector definitions: `.foo {`, `.foo,`, `.foo:hover`,
    // `.foo .bar`, `.foo > .bar`, etc.
    for (const m of body.matchAll(
      /\.([a-z][a-zA-Z0-9_-]+)(?=[\s,{>:.+~\[\)])/g,
    )) {
      into.add("." + m[1]!);
    }
    // class= / className= attribute values (handles components that
    // never ship CSS but consume an external class).
    for (const m of body.matchAll(
      /class(?:Name)?\s*=\s*[`"']([^`"']+)[`"']/g,
    )) {
      for (const c of m[1]!.split(/\s+/)) {
        if (c) into.add("." + c);
      }
    }
  }
}

describe("DESIGN.md class citations vs disk (pt177)", () => {
  test("every backticked `.x` selector in DESIGN.md prose has a live definition", () => {
    expect(existsSync(DESIGN_MD), "DESIGN.md must exist").toBe(true);

    const defined = new Set<string>();
    collectClassDefs(join(ROOT, "src"), defined);
    collectClassDefs(join(ROOT, "public"), defined);

    expect(
      defined.size,
      "expected at least one CSS class definition under src/ or public/",
    ).toBeGreaterThan(0);

    const full = readFileSync(DESIGN_MD, "utf8");
    // Strip code fences — illustrative snippets aren't a contract.
    const noFences = full.replace(/```[\s\S]*?```/g, "");

    const cited = new Set<string>();
    for (const m of noFences.matchAll(/`(\.[a-z][a-zA-Z0-9_-]+)`/g)) {
      cited.add(m[1]!);
    }

    // HISTORICAL: cited as breadcrumbs of removed classes (past
    // tense). Removing the citation would erase load-bearing
    // archaeology about WHY a current class exists.
    const HISTORICAL = new Set<string>([
      // §6.1 Header — "Replaces the 5.1-era `.menu` / `.menu-btn`
      // block deleted in 5.5.11." Pre-USMR-Phase-5.5.11 these were
      // the mobile-nav primitives; the canonical mobile menu now
      // uses `.nav-toggle` + `body.nav-open` per pt177 §6.1 prose.
      ".menu",
      ".menu-btn",
    ]);
    // ASPIRATIONAL: planned classes that the prose explicitly tags
    // as forthcoming ("Planned" in their own §6.x subsection). The
    // prose MUST mark these as planned anywhere they appear; that
    // contract is what makes the citation honest.
    const ASPIRATIONAL = new Set<string>([
      // §6.7 "Numbered section heading" — class is documented as
      // "Planned. ... has not been authored in
      // `public/assets/theme.css` yet." Implementation is a
      // follow-up to USMR. Cited in §1.1.5 (qualified as planned),
      // §6.7, §6.12, §"Page templates". Promote to a definition
      // when shipped; remove from this list at the same time.
      ".num-h2",
    ]);

    const undefinedRefs = [...cited]
      .filter(
        (c) => !defined.has(c) && !HISTORICAL.has(c) && !ASPIRATIONAL.has(c),
      )
      .sort();

    if (undefinedRefs.length > 0) {
      throw new Error(
        `DESIGN.md cites ${undefinedRefs.length} CSS class(es) with no definition under src/ or public/:\n` +
          undefinedRefs.map((c) => `  - ${c}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Author the class so the prose isn't a promise without backing\n` +
          `  - Update DESIGN.md to cite a real class, or qualify the citation as "(Planned)" + add to ASPIRATIONAL allow-list with rationale\n` +
          `  - If it's a removed-class breadcrumb in past-tense prose, add to HISTORICAL allow-list with rationale\n`,
      );
    }

    expect(undefinedRefs.length).toBe(0);
  });
});
