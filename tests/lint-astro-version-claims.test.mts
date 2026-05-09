// USMR Phase 5.5.16-pt212 — Astro version claim consistency gate.
//
// `package.json` declares the actual Astro version (currently
// `"astro": "6.2.1"`). When docs cite a specific Astro major
// number ("Astro 5", "Astro 6", "Astro v6"), it MUST match the
// installed major. Otherwise contributors and AI agents trust
// outdated guidance about API shape, content-collection paths,
// frontmatter helpers, etc.
//
// Pre-pt212 three docs claimed "Astro 5" while package.json had
// `astro@6.2.1`:
//   - AGENTS.md:27 — context7 guidance
//   - docs/guides/new-design-conversion.md:159 — build steps
//   - docs/decisions/0001-no-tailwind.md:10 — ADR context
//
// All three pre-date the in-flight upgrade to Astro 6. Same
// drift class as pt167 (CLAUDE.md slate after slate removal),
// pt188 (glossary slate), pt204 (legacy astro.config.mjs ref).
// Different surface (major-version claim vs file-path / token
// names) but same shape: doc claims a state that disk has moved
// past.
//
// pt212 corrected all 3 claims to "Astro 6" with explicit
// `package.json` citation. Locks the contract here:
//   - Every present-tense "Astro N" / "Astro vN" claim in the
//     listed surfaces MUST match the major version declared in
//     package.json's `dependencies.astro` / `devDependencies.
//     astro` field.
//   - Past-tense narrative ("Astro 5 changes frequently",
//     "originally drafted under Astro 5") is allowed because
//     it doesn't make a present-tense state claim. The gate's
//     filter looks only at `Astro N static site` and similar
//     copular patterns.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PKG = join(ROOT, "package.json");

// Surfaces audited. Each MUST be a "live" doc that makes
// present-tense claims about the project's stack — past-tense
// archaeology and frozen audit logs are out of scope.
const SURFACES = [
  "AGENTS.md",
  "docs/guides/new-design-conversion.md",
  "docs/decisions/0001-no-tailwind.md",
  // pt213 — openspec/config.yaml also makes a present-tense
  // version claim ("Project: ... Astro N static marketing ...")
  // in its context block; it had drift from Astro 5 / Node 20+
  // / Playwright 1.57 / mdx 4.3.13 to the actual installed
  // versions until pt213.
  "openspec/config.yaml",
  // pt214 — openspec/project.md and openspec/contributing.md
  // both make present-tense Node-version claims that must
  // match `.nvmrc` + `package.json` engines.node.
  "openspec/project.md",
  "openspec/contributing.md",
  // pt219 — README.md tech-stack section makes present-tense
  // Astro version + Node version claims (`Astro v6.2.1`,
  // `Node.js 22+`) that must match package.json + .nvmrc.
  "README.md",
];

function readAstroMajor(): string {
  const pkg = JSON.parse(readFileSync(PKG, "utf8"));
  const dep = pkg?.dependencies?.astro ?? pkg?.devDependencies?.astro;
  if (!dep) throw new Error("package.json missing astro dependency");
  // Strip any leading `^`, `~`, `>=`, etc.
  const m = String(dep).match(/^[~^>=<]*\s*(\d+)\./);
  if (!m) throw new Error(`unrecognized astro version: ${JSON.stringify(dep)}`);
  return m[1]!;
}

function readNodeMajor(): string {
  // `.nvmrc` is the canonical source for node major; engines.node
  // is the install-time floor. Both should agree on major.
  const nvmrc = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
  const m = nvmrc.match(/^v?(\d+)(?:\.\d+)*$/);
  if (!m) throw new Error(`.nvmrc unrecognized: ${JSON.stringify(nvmrc)}`);
  return m[1]!;
}

