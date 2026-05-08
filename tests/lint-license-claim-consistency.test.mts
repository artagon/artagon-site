// USMR Phase 5.5.16-pt199 — Footer license claim vs README.md License
// section + LICENSE file presence sync gate.
//
// Two surfaces ship a license claim to public users:
//   1. README.md §"License" — the authoritative project doc.
//   2. `Footer.astro` — emitted on every built page.
//
// Pre-pt199 the two contradicted directly:
//   - README.md line 763: "Private repository - All rights reserved."
//   - Footer.astro line 115: "Built on Astro · Open-source core · Apache 2.0"
//
// Same fact (project license posture), opposite claims, both
// shipped to public users. Plus no LICENSE file at the repo root
// (the legally correct default with no LICENSE is "all rights
// reserved" per US copyright law) — so the README is correct
// and the Footer's "Apache 2.0" claim was aspirational.
//
// Same documentation-vs-implementation drift class as pt179
// (Phase-6 test claimed to drive but didn't), pt183
// (verify:design-md-telemetry claimed CI-wired but wasn't),
// pt188 (glossary.md slate after pt167 removal), pt195 (LHCI
// URLs benchmarking non-canonical forms). Different surface
// (legal positioning vs feature wiring) but same shape: one
// source of truth contradicts another.
//
// pt199 aligned the Footer with the README's authoritative claim
// — dropped "Open-source core · Apache 2.0" from the Footer
// stack span. Until/unless the project owner decides to ship as
// Apache 2.0 (which requires authoring a LICENSE file at repo
// root + updating README + updating package.json `license`),
// the Footer no longer makes a specific license assertion.
//
// This gate locks the contract:
//   - If the Footer claims a SPECIFIC SPDX-style license name
//     (`Apache 2.0`, `MIT`, `GPL-*`, `BSD-*`), the README License
//     section MUST cite the same name AND a LICENSE file MUST
//     exist at the repo root.
//   - If the Footer claims "All rights reserved", the README MUST
//     also say that (or be silent / generic).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FOOTER = join(ROOT, "src", "components", "Footer.astro");
const README = join(ROOT, "README.md");

// Specific license markers we care about.
const SPDX_LICENSES = ["Apache 2.0", "Apache-2.0", "MIT", "GPL", "BSD"];

function findInFooter(): string | null {
  const body = readFileSync(FOOTER, "utf8");
  // Look for the footer-stack span, which is where the license
  // claim lives.
  const m = body.match(/<span\s+class="footer-stack">([^<]+)<\/span>/);
  return m ? m[1]!.trim() : null;
}

function findInReadme(): string | null {
  const body = readFileSync(README, "utf8");
  const idx = body.indexOf("\n## License");
  if (idx === -1) return null;
  // Take the next non-empty line after the heading.
  const after = body.slice(idx + "\n## License".length);
  const m = after.match(/\n+([^\n]+)/);
  return m ? m[1]!.trim() : null;
}

function citesLicense(text: string, name: string): boolean {
  // Case-insensitive substring match. `name` is a license-name
  // marker (`Apache 2.0`, `MIT`, etc.).
  return new RegExp(
    `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  ).test(text);
}

describe("license-claim consistency (pt199)", () => {
  test("Footer license claim matches README License section + LICENSE file disk state", () => {
    expect(existsSync(FOOTER), "src/components/Footer.astro must exist").toBe(
      true,
    );
    expect(existsSync(README), "README.md must exist").toBe(true);

    const footerStack = findInFooter();
    if (!footerStack) {
      throw new Error(
        `Footer.astro must contain a <span class="footer-stack">...</span> with the license/build claim`,
      );
    }

    const readmeFirstLine = findInReadme() ?? "";

    // Identify which (if any) specific SPDX license the Footer
    // claims, the README cites, and the disk evidences.
    const footerSpecific = SPDX_LICENSES.find((n) =>
      citesLicense(footerStack, n),
    );
    const readmeSpecific = SPDX_LICENSES.find((n) =>
      citesLicense(readmeFirstLine, n),
    );

    if (footerSpecific) {
      // Footer claims a specific license — README must agree AND a
      // LICENSE file must exist.
      const hasLicenseFile =
        existsSync(join(ROOT, "LICENSE")) ||
        existsSync(join(ROOT, "LICENSE.md")) ||
        existsSync(join(ROOT, "LICENSE.txt"));

      const errors: string[] = [];
      if (readmeSpecific !== footerSpecific) {
        errors.push(
          `Footer claims "${footerSpecific}" but README §License first line is: ${JSON.stringify(readmeFirstLine)}`,
        );
      }
      if (!hasLicenseFile) {
        errors.push(
          `Footer claims "${footerSpecific}" but no LICENSE / LICENSE.md / LICENSE.txt exists at the repo root`,
        );
      }

      if (errors.length > 0) {
        throw new Error(
          `License-claim drift between Footer and README/disk:\n` +
            errors.map((e) => `  - ${e}`).join("\n") +
            `\nFix one of:\n` +
            `  - Drop the specific license from the Footer (defer to README's authoritative claim)\n` +
            `  - Update README §License to cite "${footerSpecific}" AND author a LICENSE file at repo root\n`,
        );
      }
    } else {
      // Footer makes no specific license claim. README may say
      // anything; no contradiction to check beyond presence.
      // Still require the Footer claim to be non-empty.
      expect(
        footerStack.length,
        "footer-stack must not be empty",
      ).toBeGreaterThan(0);
    }

    // Always assert: if the Footer says "All rights reserved",
    // the README must NOT cite a specific SPDX license (because
    // that would re-introduce the contradiction).
    if (
      /\ball rights reserved\b/i.test(footerStack) &&
      readmeSpecific !== undefined
    ) {
      throw new Error(
        `Footer says "All rights reserved" but README cites a specific license: "${readmeSpecific}".\n` +
          `Pick one: either both surfaces say "All rights reserved" (no LICENSE) or both cite the same specific license (with LICENSE file).`,
      );
    }
  });
});
