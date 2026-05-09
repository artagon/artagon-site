// Tests for scripts/lint-tokens.mjs (USMR Phase 2 §"Token Categories").
// Builds synthetic git repos in OS tmp dirs and points the script at
// them via argv[2]. Uses real `git init` + `git add` (rather than
// mocking) so the script's `git ls-files` call exercises the same
// path the production gate does.
//
// Run: node --test tests/lint-tokens.test.mjs
//      (or wire into npm run test:node alongside the others)
//
// Exit-code contract:
//   0 — no raw color literals outside ALLOWLIST (theme.css, DESIGN.md)
//   1 — at least one violation found
//   2 — usage / IO error (git missing, ROOT not a directory, etc.)
//
// Phrasing-coupled assertions: tests match on STABLE substrings of the
// script's stderr output ("no raw color literals", "raw hex literal",
// "raw rgba literal", "token violation"). If script copy changes,
// update these regexes in lockstep.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "lint-tokens.mjs");

function gitInit(root) {
  execFileSync("git", ["init", "--initial-branch=main"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.email", "test@example.com"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "Test"], {
    cwd: root,
    stdio: "ignore",
  });
}

function writeFile(root, relPath, body) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
}

function gitAddAll(root) {
  execFileSync("git", ["add", "-A"], { cwd: root, stdio: "ignore" });
}

