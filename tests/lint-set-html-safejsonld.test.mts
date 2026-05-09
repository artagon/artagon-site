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
function stripComments(src: string): string {
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
    // String / template literal — copy verbatim, respect escapes
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
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
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function scanFile(rel: string): Violation[] {
  const fullPath = join(REPO_ROOT, rel);
  const rawSource = readFileSync(fullPath, "utf8");
  // Strip comments before declaration scan so a misleading commented-out
  // `// const X = safeJsonLd(p)` cannot whitelist a same-named real
  // declaration as `let X = userInput`. Set:html scan still uses the raw
  // source so violation line numbers are unaffected.
  const source = stripComments(rawSource);
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
  for (const match of source.matchAll(declRe)) {
    const name = match[1];
    if (typeof name !== "string" || name.length === 0) continue;
    const assignStart = (match.index ?? 0) + match[0].length;
    let depth = 0;
    let end = source.length;
    for (let i = assignStart; i < source.length; i++) {
      const ch = source[i];
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === ";" && depth === 0) {
        end = i;
        break;
      }
    }
    const body = source.slice(assignStart, end);
    if (SAFEJSONLD_CALL_RE.test(body)) safeVars.add(name);
  }

  let match: RegExpExecArray | null;
  while ((match = SET_HTML_RE.exec(source)) !== null) {
    const expression = (match[1] ?? "").trim();
    const lineNumber = source.slice(0, match.index).split("\n").length;
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
