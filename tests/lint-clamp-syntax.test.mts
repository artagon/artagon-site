// USMR Phase 5.5.16-pt115 — guard against invalid `clamp(MIN, VAL,
// MAX)` syntax where the middle expression contains arithmetic
// (e.g. `0.65rem + 1vw`) WITHOUT a `calc()` wrap.
//
// CSS spec requires each clamp() argument to be a length. Bare
// `0.65rem + 1vw` is two tokens separated by `+`, not a length —
// the whole clamp() becomes unparseable and browsers fall back to
// the cascaded value silently. Pt114 caught a hero-sized FAQ h1
// because of this; pt115 caught the same pattern in `.faq-lead`.
//
// This test scans .css / .astro / .mdx / .tsx files for clamp(...)
// calls where any of the three args contains a `+` or `-` between
// length tokens but is NOT inside a calc() wrapper.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  findInvalidClamps,
  type ClampFinding,
} from "./helpers/clamp-syntax.js";
import { walkFiles } from "./helpers/lint-discovery.js";

const ROOT = new URL("..", import.meta.url).pathname;
const supportedSource = (file: string): boolean =>
  /\.(css|astro|mdx|tsx|jsx)$/.test(file);
const excludedDirectory = (_directory: string, name: string): boolean =>
  ["node_modules", ".build", ".git", "new-design"].includes(name);

describe("Invalid clamp() syntax detection", () => {
  const files = [
    ...walkFiles(join(ROOT, "src"), supportedSource, excludedDirectory),
    ...walkFiles(join(ROOT, "public"), supportedSource, excludedDirectory),
  ];

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no clamp() with bare arithmetic args (must wrap in calc())", () => {
    const allFindings: ClampFinding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      const rel = relative(ROOT, file);
      allFindings.push(...findInvalidClamps(body, rel));
    }
    if (allFindings.length > 0) {
      const lines = allFindings
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.match.substring(0, 80)} (wrap arithmetic in calc())`,
        )
        .join("\n");
      throw new Error(
        `Found ${allFindings.length} invalid clamp() expression${
          allFindings.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(allFindings.length).toBe(0);
  });
});
