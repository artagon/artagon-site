// USMR Phase 5.5.16-pt172 — security.txt root + .well-known sync.
//
// RFC 9116 §3 specifies two locations for security.txt:
//   1. /.well-known/security.txt (PRIMARY — required)
//   2. /security.txt              (LEGACY  — fallback)
//
// Both must contain the same content. pt157 caught a drift where
// both files shipped `Policy: https://www.artagon.com/security`
// (wrong subdomain — site uses bare `artagon.com`). Both fixed in
// the same commit. This gate ensures the two copies stay in sync
// going forward — if a future contributor edits one but not the
// other, RFC 9116-compliant security scanners that check the
// PRIMARY location and legacy scanners that check ROOT will
// receive different policy URLs, triggering inconsistency flags.

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

describe("security.txt root + .well-known sync (pt172)", () => {
  test("public/security.txt and public/.well-known/security.txt are byte-identical", () => {
    const rootPath = join(ROOT, "public", "security.txt");
    const wellKnownPath = join(ROOT, "public", ".well-known", "security.txt");

    expect(existsSync(rootPath), "public/security.txt must exist").toBe(true);
    expect(
      existsSync(wellKnownPath),
      "public/.well-known/security.txt must exist (RFC 9116 §3 PRIMARY)",
    ).toBe(true);

    const rootBody = readFileSync(rootPath, "utf8");
    const wellKnownBody = readFileSync(wellKnownPath, "utf8");

    // Byte-equality. The two files MUST contain the exact same
    // policy / contact / expires content; any divergence sends
    // mixed signals to security-scanning tools (some check
    // /.well-known/security.txt per RFC 9116; some legacy tools
    // check /security.txt).
    expect(
      rootBody,
      "security.txt root + .well-known must be byte-identical",
    ).toBe(wellKnownBody);
  });
});
