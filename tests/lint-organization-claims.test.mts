// USMR Phase 5.5.16-pt187 — `src/data/organization.ts` contact-claim gate.
//
// `ORG.contactFootnote` and other free-text fields in
// `src/data/organization.ts` are surfaced to users on the home
// on-ramp card and (eventually) `/security`, the footer, and
// JSON-LD. Strings that promise an on-disk resource ("PGP key at
// X", "policy at .well-known/Y", "doc at /Z") MUST point to real
// artifacts. Otherwise the surfaced contract is false and visitors
// get a 404 — or worse, security researchers don't find a key
// where the page says one lives.
//
// Pre-pt187 `ORG.contactFootnote` claimed:
//   "PGP key & security disclosure policy at artagon.com/.well-known"
// Two drifts:
//   1. No PGP/GPG key material anywhere in `public/` or
//      `src/` (verified by `rtk rg -l 'PGP|pgp|gpg' src/ public/`).
//      `.well-known/` only contains `security.txt`.
//   2. The disclosure policy lives at `/security` (the Astro page);
//      `.well-known/security.txt` is the discovery endpoint that
//      routes there via its `Policy:` field. The footnote conflated
//      the two locations.
//
// Same documentation-vs-implementation drift class as pt178
// (openspec spec `public/favicon.svg`), pt179 (AGENTS.md
// `tests/screen-reader.spec.ts` Phase-6 prose), pt180 (README.md
// `LogoVariants.astro` after pt72 deletion), pt181 (CONTRIBUTING.md
// `openspec/AGENTS.md` ghost path) — but scoped to user-visible
// runtime data, not docs.
//
// pt187 corrected the footnote and locks the contract here. The
// gate scans `ORG.contactFootnote` for strings that name a
// security/identity primitive ("PGP key", "GPG key") and asserts
// a corresponding artifact exists; AND for `.well-known/X` paths
// and asserts each named file exists.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ORG_FILE = join(ROOT, "src", "data", "organization.ts");

describe("organization.ts contact-claim gate (pt187)", () => {
  test("ORG.contactFootnote may not claim PGP/GPG keys without on-disk material", () => {
    expect(existsSync(ORG_FILE), "src/data/organization.ts must exist").toBe(
      true,
    );
    const body = readFileSync(ORG_FILE, "utf8");

    // Extract ORG.contactFootnote string literal. The field is
    // `contactFootnote: "..."` or `contactFootnote: '...'`.
    const m = body.match(/contactFootnote\s*:\s*([`"'])([\s\S]*?)\1[\s,}]/);
    if (!m) {
      // The field is optional; absence is not drift.
      return;
    }
    const footnote = m[2]!;

    // Claim 1: PGP/GPG key promise.
    if (/\b(?:PGP|GPG)\s+key\b/i.test(footnote)) {
      // Look for any on-disk key material under public/ or
      // .well-known/. Conventional filenames: pgp-key.txt,
      // public-key.asc, *.gpg, *.asc, *.pgp.
      const candidates: string[] = [];
      const wellKnown = join(ROOT, "public", ".well-known");
      if (existsSync(wellKnown)) {
        for (const entry of readdirSync(wellKnown)) {
          if (/\.(asc|pgp|gpg)$/i.test(entry) || /pgp|gpg/i.test(entry)) {
            candidates.push(`public/.well-known/${entry}`);
          }
        }
      }
      const pubDir = join(ROOT, "public");
      if (existsSync(pubDir)) {
        for (const entry of readdirSync(pubDir)) {
          if (/\.(asc|pgp|gpg)$/i.test(entry)) {
            candidates.push(`public/${entry}`);
          }
        }
      }
      if (candidates.length === 0) {
        throw new Error(
          `ORG.contactFootnote claims "PGP/GPG key" but no key material exists under public/ or public/.well-known/.\n` +
            `Footnote: ${JSON.stringify(footnote)}\n` +
            `Fix one of:\n` +
            `  - Author a PGP/GPG public-key file under public/.well-known/\n` +
            `  - Remove the "PGP key" / "GPG key" claim from the footnote\n`,
        );
      }
    }

    // Claim 2: explicit `.well-known/X` path mentions.
    for (const pathMatch of footnote.matchAll(
      /\.well-known\/([a-z][a-z0-9._-]+)/gi,
    )) {
      const filename = pathMatch[1]!;
      const candidate = join(ROOT, "public", ".well-known", filename);
      if (!existsSync(candidate)) {
        throw new Error(
          `ORG.contactFootnote references \`.well-known/${filename}\` but no such file exists at public/.well-known/.\n` +
            `Footnote: ${JSON.stringify(footnote)}\n`,
        );
      }
    }
  });
});
