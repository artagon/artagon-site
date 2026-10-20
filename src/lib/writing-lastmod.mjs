import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@astrojs/markdown-remark";

const defaultRoot = fileURLToPath(
  new URL("../content/writing/", import.meta.url),
);

/**
 * USMR 14.12: shared config/gate reader. Use Astro's installed frontmatter
 * parser, including YAML comments, quoted dates, and CRLF; accept both
 * writing extensions and nested content IDs. Only missing files are benign.
 * @param {string} slug
 * @param {string} [contentRoot]
 * @returns {string | null}
 */
export function readWritingLastmod(slug, contentRoot = defaultRoot) {
  const root = resolve(contentRoot);
  const base = resolve(root, slug);
  if (!base.startsWith(root + sep))
    throw new Error("Writing ID escapes content root");
  for (const extension of [".md", ".mdx"]) {
    let source;
    try {
      source = readFileSync(base + extension, "utf8");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        continue;
      throw error;
    }
    const { frontmatter } = parseFrontmatter(source);
    const raw = frontmatter.updated ?? frontmatter.published;
    if (raw == null) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()))
      throw new Error(`Invalid writing lastmod for ${slug}`);
    return date.toISOString();
  }
  return null;
}
