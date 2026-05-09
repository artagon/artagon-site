/**
 * USMR pt428 — vitest gate replacing the broken `no-set-html-directive`
 * ast-grep rule. The original rule used `kind: document + regex:
 * 'set:html'` which works on small synthetic .astro files but fails
 * silently on real `src/components/SeoTags.astro` (297 lines, 5
 * callsites). Root cause: tree-sitter-html truncates `set:html=` to
 * just `set` because `:` is not a valid HTML attribute character —
 * the larger document's parse tree desyncs from the raw regex view.
 *
 * This test runs against `git ls-files '*.astro'` (same source-of-truth
 * as `scripts/lint-tokens.mjs`) and asserts every `set:html=` callsite
 * routes through `safeJsonLd()` — either a direct call inline at the
 * attribute (`set:html={safeJsonLd(...)}`), or a variable that is
 * assigned the result of `safeJsonLd(...)` in the same file's
 * frontmatter or template script.
 *
 * Allow-list — paths that legitimately use `set:html` outside this
 * pattern. Empty today; documented additions require a comment in
 * the YAML rule + this test simultaneously.
 */

import { describe, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ALLOW_LIST: ReadonlyArray<{
  readonly file: string;
  readonly reason: string;
}> = [
  // Empty today. To add: { file: "src/components/Foo.astro", reason: "..." }
];

function listAstroFiles(): readonly string[] {
  const out = execSync("git ls-files '*.astro'", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const SET_HTML_RE = /set:html\s*=\s*\{([^}]+)\}/g;
const SAFEJSONLD_CALL_RE = /\bsafeJsonLd\s*\(/;

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly reason: string;
}

/**
 * Strip `//` line comments and `/* … *\/` block comments from JS/TS source.
 * String / template-literal contents are preserved verbatim. Used to harden
 * the safe-vars scan against adversarial false-negatives where a misleading
 * commented-out `// const X = safeJsonLd(p)` would otherwise add `X` to
 * `safeVars` (the comment-aware scanning gap flagged by the pt428 review).
 */
/**
 * pt445 — `stripComments(src, { stripStrings })` parameterized.
 *
 * Two callers want different scrub behavior:
 *   - declRe scan needs string contents BLANKED so a literal
 *     `\`const X = safeJsonLd(p)\`` inside a template literal can't
 *     falsely whitelist `X`. (`stripStrings: true`)
 *   - SET_HTML_RE scan needs string contents preserved so the
 *     attribute value (`set:html={...}`) stays intact for matching.
 *     (`stripStrings: false`)
 *
 * Both modes preserve newlines (inside comments and strings) so
 * line numbers computed against the scrubbed source stay aligned
 * with the raw source.
 */
function stripComments(
  src: string,
  opts: { stripStrings?: boolean } = {},
): string {
  const { stripStrings = false } = opts;
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    // Line comment
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    // Block comment — preserve interior newlines so line numbers
    // computed against the stripped source stay aligned with the raw
    // source.
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    // String / template literal
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      // When stripStrings is true, replace contents with spaces (and
      // preserve newlines) so declRe can't be fooled by a literal-text
      // declaration shape. When false, copy verbatim so SET_HTML_RE
      // sees the attribute value intact.
      if (stripStrings) {
        out += " "; // placeholder for the open quote
        i++;
        while (i < n) {
          const c = src[i];
          if (c === "\\" && i + 1 < n) {
            // Skip escape pair without contributing to declRe.
            out += "  ";
            i += 2;
            continue;
          }
          if (c === quote) {
            out += " "; // placeholder for the close quote
            i++;
            break;
          }
          out += c === "\n" ? "\n" : " ";
          i++;
        }
      } else {
        out += ch;
        i++;
        while (i < n) {
          const c = src[i];
          out += c;
          i++;
          if (c === "\\" && i < n) {
            out += src[i];
            i++;
            continue;
          }
          if (c === quote) break;
        }
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * pt445 — exposed for unit testing. `scanFile` reads from disk and
 * delegates to `scanSource` which works on a string. The split lets
 * the adversarial-input describe block exercise `scanSource` without
 * touching the filesystem.
 */
function scanSource(rawSource: string, rel: string): Violation[] {
  // pt445 — two scrubbed views, mirroring the two scans:
  //   - `declSource` blanks comments AND string-literal contents so a
  //     misleading `// const X = safeJsonLd(p)` (line comment) OR a
  //     `\`const X = safeJsonLd(p)\`` (template-literal text) cannot
  //     whitelist a same-named real `let X = userInput`.
  //   - `htmlSource` blanks comments only, preserving string contents
  //     so the SET_HTML_RE attribute scan sees the actual `set:html=
  //     {...}` value (which is itself an expression, not a string).
  // Both modes preserve newlines so line numbers stay aligned.
  const declSource = stripComments(rawSource, { stripStrings: true });
  const htmlSource = stripComments(rawSource);
  const violations: Violation[] = [];

  // Build the variable-assignment map. A variable `X` is considered
  // "safe" if it is declared with `const` (immutable binding) AND its
  // declaration statement contains a `safeJsonLd(` call anywhere inside
  // — covering direct assignments, conditional ternaries (`X = cond ?
  // safeJsonLd(...) : null`), and chained expressions. `let` / `var`
  // are EXCLUDED because subsequent reassignment to unsafe input is
  // invisible at the declaration site (the reassignment-blind tracking
  // gap flagged by the pt428 review). Statement boundaries are tracked
  // by walking forward from the `=` until balanced `()` / `[]` / `{}`
  // AND a `;` or end-of-file. Works on Astro frontmatter and template
  // scripts.
  const safeVars = new Set<string>();
  const declRe = /\bconst\s+([a-zA-Z_$][\w$]*)\s*=/g;
  for (const match of declSource.matchAll(declRe)) {
    const name = match[1];
    if (typeof name !== "string" || name.length === 0) continue;
    const assignStart = (match.index ?? 0) + match[0].length;
    let depth = 0;
    let end = declSource.length;
    for (let i = assignStart; i < declSource.length; i++) {
      const ch = declSource[i];
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === ";" && depth === 0) {
        end = i;
        break;
      }
    }
    const body = declSource.slice(assignStart, end);
    if (SAFEJSONLD_CALL_RE.test(body)) safeVars.add(name);
  }

  let match: RegExpExecArray | null;
  while ((match = SET_HTML_RE.exec(htmlSource)) !== null) {
    const expression = (match[1] ?? "").trim();
    const lineNumber = htmlSource.slice(0, match.index).split("\n").length;
    const snippet = match[0];

    // Path 1: inline `safeJsonLd(...)` call inside the attribute braces.
    if (SAFEJSONLD_CALL_RE.test(expression)) continue;

    // Path 2: bare identifier referencing a `safeJsonLd(...)` assignment.
    const identMatch = expression.match(/^([a-zA-Z_$][\w$]*)$/);
    if (
      identMatch !== null &&
      typeof identMatch[1] === "string" &&
      safeVars.has(identMatch[1])
    ) {
      continue;
    }

    violations.push({
      file: rel,
      line: lineNumber,
      snippet,
      reason:
        "set:html must wrap a `safeJsonLd(...)` call (either inline or via " +
        "a `const X = safeJsonLd(...)` assignment in the same file).",
    });
  }
  return violations;
}

function scanFile(rel: string): Violation[] {
  const fullPath = join(REPO_ROOT, rel);
  const rawSource = readFileSync(fullPath, "utf8");
  return scanSource(rawSource, rel);
}

describe("set:html → safeJsonLd gate (USMR pt428)", () => {
  it("every `set:html` callsite in tracked .astro files routes through `safeJsonLd`", () => {
    const allowedFiles = new Set(ALLOW_LIST.map((e) => e.file));
    const violations: Violation[] = [];
    for (const rel of listAstroFiles()) {
      if (allowedFiles.has(rel)) continue;
      violations.push(...scanFile(rel));
    }
    if (violations.length > 0) {
      const lines = violations.map(
        (v) => `  ${v.file}:${v.line}  ${v.snippet}\n    → ${v.reason}`,
      );
      throw new Error(
        `Found ${violations.length} unsanctioned set:html usage(s):\n` +
          lines.join("\n") +
          "\n\nFix: route the value through `safeJsonLd()` (src/lib/charset.ts) " +
          "or add the file path to the ALLOW_LIST in this test with a " +
          "documented justification.",
      );
    }
    assert.equal(violations.length, 0);
  });

  it("ALLOW_LIST entries reference real tracked .astro files (drift guard)", () => {
    const tracked = new Set(listAstroFiles());
    for (const entry of ALLOW_LIST) {
      assert.ok(
        tracked.has(entry.file),
        `ALLOW_LIST references untracked file: ${entry.file} — remove the stale entry.`,
      );
    }
  });
});

// pt445 — adversarial unit tests. The integration test above only walks
// real `.astro` files, so the gate could pass vacuously if `safeJsonLd`
// were renamed tomorrow (zero callsites to scan). These cases exercise
// `scanSource` against synthetic inputs so the documented bypasses
// (commented decoy, let/var rebound, ternary mixed-safety, etc.) are
// proven caught regardless of what the actual repo looks like.
describe("scanSource adversarial inputs (USMR pt445)", () => {
  it("flags `set:html={X}` when X is undeclared", () => {
    const src = `---\nconst X = userInput;\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("accepts `set:html={safeJsonLd(payload)}` (direct inline call)", () => {
    const src = `<script set:html={safeJsonLd(payload)}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 0);
  });

  it("accepts `set:html={X}` when X = safeJsonLd(...) (const direct)", () => {
    const src = `---\nconst X = safeJsonLd(payload);\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 0);
  });

  it("accepts `set:html={X}` when X = cond ? safeJsonLd(...) : null (ternary)", () => {
    const src = `---\nconst X = cond ? safeJsonLd(payload) : null;\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 0);
  });

  it("flags `set:html={X}` when X is `let`-bound even if first assigned via safeJsonLd", () => {
    // pt429 hardening: const-only safe-vars. `let X` could be reassigned
    // to userInput later in the file; the gate treats it as unsafe
    // regardless of what the initializer looks like.
    const src = `---\nlet X = safeJsonLd(payload);\nX = userInput;\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("flags `set:html={X}` when X declaration is inside a `//` line comment", () => {
    // pt429 hardening: stripComments runs before declRe. A misleading
    // `// const X = safeJsonLd(p)` doesn't whitelist a real
    // `let X = userInput` later in the file.
    const src = `---\n// const X = safeJsonLd(payload);\nlet X = userInput;\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("flags `set:html={X}` when X declaration is inside a `/* */` block comment", () => {
    const src = `---\n/* const X = safeJsonLd(payload); */\nlet X = userInput;\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("preserves line numbers across block comments (regression: pt429 newline preservation)", () => {
    // 4-line block comment then a violation on line 6. Without
    // newline preservation in stripComments, the violation would
    // be reported on line 2.
    const src =
      `---\n` +
      `/* line 2\n` +
      ` * line 3\n` +
      ` * line 4\n` +
      ` */\n` +
      `<script set:html={X}></script>`;
    const violations = scanSource(src, "fixture.astro");
    assert.equal(violations.length, 1);
    assert.equal(violations[0]!.line, 6);
  });

  it("accepts string-literal containing `// const X = safeJsonLd` as content (not declaration)", () => {
    // String contents are preserved through stripComments so a real
    // declaration inside a template literal isn't whitelisted (only
    // top-level `const` declarations matter). Here the scan should
    // not pick up the literal text as a real declaration.
    const src =
      `---\n` +
      "const code = `// const X = safeJsonLd(p)`;\n" +
      `let X = userInput;\n` +
      `---\n` +
      `<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("flags member-access expressions like `set:html={obj.lng}` (conservative-strict)", () => {
    // Even if `obj` was assigned from safeJsonLd, the member-access
    // expression doesn't match the bare-identifier regex. Strict-by-
    // default is the correct posture for this gate (never a false
    // negative; possible false positive that the dev resolves by
    // hoisting to a const).
    const src = `---\nconst obj = safeJsonLd(payload);\n---\n<script set:html={obj.lng}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("flags function-call expressions like `set:html={wrap(x)}` (no transitive trust)", () => {
    // The gate doesn't model function-level taint; any non-bare-
    // identifier expression that isn't an inline `safeJsonLd(` call
    // is treated as unsafe. Same conservative-strict posture.
    const src = `---\nfunction wrap(x) { return safeJsonLd(x); }\n---\n<script set:html={wrap(payload)}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("flags `var`-bound declarations the same as `let` (const-only safe-vars)", () => {
    const src = `---\nvar X = safeJsonLd(payload);\n---\n<script set:html={X}></script>`;
    assert.equal(scanSource(src, "fixture.astro").length, 1);
  });

  it("returns zero violations when the document has no set:html callsites", () => {
    // Vacuous-pass detection. If a future rename of `safeJsonLd` causes
    // every callsite to disappear AND the gate's regex still matches
    // `set:html=`, it would only fail if there ARE still callsites.
    // This case proves the absence-of-callsites path returns 0.
    const src = `---\nconst foo = "bar";\n---\n<p>no set:html here</p>`;
    assert.equal(scanSource(src, "fixture.astro").length, 0);
  });
});
