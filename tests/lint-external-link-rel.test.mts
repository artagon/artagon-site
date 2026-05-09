// USMR Phase 5.5.16-pt132 — external-link rel-attribute gate.
//
// DESIGN.md §9.4 mandates: every `<a target="_blank">` element MUST
// carry `rel` containing BOTH `noopener` AND `noreferrer`. The
// noopener attribute prevents the new tab from accessing
// `window.opener` (a known XSS / phishing vector); noreferrer
// suppresses Referer + opener access in legacy browsers. Without
// these, `target="_blank"` is a documented security regression
// class. The §9.4 entry says the contract is "verified via
// automated lint" — but no such gate existed before pt132. This
// test closes the gap.
//
// Scope: every .astro file in src/ (the production HTML source).
// React .tsx files render via JSX runtime where attributes are
// programmatic; in this codebase they don't author target="_blank"
// directly, so the .astro scan is sufficient.
//
// Allow-list: a per-line `<!-- lint-external-link-rel: ok -->`
// HTML comment lets a future contributor mark a deliberate exception
// (e.g. an opaque iframe host that requires opener access). Set the
// marker on the same line as the `target="_blank"` attribute.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".astro")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

// Find every <a> / <area> / <form> tag that uses target="_blank" and
// verify it has rel containing both `noopener` AND `noreferrer`. The
// rel attribute may be on a sibling line within the same tag, so the
// scanner walks the tag's full source range (open `<` → close `>`).
function findMissingRel(body: string, rel: string): Finding[] {
  const findings: Finding[] = [];
  // Match each opening tag start (`<a` / `<area` / `<form`) up to its
  // closing `>` — handles multi-line attribute lists.
  const tagRe = /<(a|area|form)\b[\s\S]*?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    const tag = m[0];
    if (!/target=["']_blank["']/.test(tag)) continue;
    // Allow-list opt-out via inline HTML comment.
    if (/lint-external-link-rel:\s*ok/i.test(tag)) continue;
    const relMatch = tag.match(/\brel=["']([^"']+)["']/);
    const relValue = relMatch?.[1] ?? "";
    const tokens = relValue.split(/\s+/);
    const hasNoopener = tokens.includes("noopener");
    const hasNoreferrer = tokens.includes("noreferrer");
    if (hasNoopener && hasNoreferrer) continue;
    const before = body.slice(0, m.index);
    const line = before.split("\n").length;
    const reason = !relMatch
      ? "missing rel attribute"
      : !hasNoopener && !hasNoreferrer
        ? "rel missing both noopener AND noreferrer"
        : !hasNoopener
          ? "rel missing noopener"
          : "rel missing noreferrer";
    findings.push({
      file: rel,
      line,
      snippet: tag.replace(/\s+/g, " ").trim().slice(0, 100),
      reason,
    });
  }
  return findings;
}

describe("external-link rel-attribute (DESIGN.md §9.4)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered .astro files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("every <a target=\"_blank\"> carries rel='noopener noreferrer'", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findMissingRel(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map((f) => `${f.file}:${f.line} — ${f.reason}\n    ${f.snippet}`)
        .join("\n");
      throw new Error(
        `Found ${all.length} <a target="_blank"> element${
          all.length === 1 ? "" : "s"
        } without proper rel:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
