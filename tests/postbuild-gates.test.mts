import { afterEach, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const ROOT = new URL("..", import.meta.url).pathname;
const SCRIPTS = join(ROOT, "scripts");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function writeFile(root: string, relativePath: string, contents: string): string {
  const filePath = join(root, relativePath);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, contents);
  return filePath;
}

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runScript(name: string, cwd: string, args: string[] = []): RunResult {
  const script = join(SCRIPTS, name);
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as {
      status?: number | null;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
    };
    const text = (value: Buffer | string | undefined) =>
      Buffer.isBuffer(value) ? value.toString("utf8") : (value ?? "");
    return {
      code: failure.status ?? 2,
      stdout: text(failure.stdout),
      stderr: text(failure.stderr),
    };
  }
}

function setupIndexationRoot(root: string, sitemap: string): string {
  const dist = join(root, ".build", "dist");
  mkdirSync(dist, { recursive: true });
  writeFile(root, ".build/dist/sitemap-0.xml", sitemap);
  writeFile(root, "public/_redirects", "/old /new 301\n");
  return dist;
}

function sitemap(body: string): string {
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

describe("postbuild gate regressions", () => {
  test("SRI resolves relative URLs from deployed routes and hashes only /_astro assets", () => {
    const root = tempRoot("postbuild-sri-");
    const dist = join(root, ".build", "dist");
    writeFile(
      root,
      ".build/dist/nested/index.html",
      '<!doctype html><html><head><link rel="stylesheet" href="./assets/theme.css"></head><body><script src="../_astro/app.js"></script><script src="https://cdn.example.test/vendor.js"></script></body></html>',
    );
    const themeCss = "body { color: blue; }";
    const appJs = "window.ready = true;";
    writeFile(root, ".build/dist/assets/theme.css", themeCss);
    writeFile(root, ".build/dist/_astro/app.js", appJs);

    const result = runScript("sri.mjs", root);
    expect(result.code, result.stderr).toBe(0);
    const $ = cheerio.load(readFileSync(join(dist, "nested/index.html"), "utf8"));
    const expected = `sha256-${createHash("sha256").update(appJs).digest("base64")}`;
    expect($('script[src="../_astro/app.js"]').attr("integrity")).toBe(expected);
    expect($('script[src="../_astro/app.js"]').attr("crossorigin")).toBe("anonymous");
    expect($('link[href="./assets/theme.css"]').attr("integrity")).toBeUndefined();
    expect($('script[src^="https://"]').attr("integrity")).toBeUndefined();
    expect(JSON.parse(readFileSync(join(dist, "sri-manifest.json"), "utf8"))).toEqual({
      "/_astro/app.js": expected,
    });
  });

  test("SRI fails with HTML and resource context for a missing local asset", () => {
    const root = tempRoot("postbuild-sri-missing-");
    writeFile(
      root,
      ".build/dist/nested/index.html",
      '<html><head></head><body><script src="../_astro/missing.js"></script></body></html>',
    );

    const result = runScript("sri.mjs", root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("nested/index.html");
    expect(result.stderr).toContain("../_astro/missing.js");
    expect(result.stderr).toContain("/_astro/missing.js");
  });

  test("SRI rejects a symlinked asset outside dist", () => {
    const root = tempRoot("postbuild-sri-outside-");
    const outside = writeFile(root, "outside.js", "window.outside = true;");
    const astroDir = join(root, ".build", "dist", "_astro");
    mkdirSync(astroDir, { recursive: true });
    symlinkSync(outside, join(astroDir, "escape.js"));
    writeFile(
      root,
      ".build/dist/index.html",
      '<html><head></head><body><script src="/_astro/escape.js"></script></body></html>',
    );

    const result = runScript("sri.mjs", root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("outside the build output");
  });

  test("SRI rejects lexical path escapes after URL decoding", () => {
    const root = tempRoot("postbuild-sri-lexical-escape-");
    writeFile(
      root,
      ".build/dist/index.html",
      '<html><head></head><body><script src="/_astro/..%2f..%2fx"></script></body></html>',
    );

    const result = runScript("sri.mjs", root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("index.html");
    expect(result.stderr).toContain("escapes the build output");
  });

  test("CSS minification changes only the dist copy and preserves its URL path", () => {
    const root = tempRoot("postbuild-theme-css-");
    const source = "/* keep source */\n:root { --theme-color: #123456; --t: -0.035em; }\n";
    writeFile(root, "public/assets/theme.css", source);
    writeFile(root, ".build/dist/assets/theme.css", source);

    const result = runScript("minify-theme-css.mjs", root, [root]);
    expect(result.code, result.stderr).toBe(0);
    expect(readFileSync(join(root, "public/assets/theme.css"), "utf8")).toBe(source);
    const distCss = readFileSync(join(root, ".build/dist/assets/theme.css"), "utf8");
    expect(distCss.length).toBeLessThan(source.length);
    expect(distCss).toContain("--theme-color: #123456");
    expect(distCss).toContain("--t: -0.035em");
    expect(existsSync(join(root, ".build/dist/assets/theme.css"))).toBe(true);
  });

  test("theme CSS minifier fails when the dist stylesheet is missing", () => {
    const root = tempRoot("postbuild-theme-css-missing-");
    mkdirSync(join(root, ".build", "dist"), { recursive: true });

    const result = runScript("minify-theme-css.mjs", root, [root]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("theme.css");
    expect(result.stderr).toContain("ENOENT");
  });

  test("CSP uses the shared walker and leaves frame-ancestors to response headers", () => {
    const root = tempRoot("postbuild-csp-");
    const html = '<!doctype html><html><head></head><body><script>window.ready = true;</script></body></html>';
    writeFile(root, ".build/dist/nested/index.html", html);

    const result = runScript("csp.mjs", root);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("files=1");
    const output = readFileSync(join(root, ".build/dist/nested/index.html"), "utf8");
    expect(output).toContain("Content-Security-Policy");
    expect(output).not.toMatch(/frame-ancestors/i);
  });

  test("CSP fails closed on symlinked HTML outside dist", () => {
    const root = tempRoot("postbuild-csp-symlink-");
    const html = '<!doctype html><html><head></head><body><script>window.ready = true;</script></body></html>';
    const outside = writeFile(root, "outside.html", html);
    const dist = join(root, ".build", "dist");
    mkdirSync(dist, { recursive: true });
    symlinkSync(outside, join(dist, "linked.html"));

    const result = runScript("csp.mjs", root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("linked.html");
    expect(readFileSync(outside, "utf8")).toBe(html);
  });

  test("skip-link target matching requires an actual id and handles regex characters", () => {
    const root = tempRoot("postbuild-skip-link-");
    const dist = join(root, ".build", "dist");
    mkdirSync(dist, { recursive: true });
    writeFile(root, "build.config.json", JSON.stringify({ dist: ".build/dist" }));
    writeFile(
      root,
      ".build/dist/bad.html",
      '<html><body><a class="skip-link" href="#main+content">Skip</a><main data-id="main+content"></main></body></html>',
    );
    const bad = runScript("lint-skip-link.mjs", root, [root]);
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("skip-link target #main+content not found");

    writeFile(
      root,
      ".build/dist/bad.html",
      '<html><body><a class="skip-link" href="#main+content">Skip</a><main id="main+content"></main></body></html>',
    );
    const good = runScript("lint-skip-link.mjs", root, [root]);
    expect(good.code, good.stderr).toBe(0);
  });

  test("robots validation is attribute-order independent and route-specific", () => {
    const root = tempRoot("postbuild-robots-");
    const dist = setupIndexationRoot(
      root,
      sitemap('<url><loc>https://artagon.com/platform</loc></url>'),
    );
    writeFile(
      root,
      ".build/dist/console/index.html",
      '<html><head><meta content="nofollow" name="robots"><meta name="robots" content="noindex"></head><body></body></html>',
    );
    writeFile(
      root,
      ".build/dist/privacy/index.html",
      '<html><head><meta content="noindex, follow" name="robots"></head><body></body></html>',
    );
    const valid = runScript("validate-indexation.mjs", root, [root]);
    expect(valid.code, valid.stderr).toBe(0);

    writeFile(
      root,
      ".build/dist/console/index.html",
      '<html><head><meta content="noindex" name="robots"></head><body></body></html>',
    );
    const missingNofollow = runScript("validate-indexation.mjs", root, [root]);
    expect(missingNofollow.code).toBe(1);
    expect(missingNofollow.stderr).toContain("[missing-nofollow] /console");

    writeFile(
      root,
      ".build/dist/platform/index.html",
      '<html><head><meta content="noindex" name="robots"></head><body></body></html>',
    );
    const spuriousNoindex = runScript("validate-indexation.mjs", root, [root]);
    expect(spuriousNoindex.code).toBe(1);
    expect(spuriousNoindex.stderr).toContain("[spurious-robots-meta] /platform");
    expect(existsSync(dist)).toBe(true);
  });

  test("sitemap validation handles nested .md content and additional XML children", () => {
    const root = tempRoot("postbuild-sitemap-nested-");
    setupIndexationRoot(
      root,
      sitemap(
        '<url><loc>https://artagon.com/writing/series/post</loc><changefreq>monthly</changefreq><lastmod>2026-09-04T00:00:00Z</lastmod></url>',
      ),
    );
    writeFile(
      root,
      "src/content/writing/series/post.md",
      "---\npublished: 2026-04-01\nupdated: 2026-09-04\n---\nPost body\n",
    );

    const result = runScript("validate-indexation.mjs", root, [root]);
    expect(result.code, result.stderr).toBe(0);
  });

  test("sitemap validation handles nested .mdx content with UTC-normalized dates", () => {
    const root = tempRoot("postbuild-sitemap-nested-mdx-utc-");
    setupIndexationRoot(
      root,
      sitemap(
        '<url><loc>https://artagon.com/writing/series/post</loc><lastmod>2026-03-31T22:30:00.000Z</lastmod></url>',
      ),
    );
    writeFile(
      root,
      "src/content/writing/series/post.mdx",
      "---\npublished: 2026-04-01T00:30:00+02:00\n---\nPost body\n",
    );

    const normalized = runScript("validate-indexation.mjs", root, [root]);
    expect(normalized.code, normalized.stderr).toBe(0);

    writeFile(
      root,
      ".build/dist/sitemap-0.xml",
      sitemap(
        '<url><loc>https://artagon.com/writing/series/post</loc><lastmod>2026-04-01T00:30:00.000Z</lastmod></url>',
      ),
    );
    const localTime = runScript("validate-indexation.mjs", root, [root]);
    expect(localTime.code).toBe(1);
    expect(localTime.stderr).toContain("[lastmod-parity]");
  });

  test("sitemap validation rejects a lastmod mismatch", () => {
    const root = tempRoot("postbuild-sitemap-lastmod-mismatch-");
    setupIndexationRoot(
      root,
      sitemap('<url><loc>https://artagon.com/writing/post</loc><lastmod>2026-04-02T00:00:00Z</lastmod></url>'),
    );
    writeFile(
      root,
      "src/content/writing/post.mdx",
      "---\npublished: 2026-04-01\n---\nPost body\n",
    );

    const result = runScript("validate-indexation.mjs", root, [root]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("[lastmod-parity]");
  });

  test("sitemap validation rejects a writing URL without a content file", () => {
    const root = tempRoot("postbuild-sitemap-missing-content-");
    setupIndexationRoot(
      root,
      sitemap('<url><loc>https://artagon.com/writing/missing</loc><lastmod>2026-04-01T00:00:00Z</lastmod></url>'),
    );

    const result = runScript("validate-indexation.mjs", root, [root]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("[sitemap-url-without-writing-content]");
  });

  test("sitemap validation rejects missing writing lastmod and empty parsed sitemaps", () => {
    const root = tempRoot("postbuild-sitemap-invalid-");
    setupIndexationRoot(
      root,
      sitemap('<url><loc>https://artagon.com/writing/post</loc></url>'),
    );
    const missingDate = runScript("validate-indexation.mjs", root, [root]);
    expect(missingDate.code).toBe(1);
    expect(missingDate.stderr).toContain("[missing-lastmod]");

    writeFile(root, ".build/dist/sitemap-0.xml", sitemap(""));
    const empty = runScript("validate-indexation.mjs", root, [root]);
    expect(empty.code).toBe(1);
    expect(empty.stderr).toContain("[empty-sitemap]");
  });

  test("sitemap validation rejects truncated XML after a valid URL entry", () => {
    const root = tempRoot("postbuild-sitemap-truncated-");
    setupIndexationRoot(
      root,
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://artagon.com/platform</loc></url><url><loc>https://artagon.com/truncated',
    );

    const result = runScript("validate-indexation.mjs", root, [root]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("[invalid-sitemap-xml]");
  });
});
