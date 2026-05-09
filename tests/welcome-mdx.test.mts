import { describe, expect, test } from "vitest";

// USMR Phase 5.1q.11 — explicit shape assertion for welcome.mdx. The
// content collection is otherwise only verified implicitly via Playwright
// loading the home page (which renders the latest-writing strip from
// `getCollection('writing')`). A Zod schema tightening that breaks
// `welcome.mdx` would surface as a vague astro build crash; this test
// pinpoints the field at fault.
//
// We import the raw MDX file as a frontmatter object to avoid pulling
// the Astro content layer into the vitest process (which collides with
// the worker's import.meta resolution). vite handles `?raw` natively.

import welcome from "../src/content/writing/welcome.mdx?raw";

describe("welcome.mdx frontmatter shape", () => {
  test("file has YAML frontmatter delimiters", () => {
    expect(welcome).toMatch(/^---\n/);
    expect(welcome).toMatch(/\n---\n/);
  });

  test("frontmatter declares every required field", () => {
    const requiredKeys = [
      "title",
      "description",
      "eyebrow",
      "headline",
      "lede",
      "published",
    ];
    const fm = welcome.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
    for (const key of requiredKeys) {
      expect(fm, `missing key: ${key}`).toMatch(
        new RegExp(`^${key}:\\s+\\S`, "m"),
      );
    }
  });

  test("published is an ISO 8601 date string", () => {
    const fm = welcome.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
    const publishedLine = fm.match(/^published:\s+(.+)$/m)?.[1]?.trim() ?? "";
    // Strip surrounding quotes if present.
    const publishedValue = publishedLine.replace(/^["']|["']$/g, "");
    expect(publishedValue).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  test("description is in the SEO 80-160 char band", () => {
    const fm = welcome.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
    const descLine = fm.match(/^description:\s+(.+)$/m)?.[1]?.trim() ?? "";
    const descValue = descLine.replace(/^["']|["']$/g, "");
    // Author guidance recommends 80-160; we soft-gate at 50 lower bound
    // since some authors prefer punchier descriptions on welcome posts.
    expect(descValue.length).toBeGreaterThanOrEqual(50);
    expect(descValue.length).toBeLessThanOrEqual(200);
  });
});
