// USMR Phase 5.5.16-pt267 — README.md Build Scripts ordered list
// vs `package.json` `postbuild` script chain sync gate.
//
// pt266 found the README's `### Build Scripts` subsection
// enumerated only 2 scripts (sri.mjs, csp.mjs) when the
// `package.json:39` postbuild chain runs 10 ordered steps. The
// pt266 fix expanded the section to a 10-step ordered list
// matching the postbuild chain exactly.
//
// pt267 ships the gate that prevents that drift from re-
// occurring. The gate parses `package.json`'s `scripts.postbuild`
// command-string, extracts the ordered sequence of `npm run X` /
// `node scripts/X.mjs` invocations, and asserts every step
// appears in the README's Build Scripts ordered list.
//
// Sibling of:
//   - pt184 / pt255 / pt263 — sync gates that compare doc lists
//     against disk-derived references (AGENTS.md OpenSpec
//     changes row, openspec/config.yaml In-flight block,
//     README CI/CD workflows section).
//   - pt258 — sync gate over source-comment archive paths.
//
// Coverage gap closed: README's Build Scripts ordered list vs
// the canonical postbuild chain in `package.json`. The full
// `scripts/` directory listing is NOT gated — pt266 commit
// narrative explicitly noted that a "every script must be
// cited" gate would over-match on internal helpers.
//
// Scope:
//   - Files scanned: `package.json` (read `scripts.postbuild`),
//     `README.md` (locate Build Scripts ordered list).
//   - Reference shape: README ordered-list items in the form
//     "1. `verify:prerequisites` — ..." or
//     "5. `sri.mjs` — ..." (numbered list with backticked step
//     name as the first token).
//   - Validation: every postbuild step name MUST appear in the
//     README ordered list, in the same relative order. The
//     "name" is the npm script name (`verify:prerequisites`)
//     for `npm run X` invocations OR the bare filename
//     (`sri.mjs`) for `node scripts/X.mjs` invocations.
//
// HISTORICAL_ALLOW: postbuild step names that are intentionally
// described under a different label in the README. None today.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PACKAGE_JSON = join(ROOT, "package.json");
const README = join(ROOT, "README.md");

// Step names whose README description uses a different identifier
// than their postbuild invocation. Format: `<canonical-name>:
// <readme-citation>`. None today.
const HISTORICAL_ALIASES = new Map<string, string>([
  // Example shape: ["verify:font-self-hosting", "verify-font-self-hosting"]
]);

interface PostbuildStep {
  /** Canonical step identifier as it appears in the postbuild
   *  command string (e.g. `verify:prerequisites` or `sri.mjs`). */
  readonly name: string;
  /** True for `npm run X` invocations; false for `node scripts/X.mjs`. */
  readonly isNpmScript: boolean;
}

function parsePostbuildChain(packageJsonBody: string): PostbuildStep[] {
  const pkg = JSON.parse(packageJsonBody) as {
    scripts?: { postbuild?: string };
  };
  const chain = pkg.scripts?.postbuild;
  if (!chain) {
    throw new Error(
      `package.json: scripts.postbuild not found. The pt267 gate expects a postbuild chain to validate against the README.`,
    );
  }
  const out: PostbuildStep[] = [];
  // Split on `&&` (the chain separator). Each invocation is
  // either `npm run <name>` or `node scripts/<name>.mjs`.
  const steps = chain.split(/\s*&&\s*/);
  for (const raw of steps) {
    const s = raw.trim();
    if (!s) continue;
    let m;
    if ((m = s.match(/^npm\s+run\s+([a-z][a-z0-9:_-]+)\b/))) {
      out.push({ name: m[1]!, isNpmScript: true });
    } else if ((m = s.match(/^node\s+scripts\/([a-z][a-z0-9.\-]+\.mjs)\b/))) {
      out.push({ name: m[1]!, isNpmScript: false });
    } else {
      throw new Error(
        `package.json: postbuild step has unrecognized shape: "${s}". Expected "npm run X" or "node scripts/X.mjs".`,
      );
    }
  }
  return out;
}

