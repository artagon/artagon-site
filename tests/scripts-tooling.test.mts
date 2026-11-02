import { describe, expect, it } from "vitest";
import {
  copyFileSync,
  existsSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, "..");
const SCRIPTS = join(ROOT, "scripts");

function isolatedEnv(extra: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env, ...extra };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;
  return env;
}

function withTempDir<T>(prefix: string, run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeFile(root: string, relPath: string, body: string) {
  const absPath = join(root, relPath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, body, "utf8");
  return absPath;
}

function run(command: string, args: string[], cwd: string, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: isolatedEnv(env),
  });
  return {
    code: result.status ?? 99,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
  };
}

function runNode(script: string, args: string[], cwd: string, env = {}) {
  return run(process.execPath, [script, ...args], cwd, env);
}

function initGit(root: string) {
  execFileSync("git", ["init", "--quiet"], {
    cwd: root,
    env: isolatedEnv(),
    stdio: "ignore",
  });
}

function copyBuildGeneratorFixture(root: string) {
  mkdirSync(join(root, "scripts", "fixtures"), { recursive: true });
  for (const [source, target] of [
    [
      join(SCRIPTS, "sync-build-config.mjs"),
      join(root, "scripts", "sync-build-config.mjs"),
    ],
    [
      join(SCRIPTS, "fixtures", "lhci-assertions.json"),
      join(root, "scripts", "fixtures", "lhci-assertions.json"),
    ],
    [join(ROOT, "build.config.json"), join(root, "build.config.json")],
    [join(ROOT, "lighthouserc.json"), join(root, "lighthouserc.json")],
    [join(ROOT, "lychee.toml"), join(root, "lychee.toml")],
  ] as const) {
    copyFileSync(source, target);
  }
  return join(root, "scripts", "sync-build-config.mjs");
}

