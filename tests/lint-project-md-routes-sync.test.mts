// USMR Phase 5.5.16-pt216 — `openspec/project.md` live-routes
// list vs `src/pages/` filesystem sync gate.
//
// `openspec/project.md` declares the project's live route list
// — the OpenSpec CLI consumes this as ground truth for "what
// routes exist." When `src/pages/` adds or removes a route, the
// doc MUST move in lockstep. Otherwise:
//   - Agents trust an outdated route inventory and miss new
//     pages or recommend deleted ones.
//   - The "routes added by USMR" narrative becomes wrong as
//     more routes ship.
//
// pt215 expanded the line-35 list from a partial 17-route
// enumeration to all 22 live routes (post-USMR-Phase-5.x). It
// also fixed a tense drift ("USMR adds: ..." in present tense
// for routes already shipped). pt216 caught a count
// discrepancy in pt215's prose ("21 total" but the list had
// 22 entries) and locks the contract here.
//
// Same documentation-vs-implementation drift class as the
// pt212/213/214 version-claim gates, but anchored to
// filesystem reality (`src/pages/**/*.{astro,xml.ts}`) rather
// than `package.json` / `.nvmrc`.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PROJECT_MD = join(ROOT, "openspec", "project.md");
const PAGES_DIR = join(ROOT, "src", "pages");

function walk(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    // Astro routes: .astro files generate HTML pages; .xml.ts /
    // .json.ts / etc. generate API endpoints.
    else if (/\.(astro|xml\.ts|json\.ts)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

function fileToRoute(fileAbs: string): string {
  let r = fileAbs.replace(PAGES_DIR, "");
  // Endpoint files keep their `.xml` / `.json` extension in the
  // generated URL: `feed.xml.ts` → `/writing/feed.xml`.
  r = r.replace(/\.astro$/, "").replace(/\.ts$/, "");
  if (r === "/index") return "/";
  if (r.endsWith("/index")) return r.slice(0, -"/index".length);
  return r;
}

describe("openspec/project.md live-routes vs src/pages/ (pt216)", () => {
  test("the live-routes list in project.md matches src/pages/ filesystem reality", () => {
    expect(existsSync(PROJECT_MD), "openspec/project.md must exist").toBe(true);
    expect(existsSync(PAGES_DIR), "src/pages/ must exist").toBe(true);
    expect(statSync(PAGES_DIR).isDirectory()).toBe(true);

    // Parse the route list from project.md. The relevant line
    // looks like: "- `src/pages/` route pages (Astro). Live
    // routes (N total post-USMR-Phase-5.x): `/`, `/platform`,
    // ..."
    const body = readFileSync(PROJECT_MD, "utf8");
    const lineMatch = body.match(
      /Live routes \((\d+) total[^:]*:\s*([\s\S]*?)\.\s*The `/,
    );
    if (!lineMatch) {
      throw new Error(
        `openspec/project.md must contain a "Live routes (N total ...): ..." line`,
      );
    }
    const claimedCount = parseInt(lineMatch[1]!, 10);
    const cited = new Set<string>();
    for (const m of lineMatch[2]!.matchAll(/`([^`]+)`/g)) {
      cited.add(m[1]!);
    }

    // Enumerate live routes from filesystem.
    const files: string[] = [];
    walk(PAGES_DIR, files);
    const onDisk = new Set<string>(files.map((f) => fileToRoute(f)));

    // Bidirectional comparison.
    const inDocOnly = [...cited].filter((r) => !onDisk.has(r)).sort();
    const onDiskOnly = [...onDisk].filter((r) => !cited.has(r)).sort();

    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Routes on disk but missing from openspec/project.md: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Routes in openspec/project.md with no matching src/pages/ file: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `Live-routes list drift:\n${lines.join("\n")}\nFix: update openspec/project.md line 35 to enumerate ALL src/pages/ routes — keep the count in sync too (currently claims ${claimedCount} total).`,
      );
    }

    // Count check (the count in the prose must match the
    // backticked-route count).
    if (claimedCount !== cited.size) {
      throw new Error(
        `openspec/project.md claims ${claimedCount} live routes but the backticked list has ${cited.size} entries.\nFix: update the count in the prose to match the actual list size.`,
      );
    }

    // And the count MUST match the filesystem.
    if (claimedCount !== onDisk.size) {
      throw new Error(
        `openspec/project.md claims ${claimedCount} live routes but src/pages/ has ${onDisk.size}.\nFix: update both the count and the list to match filesystem reality.`,
      );
    }

    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
    expect(claimedCount).toBe(onDisk.size);
  });
});
