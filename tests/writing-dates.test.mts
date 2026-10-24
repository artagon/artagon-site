import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatPostDate, postDateParts } from "../src/lib/writing-format";
import { readWritingLastmod } from "../src/lib/writing-lastmod.mjs";

describe("writing dates", () => {
  it("formats the UTC day independently of the build timezone", () => {
    const old = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      const date = new Date("2026-04-21T00:00:00Z");
      expect(formatPostDate(date)).toBe("21 Apr 2026");
      expect(formatPostDate(date, "card")).toBe("Apr 21, 2026");
      expect(postDateParts(date)).toEqual({
        year: "2026",
        monthDay: "04 · 21",
        iso: "2026-04-21T00:00:00.000Z",
      });
    } finally {
      if (old === undefined) delete process.env.TZ;
      else process.env.TZ = old;
    }
  });
});

describe("shared writing lastmod reader", () => {
  const roots: string[] = [];
  afterEach(() =>
    roots
      .splice(0)
      .forEach((root) => rmSync(root, { recursive: true, force: true })),
  );
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), "site-writing-dates-"));
    roots.push(root);
    mkdirSync(join(root, "nested"));
    return root;
  }
  it.each(["md", "mdx"])(
    "reads nested .%s YAML and prefers updated",
    (extension) => {
      const root = fixture();
      writeFileSync(
        join(root, `nested/post.${extension}`),
        '---\r\npublished: 2026-04-21\r\nupdated: "2026-05-08" # editorial update\r\n---\r\nBody',
      );
      expect(readWritingLastmod("nested/post", root)).toBe(
        "2026-05-08T00:00:00.000Z",
      );
    },
  );
  it("uses published, returns null for missing dates/files, and rejects malformed dates", () => {
    const root = fixture();
    writeFileSync(join(root, "post.md"), "---\npublished: 2026-04-21\n---\n");
    expect(readWritingLastmod("post", root)).toBe("2026-04-21T00:00:00.000Z");
    expect(readWritingLastmod("absent", root)).toBeNull();
    writeFileSync(join(root, "post.md"), "Body only");
    expect(readWritingLastmod("post", root)).toBeNull();
    writeFileSync(join(root, "post.md"), "---\npublished: not-a-date\n---\n");
    expect(() => readWritingLastmod("post", root)).toThrow(
      /Invalid writing lastmod/,
    );
    expect(() => readWritingLastmod("../outside", root)).toThrow(/escapes/);
  });
});