describe("developer tooling script regressions", () => {
  it("skips missing tracked CSS inputs but exits 2 on other read failures", () => {
    withTempDir("lint-tokens-enoent-", (root) => {
      initGit(root);
      const tracked = writeFile(root, "src/old.css", ".x { color: #abc; }\n");
      execFileSync("git", ["add", "src/old.css"], {
        cwd: root,
        env: isolatedEnv(),
      });
      rmSync(tracked);

      const result = runNode(join(SCRIPTS, "lint-tokens.mjs"), [root], root);
      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
    });

    for (const relPath of ["src/card.css", "public/assets/theme.css"]) {
      withTempDir("lint-tokens-read-error-", (root) => {
        initGit(root);
        const tracked = writeFile(root, relPath, ".x { color: #abc; }\n");
        execFileSync("git", ["add", relPath], {
          cwd: root,
          env: isolatedEnv(),
        });
        rmSync(tracked);
        mkdirSync(tracked);

        const result = runNode(join(SCRIPTS, "lint-tokens.mjs"), [root], root);
        expect(result.code).toBe(2);
        expect(result.stderr).toContain(`cannot read ${relPath}: EISDIR`);
      });
    }
  });

  it("fails closed on unreadable or malformed build run locks", () => {
    for (const lockSetup of [
      (root: string) => mkdirSync(join(root, ".build", ".run.lock")),
      (root: string) =>
        writeFile(root, ".build/.run.lock", "host:not-a-pid:NaN\n"),
    ]) {
      withTempDir("clean-lock-", (root) => {
        mkdirSync(join(root, "scripts"), { recursive: true });
        copyFileSync(
          join(SCRIPTS, "clean.mjs"),
          join(root, "scripts", "clean.mjs"),
        );
        writeFile(root, ".build/cache/keep.txt", "preserve\n");
        lockSetup(root);

        const result = runNode(
          join(root, "scripts", "clean.mjs"),
          ["all"],
          root,
        );
        expect(result.code).toBe(73);
        expect(result.stderr).toMatch(/refusing to delete all/);
        expect(readFileSync(join(root, ".build/cache/keep.txt"), "utf8")).toBe(
          "preserve\n",
        );
      });
    }
  });

  it("warns during the Google font migration only for the two CSP-allowed hosts", () => {
    withTempDir("font-hosts-", (root) => {
      const dist = join(root, "dist");
      writeFile(
        root,
        "src/layouts/BaseLayout.astro",
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n',
      );
      writeFile(
        root,
        "src/data/font-stylesheets.ts",
        'export const PRODUCTION_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Fraunces";\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com/css2 https://fonts.gstatic.com/font.woff2\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, dist],
        root,
      );
      expect(result.code).toBe(0);
      expect(result.stderr).toContain("Severity downgraded to warn");
      expect(result.stderr).toContain("src/data/font-stylesheets.ts");
    });

    withTempDir("font-host-mixed-", (root) => {
      const dist = join(root, "dist");
      writeFile(
        root,
        "src/data/font-stylesheets.ts",
        'export const PRODUCTION_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Fraunces";\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com/css2 https://use.typekit.net/abc.css\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, dist],
        root,
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("use.typekit.net");
      expect(result.stderr).not.toContain("Severity downgraded to warn");
    });

    withTempDir("font-host-lookalike-", (root) => {
      const dist = join(root, "dist");
      writeFile(
        root,
        "src/data/font-stylesheets.ts",
        'export const PRODUCTION_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Fraunces";\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com.attacker.invalid/fonts/a.woff2\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, dist],
        root,
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("fonts.googleapis.com.attacker.invalid");
      expect(result.stderr).not.toContain("Severity downgraded to warn");
    });
  });

  it("misses the extracted css2 loader without its source path (negative control)", () => {
    withTempDir("font-loader-path-", (root) => {
      const script = join(SCRIPTS, "verify-font-self-hosting.mjs");
      const source = readFileSync(script, "utf8");
      const newPath = '    join(ROOT, "src", "data", "font-stylesheets.ts"),\n';
      expect(source).toContain(newPath);
      const withoutNewPath = writeFile(
        root,
        "probe-without-module.mjs",
        source.replace(newPath, ""),
      );
      writeFile(
        root,
        "src/layouts/BaseLayout.astro",
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n',
      );
      writeFile(
        root,
        "src/data/font-stylesheets.ts",
        'export const PRODUCTION_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Fraunces";\n',
      );
      const dist = join(root, "dist");
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com/css2?family=Fraunces\n",
      );
      const negative = runNode(withoutNewPath, [root, dist], root);
      expect(negative.code).toBe(1);
      expect(negative.stderr).toContain("third-party font CDN reference");
      expect(negative.stderr).not.toContain("Severity downgraded to warn");
      const positive = runNode(script, [root, dist], root);
      expect(positive.code).toBe(0);
      expect(positive.stderr).toContain(
        "loader still present in src/data/font-stylesheets.ts",
      );
    });
  });

  it("does not treat preconnect hints as a css2 loader", () => {
    withTempDir("font-loader-hints-", (root) => {
      writeFile(
        root,
        "src/layouts/BaseLayout.astro",
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.gstatic.com/font.woff2\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, join(root, "dist")],
        root,
      );
      expect(result.code).toBe(1);
      expect(result.stderr).not.toContain("Severity downgraded to warn");
    });
  });

  // USMR 14.10 review R1: dev-only font swapping cannot defer the production gate.
  it("fails on built CDN references when only the dev Tweaks css2 loader remains", () => {
    withTempDir("font-loader-dev-only-", (root) => {
      writeFile(
        root,
        "src/layouts/BaseLayout.astro",
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n',
      );
      writeFile(
        root,
        "src/data/font-stylesheets.ts",
        'export const TWEAKS_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Instrument+Serif";\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com/css2?family=Fraunces\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, join(root, "dist")],
        root,
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("third-party font CDN reference");
      expect(result.stderr).not.toContain("Severity downgraded to warn");
    });
  });

  it("keeps the legacy BaseLayout css2 href as a production loader signal", () => {
    withTempDir("font-loader-legacy-", (root) => {
      writeFile(
        root,
        "src/layouts/BaseLayout.astro",
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces">\n',
      );
      writeFile(
        root,
        "dist/index.html",
        "https://fonts.googleapis.com/css2?family=Fraunces\n",
      );
      const result = runNode(
        join(SCRIPTS, "verify-font-self-hosting.mjs"),
        [root, join(root, "dist")],
        root,
      );
      expect(result.code).toBe(0);
      expect(result.stderr).toContain(
        "loader still present in src/layouts/BaseLayout.astro",
      );
    });
  });

  it("invalidates generator fast-path output when the generator changes", () => {
    withTempDir("build-generator-", (root) => {
      const generator = copyBuildGeneratorFixture(root);
      const source = readFileSync(generator, "utf8");
      expect(source).toContain("timeout = 30");
      writeFileSync(generator, source.replace("timeout = 30", "timeout = 31"));

      const oldInputTime = new Date(10_000);
      const oldOutputTime = new Date(20_000);
      const newGeneratorTime = new Date(30_000);
      for (const relPath of [
        "build.config.json",
        "scripts/fixtures/lhci-assertions.json",
      ]) {
        utimesSync(join(root, relPath), oldInputTime, oldInputTime);
      }
      for (const relPath of ["lighthouserc.json", "lychee.toml"]) {
        utimesSync(join(root, relPath), oldOutputTime, oldOutputTime);
      }
      utimesSync(generator, newGeneratorTime, newGeneratorTime);

      const result = runNode(generator, [], root, {
        GITHUB_ACTIONS: "",
        SKIP_BUILD_SYNC: "0",
      });
      expect(result.code).toBe(0);
      expect(readFileSync(join(root, "lychee.toml"), "utf8")).toContain(
        "timeout = 31",
      );
    });
  });

  it("keeps pre-commit in generator check mode and refuses hand-edited outputs", () => {
    const hook = readFileSync(join(ROOT, ".husky", "pre-commit"), "utf8");
    expect(hook).toContain("npm run sync:build-config -- --check");

    withTempDir("build-generator-check-", (root) => {
      const generator = copyBuildGeneratorFixture(root);
      const generated = join(root, "lychee.toml");
      writeFileSync(generated, "hand-edited\n");
      const result = runNode(generator, ["--check"], root, {
        GITHUB_ACTIONS: "",
        SKIP_BUILD_SYNC: "0",
      });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("build config drift");
      expect(readFileSync(generated, "utf8")).toBe("hand-edited\n");
    });
  });

  it("generates Lychee config without the build artifact as root or false cache-dir claims", () => {
    const lychee = readFileSync(join(ROOT, "lychee.toml"), "utf8");
    const generator = readFileSync(
      join(SCRIPTS, "sync-build-config.mjs"),
      "utf8",
    );
    expect(lychee).not.toMatch(/^root_dir\s*=/m);
    expect(lychee).toContain("absolute --root-dir");
    expect(lychee).not.toContain('base = "."');
    expect(generator).not.toContain("--cache-dir");
  });

  it("removes only its owned logo-conversion temporary child", () => {
    withTempDir("logo-temp-", (root) => {
      const source = readFileSync(join(SCRIPTS, "convert-logos.sh"), "utf8");
      const marker = 'echo "✓ Source:';
      const end = source.indexOf(marker);
      expect(end).toBeGreaterThan(0);

      const sourceFile = writeFile(
        root,
        "source.png",
        "synthetic input only\n",
      );
      const tempParent = join(root, "shared-temp");
      mkdirSync(tempParent);
      writeFile(root, "shared-temp/keep.txt", "caller data\n");
      const probe = writeFile(
        root,
        "logo-setup-probe.sh",
        `${source.slice(0, end)}\nexit 0\n`,
      );
      const result = run("bash", [probe], root, {
        SRC_FULL: sourceFile,
        OUT_DIR: join(root, "out"),
        TEMP_DIR: tempParent,
      });

      expect(result.code).toBe(0);
      expect(readdirSync(tempParent)).toEqual(["keep.txt"]);
      expect(readFileSync(join(tempParent, "keep.txt"), "utf8")).toBe(
        "caller data\n",
      );
    });
  });

  it("accepts optional logo omission in the OG script argument parser", () => {
    withTempDir("og-args-", (root) => {
      const source = readFileSync(
        join(SCRIPTS, "make-og-from-template.sh"),
        "utf8",
      );
      const end = source.indexOf("esc(){");
      expect(end).toBeGreaterThan(0);
      const probe = writeFile(
        root,
        "og-args-probe.sh",
        `${source.slice(0, end)}\nexit 0\n`,
      );

      expect(run("bash", [probe], root).code).toBe(0);
      expect(
        run("bash", [probe, "Title", "Subtitle", "preview.png"], root).code,
      ).toBe(0);
      const invalid = run(
        "bash",
        [probe, "Title", "Subtitle", "preview.png", "--bad"],
        root,
      );
      expect(invalid.code).toBe(1);
      expect(`${invalid.stdout}${invalid.stderr}`).toContain("Usage:");
    });
  });

  it("selects OG templates deterministically with a converter stub", () => {
    // USMR site-w1n.4: template selection and fallback do not depend on native renderers.
    withTempDir("og-template-selection-", (root) => {
      const script = join(root, "scripts", "make-og-from-template.sh");
      const templates = join(root, "scripts", "templates", "og");
      const textTemplate = join(templates, "og-template.svg");
      const imageTemplate = join(templates, "og-template-image.svg");
      const logo = join(
        root,
        "public",
        "assets",
        "logos",
        "logo-horizontal-800.png",
      );
      const converterLog = join(root, "converter.log");
      mkdirSync(dirname(script), { recursive: true });
      mkdirSync(templates, { recursive: true });
      mkdirSync(dirname(logo), { recursive: true });
      copyFileSync(join(SCRIPTS, "make-og-from-template.sh"), script);
      writeFile(
        root,
        "scripts/templates/og/og-template.svg",
        "<svg>TEXT TEMPLATE {{TITLE}}</svg>\n",
      );
      writeFile(
        root,
        "scripts/templates/og/og-template-image.svg",
        "<svg>IMAGE TEMPLATE {{TITLE}} {{LOGO}}</svg>\n",
      );
      writeFile(
        root,
        "public/assets/logos/logo-horizontal-800.png",
        "fixture logo",
      );

      const converter = writeFile(
        root,
        "bin/inkscape",
        '#!/bin/sh\nset -eu\ninput=$1\nshift\nwhile [ "$#" -gt 0 ]; do\n  case "$1" in\n    -o) output=$2; shift 2 ;;\n    *) shift ;;\n  esac\ndone\nprintf \'called\\n\' >> "$OG_CONVERTER_LOG"\ncp "$input" "$output"\n',
      );
      chmodSync(converter, 0o755);
      const conversionEnv: NodeJS.ProcessEnv = {
        PATH: `${join(root, "bin")}:${process.env.PATH ?? ""}`,
        OG_CONVERTER_LOG: converterLog,
      };
      const convert = (output: string) =>
        run(
          "bash",
          [script, "Fixture title", "Fixture subtitle", output, "--logo", logo],
          root,
          conversionEnv,
        );

      const imageBranch = convert("public/assets/image-template.png");
      expect(
        imageBranch.code,
        `${imageBranch.stdout}${imageBranch.stderr}`,
      ).toBe(0);
      const imageOutput = readFileSync(
        join(root, "public/assets/image-template.png"),
        "utf8",
      );
      expect(imageOutput).toContain("IMAGE TEMPLATE Fixture title");
      expect(imageOutput).not.toContain("TEXT TEMPLATE");

      // LAYOUT-03C / R5A-02: a valid logo cannot select a missing image template.
      const source = readFileSync(script, "utf8");
      const guardedCondition = '[[ -f "$TEMPLATE_IMG" && -f "$LOGO" ]]';
      expect(source).toContain(guardedCondition);
      rmSync(imageTemplate);
      const missingImageFallback = convert(
        "public/assets/missing-image-template.png",
      );
      expect(
        missingImageFallback.code,
        `${missingImageFallback.stdout}${missingImageFallback.stderr}`,
      ).toBe(0);
      const fallbackOutput = readFileSync(
        join(root, "public/assets/missing-image-template.png"),
        "utf8",
      );
      expect(fallbackOutput).toContain("TEXT TEMPLATE Fixture title");
      expect(fallbackOutput).not.toContain("IMAGE TEMPLATE");

      const unguardedScript = writeFile(
        root,
        "scripts/make-og-without-image-guard.sh",
        source.replace(guardedCondition, '[[ -f "$LOGO" ]]'),
      );
      const missingImageGuardControl = run(
        "bash",
        [
          unguardedScript,
          "Fixture title",
          "Fixture subtitle",
          "public/assets/missing-image-template-control.png",
          "--logo",
          logo,
        ],
        root,
        conversionEnv,
      );
      expect(missingImageGuardControl.code).not.toBe(0);
      expect(readdirSync(join(root, "public/assets"))).not.toContain(
        "missing-image-template-control.png",
      );

      rmSync(logo);
      const missingLogoFallback = convert("public/assets/missing-logo.png");
      expect(
        missingLogoFallback.code,
        `${missingLogoFallback.stdout}${missingLogoFallback.stderr}`,
      ).toBe(0);
      const missingLogoOutput = readFileSync(
        join(root, "public/assets/missing-logo.png"),
        "utf8",
      );
      expect(missingLogoOutput).toContain("TEXT TEMPLATE Fixture title");
      expect(missingLogoOutput).not.toContain("IMAGE TEMPLATE");

      rmSync(imageTemplate, { force: true });
      rmSync(textTemplate);
      const callsBeforeMissingText = readFileSync(converterLog, "utf8");
      const missingTextTemplate = convert(
        "public/assets/missing-text-template.png",
      );
      expect(missingTextTemplate.code).not.toBe(0);
      expect(missingTextTemplate.stderr).toContain(
        "scripts/templates/og/og-template.svg",
      );
      expect(readdirSync(join(root, "public/assets"))).not.toContain(
        "missing-text-template.png",
      );
      expect(readFileSync(converterLog, "utf8")).toBe(callsBeforeMissingText);
      expect(callsBeforeMissingText.trim().split("\n")).toHaveLength(3);
    });
  });

  it("uses the relocated OG templates for real image and text-fallback conversions", (context) => {
    // LAYOUT-03C / R5A-01: Vitest stays usable without optional native renderers.
    const rendererAvailable =
      run(
        "bash",
        [
          "-c",
          "command -v rsvg-convert >/dev/null 2>&1 || command -v inkscape >/dev/null 2>&1 || command -v magick >/dev/null 2>&1",
        ],
        ROOT,
      ).code === 0;
    context.skip(
      !rendererAvailable,
      "real OG conversion requires rsvg-convert, Inkscape, or ImageMagick; no supported renderer is installed",
    );

    // A real render with the text template absent proves the image input was consumed.
    withTempDir("og-templates-", (root) => {
      const script = join(root, "scripts", "make-og-from-template.sh");
      const templates = join(root, "scripts", "templates", "og");
      const textTemplate = join(templates, "og-template.svg");
      const imageTemplate = join(templates, "og-template-image.svg");
      const logo = join(
        root,
        "public",
        "assets",
        "logos",
        "logo-horizontal-800.png",
      );
      const rsvg = run(
        "bash",
        ["-c", "command -v rsvg-convert"],
        ROOT,
      ).stdout.trim();
      mkdirSync(dirname(script), { recursive: true });
      mkdirSync(templates, { recursive: true });
      mkdirSync(dirname(logo), { recursive: true });
      copyFileSync(join(SCRIPTS, "make-og-from-template.sh"), script);
      copyFileSync(
        join(SCRIPTS, "templates", "og", "og-template.svg"),
        textTemplate,
      );
      copyFileSync(
        join(SCRIPTS, "templates", "og", "og-template-image.svg"),
        imageTemplate,
      );
      copyFileSync(
        join(ROOT, "public", "assets", "logos", "logo-horizontal-800.png"),
        logo,
      );

      const conversionEnv: NodeJS.ProcessEnv = {};
      if (rsvg) {
        const bin = join(root, "bin");
        const adapter = writeFile(
          root,
          "bin/inkscape",
          '#!/bin/sh\nprintf \'called\\n\' >> "$OG_CONVERTER_LOG"\ninput=$1\nshift\nwidth=1200\nheight=630\nwhile [ "$#" -gt 0 ]; do\n  case "$1" in\n    -w) width=$2; shift 2 ;;\n    -h) height=$2; shift 2 ;;\n    -o) output=$2; shift 2 ;;\n    *) shift ;;\n  esac\ndone\nexec rsvg-convert -w "$width" -h "$height" -o "$output" "$input"\n',
        );
        chmodSync(adapter, 0o755);
        conversionEnv.PATH = `${bin}:${process.env.PATH ?? ""}`;
        conversionEnv.OG_CONVERTER_LOG = join(root, "converter.log");
      }

      rmSync(textTemplate);
      const imageBranch = run(
        "bash",
        [script, "", "", "", "--logo", logo],
        root,
        conversionEnv,
      );
      expect(
        imageBranch.code,
        `${imageBranch.stdout}${imageBranch.stderr}`,
      ).toBe(0);
      const assertRenderedPng = (path: string) => {
        const png = readFileSync(path);
        expect(png.subarray(0, 8)).toEqual(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
      };
      assertRenderedPng(join(root, "public", "assets", "og-image.png"));

      copyFileSync(
        join(SCRIPTS, "templates", "og", "og-template.svg"),
        textTemplate,
      );
      rmSync(logo);
      writeFile(
        root,
        "scripts/templates/og/og-template-image.svg",
        "<svg>invalid branch control",
      );
      const missingLogoFallback = run(
        "bash",
        [script, "Text fallback", "Subtitle", "public/assets/no-logo.png"],
        root,
        conversionEnv,
      );
      expect(missingLogoFallback.code).toBe(0);
      assertRenderedPng(join(root, "public", "assets", "no-logo.png"));

      // LAYOUT-03C / R5A-02: keep a valid selected logo while the image template is absent.
      copyFileSync(
        join(ROOT, "public", "assets", "logos", "logo-horizontal-800.png"),
        logo,
      );
      expect(existsSync(logo)).toBe(true);
      expect(readFileSync(logo).subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      rmSync(imageTemplate);
      const missingImageFallback = run(
        "bash",
        [
          script,
          "Text fallback",
          "Subtitle",
          "public/assets/no-image-template.png",
          "--logo",
          logo,
        ],
        root,
        conversionEnv,
      );
      expect(missingImageFallback.code).toBe(0);
      assertRenderedPng(
        join(root, "public", "assets", "no-image-template.png"),
      );

      const guardedCondition = '[[ -f "$TEMPLATE_IMG" && -f "$LOGO" ]]';
      const scriptSource = readFileSync(script, "utf8");
      expect(scriptSource).toContain(guardedCondition);
      const unguardedScript = writeFile(
        root,
        "scripts/make-og-without-image-guard.sh",
        scriptSource.replace(guardedCondition, '[[ -f "$LOGO" ]]'),
      );
      const missingImageGuardControl = run(
        "bash",
        [
          unguardedScript,
          "Text fallback",
          "Subtitle",
          "public/assets/no-image-template-control.png",
          "--logo",
          logo,
        ],
        root,
        conversionEnv,
      );
      expect(missingImageGuardControl.code).not.toBe(0);
      expect(readdirSync(join(root, "public", "assets"))).not.toContain(
        "no-image-template-control.png",
      );

      rmSync(textTemplate);
      const converterCallsBeforeMissingText = rsvg
        ? readFileSync(join(root, "converter.log"), "utf8")
        : undefined;
      const missingTextTemplate = run(
        "bash",
        [
          script,
          "No template",
          "Subtitle",
          "public/assets/no-text-template.png",
        ],
        root,
        conversionEnv,
      );
      expect(missingTextTemplate.code).not.toBe(0);
      expect(missingTextTemplate.stderr).toContain(
        "scripts/templates/og/og-template.svg",
      );
      expect(readdirSync(join(root, "public", "assets"))).not.toContain(
        "no-text-template.png",
      );
      if (rsvg) {
        expect(readFileSync(join(root, "converter.log"), "utf8")).toBe(
          converterCallsBeforeMissingText,
        );
      }
    });
  }, 30_000);

  it("rejects tracked new-design duplicates of DESIGN.md", () => {
    withTempDir("design-unique-", (root) => {
      initGit(root);
      writeFile(root, "DESIGN.md", "# canonical\n");
      writeFile(root, "new-design/extracted/DESIGN.md", "# duplicate\n");
      execFileSync(
        "git",
        ["add", "DESIGN.md", "new-design/extracted/DESIGN.md"],
        {
          cwd: root,
          env: isolatedEnv(),
        },
      );

      const result = runNode(
        join(SCRIPTS, "verify-design-md-uniqueness.mjs"),
        [root],
        root,
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("new-design/extracted/DESIGN.md");
    });
  });

  it("requires the specific typography property named by a CSS token", () => {
    withTempDir("design-drift-", (root) => {
      const script = join(root, "scripts", "check-design-drift.mjs");
      mkdirSync(dirname(script), { recursive: true });
      copyFileSync(join(SCRIPTS, "check-design-drift.mjs"), script);
      const docs = "## 6 · Token exceptions\nAllowed `--documented-token`\n";
      writeFile(root, "docs/design-md.md", docs);
      writeFile(
        root,
        "public/assets/theme.css",
        ":root { --font-display-size: 40px; }\n",
      );

      writeFile(
        root,
        "DESIGN.md",
        "---\ntypography:\n  display:\n    fontSize: 40px\n---\n# Design\n",
      );
      const valid = runNode(script, [], root);
      expect(valid.code).toBe(0);

      writeFile(
        root,
        "DESIGN.md",
        "---\ntypography:\n  display:\n    fontFamily: Example\n---\n# Design\n",
      );
      const missingProperty = runNode(script, [], root);
      expect(missingProperty.code).toBe(1);
      expect(missingProperty.stderr).toContain("--font-display-size");
    });
  });
});