function findReadmeBuildScriptsList(body: string): string {
  // Locate the `### Build Scripts` subsection inside the
  // `## Scripts & Utilities` section. Capture lines until the
  // next `### ` (or `## `) header.
  const startRe = /^###\s+Build\s+Scripts\s*$/m;
  const start = body.search(startRe);
  if (start === -1) {
    throw new Error(
      `README.md: "### Build Scripts" header not found. The pt267 gate locates the section by this verbatim header.`,
    );
  }
  const after = body.slice(start);
  // Find the next `### ` or `## ` header AFTER our own.
  const nextHeader = after.slice(2).search(/^(###|##)\s+\S/m);
  const end = nextHeader === -1 ? after.length : nextHeader + 2;
  return after.slice(0, end);
}

function extractCitedStepsInOrder(buildScriptsSection: string): string[] {
  // Match numbered-list items of shape `<digit>. \`<step-name>\` —`
  // (the pt266 fix used this exact shape). The captured group is
  // the backticked step name.
  const out: string[] = [];
  const re = /^\s*\d+\.\s+`([^`]+)`/gm;
  let m;
  while ((m = re.exec(buildScriptsSection)) !== null) {
    out.push(m[1]!);
  }
  return out;
}

describe("README Build Scripts vs package.json postbuild (pt267)", () => {
  test("package.json postbuild script exists and parses", () => {
    expect(existsSync(PACKAGE_JSON), "package.json must exist").toBe(true);
    const body = readFileSync(PACKAGE_JSON, "utf8");
    const chain = parsePostbuildChain(body);
    expect(chain.length, "postbuild chain must have ≥1 step").toBeGreaterThan(
      0,
    );
  });

  test("every postbuild step is cited in README Build Scripts ordered list", () => {
    const pkgBody = readFileSync(PACKAGE_JSON, "utf8");
    const chain = parsePostbuildChain(pkgBody);
    const expectedNames = chain.map(
      (s) => HISTORICAL_ALIASES.get(s.name) ?? s.name,
    );

    const readmeBody = readFileSync(README, "utf8");
    const section = findReadmeBuildScriptsList(readmeBody);
    const citedRaw = extractCitedStepsInOrder(section);
    // Allow citations to use either the canonical name or its alias.
    const cited = citedRaw.map((c) => {
      // Reverse-lookup: if the cited token IS an alias, normalize
      // to the canonical name before comparison.
      for (const [canonical, alias] of HISTORICAL_ALIASES.entries()) {
        if (c === alias) return canonical;
      }
      return c;
    });

    // For ordered comparison: take the first N cited items where
    // N = chain.length, and assert they match the chain order. Any
    // extra items at the end of the README list (e.g.
    // "non-postbuild support scripts" subsection) are out of scope
    // — the gate locates the Build Scripts section header, not the
    // sibling "support scripts" enumeration.
    const drifts: string[] = [];
    for (let i = 0; i < chain.length; i++) {
      const expected = chain[i]!.name;
      const actual = cited[i];
      if (actual !== expected) {
        drifts.push(
          `Step ${i + 1}: expected \`${expected}\` (per package.json postbuild chain), README cites \`${actual ?? "<missing>"}\``,
        );
      }
    }

    // Also flag any postbuild step entirely absent from the
    // README (separate signal from "wrong order").
    const citedSet = new Set(cited);
    const expectedSet = new Set(expectedNames);
    const missing = [...expectedSet].filter((n) => !citedSet.has(n)).sort();

    if (drifts.length || missing.length) {
      const lines: string[] = [];
      if (missing.length) {
        lines.push(
          `Postbuild steps missing from README Build Scripts list: ${missing.join(", ")}`,
        );
      }
      if (drifts.length) {
        lines.push("Order drift:");
        for (const d of drifts) lines.push(`  - ${d}`);
      }
      throw new Error(
        `README Build Scripts ordered list vs package.json postbuild chain drift:\n${lines.join("\n")}\nFix:\n  - Update README's "### Build Scripts" ordered list to match \`package.json:scripts.postbuild\` step-for-step\n  - If a step is intentionally cited under a different label, add the alias to HISTORICAL_ALIASES with a documented rationale`,
      );
    }
  });
});