function runScript(root) {
  try {
    const stdout = execFileSync("node", [SCRIPT, root], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      code: typeof err.status === "number" ? err.status : 99,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

function withFixture(setup, runner) {
  const root = mkdtempSync(join(tmpdir(), "lint-tokens-"));
  try {
    gitInit(root);
    setup(root);
    gitAddAll(root);
    return runner(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------- exit 0: clean ----------

test("exits 0 on clean fixture (component css using only var())", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.css",
        ".card { color: var(--fg); background: var(--bg-1); }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
  assert.match(result.stdout, /no raw color literals found/);
});

// USMR Phase 5.5.16-pt76 — theme.css is no longer fully allowlisted.
// Token DEFINITIONS (raw colors after `--name:`) remain allowed; raw
// colors anywhere else (class rules, gradients, etc.) are violations.
test("theme.css token definitions remain allowed (one decl per line)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "public/assets/theme.css",
        ":root {\n  --bg: oklch(0.14 0.008 260);\n  --c: #abc;\n}\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("theme.css token definitions remain allowed (multi decl per line)", () => {
  // The pre-pt76 fixture cram-codes two decls on a single line. The
  // token-aware scanner walks back from each color match to the
  // nearest `{` or `;` and checks for `--name:` — so multi-decl lines
  // work the same as one-per-line.
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "public/assets/theme.css",
        ":root { --bg: oklch(0.14 0.008 260); --c: #abc; }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("theme.css class-rule with raw color DOES trip (pt76 regression)", () => {
  // Pre-pt76 this fixture passed (whole-file allowlist). Post-pt76 the
  // class rule's raw `#abc` is flagged because it's not inside a
  // `--name:` declaration. Captures the pt74/pt75 latent violations
  // that pt76 is designed to surface.
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "public/assets/theme.css",
        ":root { --fg: oklch(0.96 0.005 85); }\n.cta { color: #abc; }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /raw hex literal/);
});

test("theme.css var(--token, FALLBACK) hardcoded fallback is allowed", () => {
  // Defensive `var(--fg, #abc)` patterns are intentional — the
  // fallback fires only when --fg is unset, which shouldn't happen
  // in well-formed themes but is a safety net for theme bootstrap.
  // Pre-pt260 the example used `--text`; that alias was retired in
  // pt86 / pt169 / pt170. Use canonical `--fg` per AGENTS.md
  // §"Token source".
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "public/assets/theme.css",
        ":root { --fg: oklch(0.96 0.005 85); }\n.x { color: var(--fg, #abc); }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("theme.css /* lint-tokens: ok */ marker exempts gradient stops", () => {
  // Per-line allow marker for compositing primitives (mask gradients)
  // and shimmer specular highlights (#fff / #000 anchors that would
  // lose semantic meaning if tokenized).
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "public/assets/theme.css",
        ".x { background: linear-gradient(#fff 0%, #000 100%); /* lint-tokens: ok */ }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("ALLOWLIST: DESIGN.md with raw hex does NOT trip", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "DESIGN.md",
        '---\ncolors:\n  bg: "#07090c"\n---\n# Title\n',
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

// ---------- exit 1: each pattern catches one literal ----------

const PATTERNS = [
  { name: "hex", body: ".x { color: #abc; }", expect: /raw hex literal/ },
  {
    name: "rgb",
    body: ".x { color: rgb(1, 2, 3); }",
    expect: /raw rgb literal/,
  },
  {
    name: "rgba",
    body: ".x { color: rgba(1, 2, 3, 0.5); }",
    expect: /raw rgba literal/,
  },
  {
    name: "hsl",
    body: ".x { color: hsl(120, 50%, 50%); }",
    expect: /raw hsl literal/,
  },
  {
    name: "hsla",
    body: ".x { color: hsla(120, 50%, 50%, 0.5); }",
    expect: /raw hsla literal/,
  },
  {
    name: "oklch",
    body: ".x { color: oklch(0.5 0.1 180); }",
    expect: /raw oklch literal/,
  },
  {
    name: "oklab",
    body: ".x { color: oklab(0.5 0.1 0.05); }",
    expect: /raw oklab literal/,
  },
];

for (const { name, body, expect } of PATTERNS) {
  test(`pattern: ${name} literal in component .css triggers exit 1`, () => {
    const result = withFixture(
      (root) => {
        writeFile(root, "src/components/Card.css", body + "\n");
      },
      (root) => runScript(root),
    );
    assert.equal(result.code, 1);
    assert.match(result.stderr, expect);
    assert.match(result.stderr, /token violation/);
  });
}

// ---------- exit 1: hex boundary anchor catches multi-value ----------

test("hex boundary anchor catches all 3 literals in multi-value box-shadow", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.css",
        ".card { box-shadow: 0 1px 2px #abc, 0 4px 8px #def, 0 8px 16px #123abc; }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  // Three hex literals on one line — each should produce a violation row.
  const matches = result.stderr.match(/raw hex literal/g) ?? [];
  assert.equal(
    matches.length,
    3,
    "expected 3 hex violations, got " + matches.length,
  );
});

test("hex anchor catches literal inside linear-gradient(#a, #b)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.css",
        ".card { background: linear-gradient(#abc, #def); }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  const matches = result.stderr.match(/raw hex literal/g) ?? [];
  assert.equal(matches.length, 2);
});

// ---------- case-insensitivity (CSS function names are case-insensitive) ----------

test("uppercase RGB(...) is caught (CSS funcs are case-insensitive)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.css",
        ".x { color: RGB(1, 2, 3); }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /raw rgb literal/);
});

test("MixedCase OkLcH(...) is caught", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.css",
        ".x { color: OkLcH(0.5 0.1 180); }\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /raw oklch literal/);
});

// ---------- mdx fence-only scoping ----------

test("mdx: hex inside prose paragraph does NOT trip (anchor href)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/content/post.mdx",
        "# Title\n\nSee [section](#section-id) for details.\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("mdx: hex inside ```css fence DOES trip", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/content/post.mdx",
        "# Title\n\n```css\n.x { color: #abc; }\n```\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /raw hex literal/);
});

test("mdx: hex inside <style> block DOES trip", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/content/post.mdx",
        "# Title\n\n<style>.x { color: #abc; }</style>\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /raw hex literal/);
});

// ---------- file-type scoping ----------

test("ignores .ts files (only .css and .mdx scoped)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.ts",
        "const x = '#abc'; const y = rgba(0,0,0,1);\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

test("ignores .astro files (covered by ast-grep, not lint-tokens)", () => {
  const result = withFixture(
    (root) => {
      writeFile(
        root,
        "src/components/Card.astro",
        "---\n---\n<style>.x { color: #abc; }</style>\n",
      );
    },
    (root) => runScript(root),
  );
  assert.equal(result.code, 0);
});

// ---------- complementary coverage assertion ----------
// The .astro test above only proves lint-tokens doesn't double-cover
// the file; it does NOT prove the ast-grep companion rule actually
// fires. This test runs the rule directly against a minimal fixture
// to lock in the coverage claim.
test("ast-grep no-raw-color-literal rule fires on raw rgba in .astro <style>", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-tokens-astro-"));
  try {
    writeFile(
      root,
      "src/components/Card.astro",
      "---\n---\n<style>.x { background: rgba(0, 0, 0, 0.1); }</style>\n",
    );
    const RULE = join(ROOT, "rules", "security", "no-raw-color-literal.yml");
    const SGCONFIG = join(ROOT, "sgconfig.yml");
    const SG = join(ROOT, "node_modules", ".bin", "sg");
    let output;
    try {
      // Pass --config explicitly so ast-grep finds language registrations
      // regardless of cwd. Running this test from /tmp would otherwise
      // produce empty output (ast-grep fails silently when sgconfig.yml
      // is absent), masquerading the rule as "fired" by accident.
      output = execFileSync(
        SG,
        ["scan", "--config", SGCONFIG, "--rule", RULE, root],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          cwd: ROOT,
        },
      );
    } catch (err) {
      output = (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "");
    }
    assert.match(
      output,
      /no-raw-color-literal/,
      "expected ast-grep to flag the raw rgba in the .astro fixture",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------- exit 2: usage / IO ----------

test("exit 2 when ROOT is not a directory", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-tokens-"));
  const fakeFile = join(root, "not-a-dir");
  writeFileSync(fakeFile, "x");
  const result = runScript(fakeFile);
  rmSync(root, { recursive: true, force: true });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /not a directory/);
});

test("exit 2 when ROOT is not a git repo (git ls-files spawn fails)", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-tokens-"));
  // No git init — so git ls-files inside the script will fail.
  try {
    const result = runScript(root);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /git ls-files/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
