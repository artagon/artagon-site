// USMR Phase 5.5.16-pt161 — `<link rel="icon"|"apple-touch-icon">`
// `sizes` attr must match the actual referenced PNG's pixel
// dimensions.
//
// Pre-pt161 SeoIcons.astro had two misdeclared link tags:
//   <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-128.png">
//   <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-180.png">
// Both `sizes` attrs lied about the file's actual pixel dimensions
// (128x128 and 180x180 respectively). Browsers + iOS scale the
// image when the declared size differs from the actual dimensions,
// AND log console warnings.
//
// pt161 dropped both misdeclared entries (the canonical 180x180
// apple-touch-icon is what every modern iOS device uses; smaller
// devices scale it down cleanly). This gate asserts every
// remaining declared icon size matches reality, so any future
// addition with a misdeclared size trips the gate at build time.
//
// The gate runs against the BUILT HTML in `.build/dist/**/*.html`
// (so it sees what actually ships) AND reads the referenced PNG's
// IHDR chunk to extract real dimensions (no third-party image
// libs — IHDR is a fixed 8-byte width+height field at offset 16
// of every PNG).

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, ".build", "dist");

// Read PNG IHDR width+height (offset 16, big-endian uint32 each).
// Returns null if the file isn't a valid PNG (e.g. .ico, .svg).
function pngDimensions(path: string): { w: number; h: number } | null {
  if (!existsSync(path)) return null;
  if (!path.endsWith(".png")) return null;
  try {
    const buf = readFileSync(path);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A — verify before reading
    // dimensions, otherwise we'd return garbage for non-PNG bytes.
    if (
      buf[0] !== 0x89 ||
      buf[1] !== 0x50 ||
      buf[2] !== 0x4e ||
      buf[3] !== 0x47
    ) {
      return null;
    }
    return {
      w: buf.readUInt32BE(16),
      h: buf.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

interface Finding {
  file: string;
  href: string;
  declared: string;
  actual: string;
}

describe("icon <link sizes> match referenced file dimensions (pt161)", () => {
  test("every <link rel='icon|apple-touch-icon' sizes='WxH' href> has WxH matching the file's PNG dimensions", () => {
    if (!existsSync(DIST)) {
      console.warn(
        `lint-icon-sizes-match: ${DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const findings: Finding[] = [];
    // We only need to scan ONE built page — every page renders
    // the same SeoIcons output via BaseLayout's <slot name="head">.
    // Scanning all pages would multiply findings without adding
    // coverage. Index is the canonical scan target.
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const re =
      /<link\b(?=[^>]*\brel=["'](?:icon|apple-touch-icon)["'])[^>]*\bsizes=["'](\d+)x(\d+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const [, dW, dH, href] = m;
      const localPath = href!.startsWith("/")
        ? join(DIST, href!.slice(1))
        : null;
      if (!localPath) continue; // External icon; skip
      const dims = pngDimensions(localPath);
      if (!dims) continue; // Not a PNG; skip
      const declared = `${dW}x${dH}`;
      const actual = `${dims.w}x${dims.h}`;
      if (declared !== actual) {
        findings.push({
          file: relative(ROOT, localPath),
          href: href!,
          declared,
          actual,
        });
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map(
          (f) =>
            `${f.href} — declared sizes="${f.declared}" but file ${f.file} is ${f.actual}`,
        )
        .join("\n");
      throw new Error(
        `Found ${findings.length} <link> sizes mismatch${
          findings.length === 1 ? "" : "es"
        }:\n${lines}`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
