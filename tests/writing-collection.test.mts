import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// USMR Phase 5.5.6 — writing collection frontmatter invariants. The
// Zod schema in `src/content.config.ts:128-152` (the `writing`
// defineCollection block; extends pageBase with `published` /
// `updated` / `cover` / `author` / `draft`) gates structure at
// build time, but a typo in `published`, a missing `tags` array, or
// a `draft: true` accidentally shipped will pass build and silently
// remove the post from the index. These tests run at vitest time so
// the regression surfaces before the build.

const HERE = dirname(fileURLToPath(import.meta.url));
const WRITING_DIR = join(HERE, "..", "src", "content", "writing");

interface PostFrontmatter {
  title?: string;
  description?: string;
  eyebrow?: string;
  headline?: string;
  lede?: string;
  published?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
}

function parseFrontmatter(raw: string): PostFrontmatter {
  // YAML frontmatter parser scoped to the shapes this schema uses.
  // Astro itself uses gray-matter; here we hand-parse so the test has
  // no node_modules dependency on YAML internals.
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error("no frontmatter");
  const body = m[1]!;
  const out: Record<string, unknown> = {};
  let inTags = false;
  const tags: string[] = [];
  for (const line of body.split("\n")) {
    if (inTags) {
      const tagMatch = line.match(/^\s+-\s+(.+)$/);
      if (tagMatch) {
        tags.push(tagMatch[1]!.replace(/^['"]|['"]$/g, ""));
        continue;
      } else if (/^\s+/.test(line)) {
        continue;
      } else {
        inTags = false;
      }
    }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    const value = valRaw!.trim();
    if (key === "tags") {
      inTags = true;
      continue;
    }
    if (value === "") continue;
    if (value === "true" || value === "false") {
      out[key!] = value === "true";
    } else {
      out[key!] = value.replace(/^['"]|['"]$/g, "");
    }
  }
  if (tags.length) out.tags = tags;
  return out as PostFrontmatter;
}

function loadPosts() {
  const files = readdirSync(WRITING_DIR).filter((f) => f.endsWith(".mdx"));
  return files.map((f) => {
    const raw = readFileSync(join(WRITING_DIR, f), "utf8");
    return { file: f, frontmatter: parseFrontmatter(raw) };
  });
}

const POSTS = loadPosts();
const TODAY_MS = Date.now();

describe("writing collection — registry shape", () => {
  test("at least 3 non-draft posts exist (welcome + trust-chain + bridge-strategy)", () => {
    const live = POSTS.filter((p) => p.frontmatter.draft !== true);
    expect(live.length).toBeGreaterThanOrEqual(3);
  });

  test("includes the canonical 5.5.5 pair: compounding-trust-chain.mdx + bridge-strategy.mdx", () => {
    const files = POSTS.map((p) => p.file);
    expect(files).toContain("compounding-trust-chain.mdx");
    expect(files).toContain("bridge-strategy.mdx");
  });
});

describe("writing collection — per-post frontmatter", () => {
  for (const post of POSTS) {
    describe(post.file, () => {
      const fm = post.frontmatter;

      test("required fields present (title/description/eyebrow/headline/lede/published)", () => {
        expect(fm.title, "title").toBeTruthy();
        expect(fm.description, "description").toBeTruthy();
        expect(fm.eyebrow, "eyebrow").toBeTruthy();
        expect(fm.headline, "headline").toBeTruthy();
        expect(fm.lede, "lede").toBeTruthy();
        expect(fm.published, "published").toBeTruthy();
      });

      test("published parses to a Date <= today", () => {
        const ts = Date.parse(fm.published ?? "");
        expect(Number.isNaN(ts), `published="${fm.published}" must parse`).toBe(
          false,
        );
        expect(ts).toBeLessThanOrEqual(TODAY_MS);
      });

      test("tags is a non-empty array of strings", () => {
        expect(Array.isArray(fm.tags), "tags array").toBe(true);
        expect(fm.tags!.length, "tags non-empty").toBeGreaterThan(0);
        for (const tag of fm.tags!) {
          expect(typeof tag).toBe("string");
          expect(tag.trim()).not.toBe("");
        }
      });

      test("author resolves to a known authors-collection slug (or is absent)", () => {
        if (fm.author === undefined) return;
        // Currently only one author shipped; loosen if that changes.
        expect(fm.author).toBe("trumpyla");
      });

      test("draft is not set to true", () => {
        // Draft posts are filtered from the writing index but should
        // never accidentally land in main. Tests gate the canonical
        // 3-post launch set.
        expect(fm.draft).not.toBe(true);
      });
    });
  }
});
