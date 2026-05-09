import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * USMR Phase 5.5.16-pt231 — content-collection MDX bodies must not carry
 * forward-looking "ships in Phase X.Y" / "until Phase X.Y" prose.
 *
 * The discovered drift class (pt231 sweep): `home.mdx`, `standards.mdx`,
 * and `use-cases.mdx` each had a single body line that promised feature
 * delivery in Phase 5.1 / 5.4 / 5.3 respectively — phases that have all
 * shipped. The bodies are also unused: their consumers (`src/pages/index
 * .astro`, `src/pages/standards/index.astro`, `src/pages/use-cases/index
 * .astro`) read frontmatter only via `getEntry()` and never render
 * `<Content />`.
 *
 * The drift accumulated because the bodies were originally written in
 * Phase 4.x as transitional placeholders ("body skeleton lives here
 * until Phase 5.X ships the route templates that consume the frontmatter
 * above") and were never re-narrated when those phases landed.
 *
 * This gate forbids both shapes — `(ships|will ship|will land) in Phase
 * X.Y` and `until Phase X.Y` — across every `src/content/pages/*.mdx`
 * body. Bodies that are intentionally empty (rendering only an MDX
 * comment block as the pt231 fix established) pass cleanly because the
 * comment shape `{/* … *⁠/}` does not contain any of the forbidden
 * phrases.
 *
 * Why a doc-citation gate instead of just removing the bodies entirely:
 * Astro content collections accept empty bodies but the MDX comment
 * stays useful as a self-documenting "body intentionally empty" marker
 * for the next contributor who looks at the file and wonders why it
 * has only frontmatter. The gate protects the prose AGAINST regressing
 * back to the stale "ships in Phase X" pattern under future content
 * edits.
 *
 * `vision.mdx` is the only `src/content/pages/*.mdx` whose body IS
 * rendered (`src/pages/vision/index.astro:21` calls `<Content />`).
 * Its body is long-form prose that the pt231 sweep verified contains
 * no forward-looking phase markers — it ships canonical content, not
 * transitional notes.
 */

const PAGES_DIR = "src/content/pages";

const FORBIDDEN_PATTERNS = [
  // "ships in Phase X.Y" / "ship in Phase X" / "will ship in Phase X"
  /\b(ships?|will\s+(?:ship|land))\s+(?:in\s+)?Phase\s+\d+(?:\.\d+)?\b/i,
  // "until Phase X.Y" / "until Phase X ships"
  /\buntil\s+Phase\s+\d+(?:\.\d+)?\b/i,
];

function getBody(filePath: string): string {
  const raw = readFileSync(filePath, "utf8");
  const fmEnd = raw.indexOf("---", 4);
  if (fmEnd === -1) return raw;
  return raw.slice(fmEnd + 3).trim();
}

function stripMdxComments(body: string): string {
  // The pt231 fix iterated through three comment shapes before settling
  // on the only one that survives both Prettier and MDX 3.x:
  //   1. `{/* ... */}` — mangled by Prettier's markdown plugin into
  //      `{/_ ... _/}` (invalid MDX expression).
  //   2. `<!-- ... -->` — rejected by `@mdx-js/rollup` with "Unexpected
  //      character `!`. To create a comment in MDX, use `{/* text */}`."
  //   3. Italicized markdown prose `_Body intentionally empty._` — both
  //      Prettier-stable and MDX-stable, but renders as live prose if a
  //      consumer ever calls `<Content />`. For all five pt231 files the
  //      consumer reads only frontmatter, so the rendered prose is dead.
  //
  // The gate strips shapes 1 + 2 (defense-in-depth: future MDX versions
  // may relax the HTML-comment restriction, and Prettier overrides could
  // restore `{/* */}`). For shape 3, no stripping is needed — the regex
  // tests only the FORBIDDEN_PATTERNS, which won't match prose like
  // "Body intentionally empty" or "placeholder…has shipped".
  return body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

test("content-collection MDX bodies have no stale 'ships in Phase X.Y' prose", () => {
  const mdxFiles = readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => join(PAGES_DIR, f));

  expect(
    mdxFiles.length,
    "src/content/pages/*.mdx must enumerate ≥1 file",
  ).toBeGreaterThan(0);

  const drifts: string[] = [];
  for (const file of mdxFiles) {
    const body = stripMdxComments(getBody(file));
    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = body.match(pattern);
      if (match) {
        drifts.push(
          `${file}: body contains stale forward-looking phase marker "${match[0]}".\n` +
            `  Fix: replace with an MDX comment block describing why the body is empty,\n` +
            `  or update the prose to describe the current shipped state. The pt231\n` +
            `  fix replaced "ships in Phase 5.X" lines with self-explanatory comments.`,
        );
      }
    }
  }

  if (drifts.length > 0) {
    throw new Error(
      `lint-content-pages-frozen-phase-claims: ${drifts.length} drift(s) found:\n\n` +
        drifts.join("\n\n"),
    );
  }
});
