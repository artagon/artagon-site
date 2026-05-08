// USMR Phase 5.5.16-pt68 — guard against stray / unbalanced braces
// inside Astro `<style>` blocks.
//
// Why: iter 71 of the canonical-fidelity loop discovered
// `src/pages/index.astro:566-573` had an orphan `gap: 1rem;` declaration
// outside its rule + a stray `}` after it. Astro's CSS parser silently
// dropped the orphan declaration, so the build passed and the page
// rendered, but the dead code carried forward across many edits and
// would have broken any future tool that strict-parsed the file.
//
// This test scans all `.astro` files for `<style>` blocks and asserts
// brace balance. It does not parse CSS — it just counts braces. Any
// imbalance is a definite bug; a balanced count is not a guarantee
// of validity but covers the most common drift mode.
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".build" || entry === ".git") {
        continue;
      }
      walk(full, out);
    } else if (entry.endsWith(".astro")) {
      out.push(full);
    }
  }
  return out;
}

function extractStyleBlocks(
  source: string,
): { content: string; line: number }[] {
  const blocks: { content: string; line: number }[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const before = source.slice(0, m.index);
    const line = before.split("\n").length;
    blocks.push({ content: m[1] ?? "", line });
  }
  return blocks;
}

function countBraces(css: string): { open: number; close: number } {
  // Strip /* … */ comments so braces inside comments don't count.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let open = 0;
  let close = 0;
  for (const ch of stripped) {
    if (ch === "{") open++;
    else if (ch === "}") close++;
  }
  return { open, close };
}

describe("Astro <style> block brace balance", () => {
  const astroFiles = walk(join(ROOT, "src"));
  // Sanity: we must have found at least 20 .astro files; if the walker is
  // empty the test is vacuous. Fail loudly instead of silently passing.
  test("walker discovered Astro files", () => {
    expect(astroFiles.length).toBeGreaterThan(20);
  });

  for (const file of astroFiles) {
    const rel = relative(ROOT, file);
    test(`${rel}: <style> block braces balanced`, () => {
      const source = readFileSync(file, "utf8");
      const blocks = extractStyleBlocks(source);
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]!;
        const { open, close } = countBraces(block.content);
        expect(
          open,
          `${rel} <style> block #${i + 1} (file line ~${block.line}): ${open} '{' vs ${close} '}'`,
        ).toBe(close);
      }
    });
  }
});