describe("Astro + Node version claim consistency vs package.json (pt212/213/214)", () => {
  test("every present-tense `Astro N` claim matches package.json's installed major", () => {
    expect(existsSync(PKG), "package.json must exist").toBe(true);
    const expectedMajor = readAstroMajor();

    const drifts: { file: string; matched: string; cited: string }[] = [];

    for (const rel of SURFACES) {
      const p = join(ROOT, rel);
      if (!existsSync(p)) continue;
      const body = readFileSync(p, "utf8");

      // Match present-tense "Astro N static site", "is an Astro
      // N", "Astro vN, build via", "is on Astro N", and the
      // openspec/config.yaml-style "- Astro N (output: ...)"
      // bullet. Excludes past-tense / parenthetical contexts
      // ("under Astro 5", "Astro 5 changes frequently", "Astro
      // 5 → 6 surface changes" — those describe the migration
      // / context).
      const presentTensePatterns = [
        /\bis an Astro (\d+)\b/g,
        /\bAstro v?(\d+)\s+static (?:site|marketing)\b/gi,
        /\bAstro v?(\d+),\s*build via/gi,
        /\bproject is on Astro (\d+)\b/g,
        // openspec/config.yaml: `- Astro 6 (output: "static", ...)`
        /^\s*-\s*Astro (\d+)\s*\(output:/gm,
        // README.md: `**[Astro](url)** v6.2.1 - Static site...`
        /\[Astro\]\([^)]+\)\*\*\s+v?(\d+)\.\d+/g,
      ];

      for (const re of presentTensePatterns) {
        for (const m of body.matchAll(re)) {
          const cited = m[1]!;
          if (cited !== expectedMajor) {
            drifts.push({ file: rel, matched: m[0], cited });
          }
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} present-tense Astro version claim(s) drift from package.json (Astro ${expectedMajor}):\n` +
          drifts
            .map((d) => `  - ${d.file}: "${d.matched}" cites Astro ${d.cited}`)
            .join("\n") +
          `\n\nFix: update the prose to cite Astro ${expectedMajor} (per \`package.json\` \`"astro"\` field) — or, if the project intentionally bumps majors, update package.json + .nvmrc + this gate's expectation in the same diff.`,
      );
    }
    expect(drifts.length).toBe(0);
  });

  test("every present-tense `Node N+` claim matches `.nvmrc` major", () => {
    const expectedNode = readNodeMajor();

    const drifts: { file: string; matched: string; cited: string }[] = [];

    for (const rel of SURFACES) {
      const p = join(ROOT, rel);
      if (!existsSync(p)) continue;
      const body = readFileSync(p, "utf8");

      // Match present-tense "Node N+", "Node vN+". Excludes
      // CI-narrative "(CI uses Node 20 and 22)" by requiring
      // the `+` suffix or a context anchor like "and npm".
      // No trailing `\b` — `+` is non-word, so `\b\+\b` fails
      // because `\b` after `+` requires the next char to be a
      // word char (and `+` is typically followed by whitespace).
      // The `+` itself is the natural right delimiter.
      // Also matches `Node.js N+` (README.md form) — the `.js`
      // suffix is in a non-capturing group. The `[*\s]+` between
      // `Node[.js]` and the digit tolerates Markdown bold close
      // (e.g. `**Node.js** 22+` in README's bullet lists).
      const presentTensePatterns = [
        /\bNode(?:\.js)?[*\s]+(\d+)\+/g,
        /\bNode(?:\.js)?[*\s]+v(\d+)\+/g,
      ];

      for (const re of presentTensePatterns) {
        for (const m of body.matchAll(re)) {
          const cited = m[1]!;
          if (cited !== expectedNode) {
            drifts.push({ file: rel, matched: m[0], cited });
          }
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} present-tense Node version claim(s) drift from .nvmrc (Node ${expectedNode}):\n` +
          drifts
            .map((d) => `  - ${d.file}: "${d.matched}" cites Node ${d.cited}+`)
            .join("\n") +
          `\n\nFix: update the prose to cite Node ${expectedNode}+ — or, if the project intentionally bumps majors, update .nvmrc + package.json engines.node + CI workflows + this gate's expectation in the same diff.`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
