import { test, expect } from "@playwright/test";
import { execFileSync, type SpawnSyncReturns } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// `execFileSync` throws an Error augmented with the SpawnSyncReturns shape
// (status/stdout/stderr/signal/pid/output). With `stdio: 'pipe'` the streams
// are Buffers. Node does not export this combined type, so we intersect.
type SpawnFailure = Error & SpawnSyncReturns<Buffer>;

function assertSpawnFailure(error: unknown): asserts error is SpawnFailure {
  if (
    !(error instanceof Error) ||
    !("status" in error) ||
    !("stderr" in error)
  ) {
    throw error;
  }
}

test.describe("Content Collections - Schema Validation", () => {
  const contentPath = "src/content/pages/vision.mdx";
  const runAstroBuild = () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "astro-build-"));
    try {
      return execFileSync("npx", ["astro", "build", "--outDir", outDir], {
        stdio: "pipe",
      });
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  };
  const withVisionContent = (content: string, run: () => void) => {
    const originalContent = fs.readFileSync(contentPath, "utf-8");
    fs.writeFileSync(contentPath, content);
    try {
      run();
    } finally {
      fs.writeFileSync(contentPath, originalContent);
    }
  };

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Runs in Chromium only to avoid cross-project content mutations.",
    );
  });

  test("should validate required frontmatter fields", () => {
    // Create invalid content (missing title)
    const invalidContent = `---
description: "Test description"
hero:
  title: "Test"
  subtitle: "Test"
  missionText: "Test"
---

Test content
`;

    withVisionContent(invalidContent, () => {
      // Try to build - should fail
      try {
        runAstroBuild();
        expect(false).toBe(true); // Should not reach here
      } catch (error: unknown) {
        assertSpawnFailure(error);
        expect(error.status).not.toBe(0);
        expect(error.stderr.toString("utf8")).toContain("title");
      }
    });
  });

  test("should validate hero object schema", () => {
    // Create content with invalid hero structure
    const invalidContent = `---
title: "Test Title"
description: "Test description"
hero:
  title: "Test"
  # Missing subtitle and missionText
---

Test content
`;

    withVisionContent(invalidContent, () => {
      // Try to build - should fail
      try {
        runAstroBuild();
        expect(false).toBe(true); // Should not reach here
      } catch (error: unknown) {
        assertSpawnFailure(error);
        expect(error.status).not.toBe(0);
      }
    });
  });

  test("should accept valid frontmatter", () => {
    // Create valid content
    const validContent = `---
title: "Valid Title"
description: "Valid description"
hero:
  title: "Valid Hero Title"
  subtitle: "Valid Subtitle"
  missionText: "Valid Mission"
---

# Valid Content

This is valid markdown content.
`;

    withVisionContent(validContent, () => {
      // Build should succeed
      const result = runAstroBuild();
      expect(result).toBeTruthy();
    });
  });

  test("should allow optional hero field", () => {
    // Create valid content without hero
    const validContent = `---
title: "Valid Title"
description: "Valid description"
---

# Valid Content Without Hero

This is valid markdown content without a hero section.
`;

    withVisionContent(validContent, () => {
      // Build should succeed
      const result = runAstroBuild();
      expect(result).toBeTruthy();
    });
  });
});

test.describe("Content Collections - File Structure", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Runs in Chromium only to avoid cross-project content mutations.",
    );
  });

  test("should have content config file", () => {
    const configPath = "src/content/config.ts";
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain("defineCollection");
    expect(content).toContain("pages");
  });

  test("should have vision.mdx in pages collection", () => {
    const visionPath = "src/content/pages/vision.mdx";
    expect(fs.existsSync(visionPath)).toBe(true);

    const content = fs.readFileSync(visionPath, "utf-8");
    expect(content).toContain("---"); // Has frontmatter
    expect(content).toContain("title:");
    expect(content).toContain("description:");
  });

  test("vision page should use getEntry API", () => {
    const pagePath = "src/pages/vision/index.astro";
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("import { getEntry } from 'astro:content'");
    expect(content).toContain("getEntry('pages', 'vision')");
    expect(content).toContain("await entry.render()");
  });
});
