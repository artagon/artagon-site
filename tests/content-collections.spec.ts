import { test, expect } from "@playwright/test";
import { execFileSync, type SpawnSyncReturns } from "child_process";
import * as fs from "fs";
import * as path from "path";

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

  // Run an isolated `astro build` against a temp outDir. Returns the outDir
  // (still on disk after the build) so the caller can assert observable
  // post-conditions like "vision/index.html was emitted." The caller is
  // responsible for cleanup; we don't auto-rm in the success path because
  // a Buffer-truthiness assertion is a no-op (HIGH-3).
  //
  // outDir lives under .build/.tmp/ (same filesystem as the workspace's
  // .astro/ build cache) — NOT os.tmpdir(). On GitHub-hosted runners
  // inside the mcr.microsoft.com/playwright container, the workspace is
  // bind-mounted while /tmp is tmpfs; Astro's rename of .astro/ → outDir
  // crosses filesystems and fails with EXDEV. Keeping outDir on the
  // workspace filesystem makes the rename a same-mount operation.
  const runAstroBuild = (): { stdout: Buffer; outDir: string } => {
    const tmpRoot = path.join(process.cwd(), ".build", ".tmp");
    fs.mkdirSync(tmpRoot, { recursive: true });
    const outDir = fs.mkdtempSync(path.join(tmpRoot, "astro-build-"));
    try {
      const stdout = execFileSync(
        "npx",
        ["astro", "build", "--outDir", outDir],
        { stdio: "pipe" },
      );
      return { stdout, outDir };
    } catch (err) {
      // Failure path: clean up and re-throw so the catch site can narrow.
      fs.rmSync(outDir, { recursive: true, force: true });
      throw err;
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

  // Helpers that wrap the assertSpawnFailure narrowing in informative
  // error messages so a re-thrown spawn-time failure (ENOENT, EACCES)
  // doesn't surface as an opaque stack trace.
  const expectBuildFailureContaining = (
    runBuild: () => void,
    expectedSubstring: string,
  ): void => {
    try {
      runBuild();
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
      if (!("status" in error) || !("stderr" in error)) {
        throw new Error(
          `Expected astro build spawn failure, got ${error.constructor.name}: ${error.message}`,
          { cause: error },
        );
      }
      assertSpawnFailure(error);
      expect(error.status).not.toBe(0);
      if (expectedSubstring.length > 0) {
        expect(error.stderr.toString("utf8")).toContain(expectedSubstring);
      }
      return;
    }
    throw new Error(
      "Astro build unexpectedly succeeded with invalid frontmatter",
    );
  };

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Runs in Chromium only to avoid cross-project content mutations.",
    );
  });

  test("should validate required frontmatter fields", () => {
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
      expectBuildFailureContaining(() => {
        runAstroBuild();
      }, "title");
    });
  });

  test("should validate hero object schema", () => {
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
      expectBuildFailureContaining(() => {
        runAstroBuild();
      }, "");
    });
  });

  test("should accept valid frontmatter", () => {
    const validContent = `---
title: "Valid Title"
description: "Valid description for this test page."
eyebrow: "Valid Eyebrow"
headline: "Valid Headline"
lede: "Valid lede text that describes the page content."
ctas:
  - label: "Get started"
    href: "/get-started"
    variant: primary
---

# Valid Content

This is valid markdown content.
`;

    withVisionContent(validContent, () => {
      const { outDir } = runAstroBuild();
      try {
        // Observable post-condition: the vision page actually rendered.
        // Buffer-truthiness was a no-op (Buffer is always truthy); HTML
        // emission proves the schema accepted the frontmatter AND the
        // page was generated without runtime errors.
        expect(fs.existsSync(path.join(outDir, "vision/index.html"))).toBe(
          true,
        );
      } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    });
  });

  test("should accept frontmatter without optional ctas field", () => {
    const validContent = `---
title: "Valid Title"
description: "Valid description for this test page."
eyebrow: "Valid Eyebrow"
headline: "Valid Headline"
lede: "Valid lede text that describes the page content."
---

# Valid Content Without CTAs

This is valid markdown content without explicit ctas (defaults to empty array).
`;

    withVisionContent(validContent, () => {
      const { outDir } = runAstroBuild();
      try {
        expect(fs.existsSync(path.join(outDir, "vision/index.html"))).toBe(
          true,
        );
      } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
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
    // Astro v6 moved the config from src/content/config.ts to src/content.config.ts.
    const configPath = "src/content.config.ts";
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, "utf-8");
    expect(content).toContain("defineCollection");
    expect(content).toContain("pages");
    // v6 requires the loader API; legacy `type: 'content'` is removed.
    expect(content).toContain("loader");
  });

  test("should have vision.mdx in pages collection", () => {
    const visionPath = "src/content/pages/vision.mdx";
    expect(fs.existsSync(visionPath)).toBe(true);

    const content = fs.readFileSync(visionPath, "utf-8");
    expect(content).toContain("---");
    expect(content).toContain("title:");
    expect(content).toContain("description:");
  });

  test("vision page should use Content Layer render API", () => {
    const pagePath = "src/pages/vision/index.astro";
    expect(fs.existsSync(pagePath)).toBe(true);

    const content = fs.readFileSync(pagePath, "utf-8");
    // v6 uses getEntry + the standalone render() function. The legacy
    // entry.render() method was removed.
    expect(content).toContain("getEntry, render");
    expect(content).toContain("getEntry('pages', 'vision')");
    expect(content).toContain("render(entry)");
  });
});
