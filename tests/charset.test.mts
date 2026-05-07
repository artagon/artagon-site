import { describe, expect, test } from "vitest";
import { safeJsonLd } from "../src/lib/charset.ts";

// Adversarial security tests for src/lib/charset.ts.
//
// `safeJsonLd` is the only path inline JSON-LD takes into shipped HTML.
// These cases exercise attacker-shaped payloads the underlying lib
// (`serialize-javascript`, isJSON: true) is supposed to neutralize —
// they are the contract the project depends on, not the lib's own
// internal tests. Imported directly via vitest so the wrapper itself
// (not just the lib boundary) is covered.
//
// References:
//   - OWASP XSS prevention cheat sheet (rule #3.1: JSON in HTML)
//   - Yahoo serialize-javascript advisory CVE-2019-16769 (UID predictability)
//   - V8 line-terminator handling: ECMA-262 §11.3

describe("safeJsonLd — adversarial security", () => {
  test("</script> in a string value is escaped (no early tag close)", () => {
    const payload = {
      "@type": "Organization",
      name: "Foo</script><img onerror=alert(1) src=x>",
    };
    const out = safeJsonLd(payload);
    expect(out).not.toMatch(/<\/script/i);
    expect(out).toMatch(/\\u003C\\u002Fscript/i);
  });

  test("HTML comment open <!-- in a string value is neutralized", () => {
    const payload = {
      "@type": "Organization",
      name: "<!--<script>alert(1)</script>-->",
    };
    const out = safeJsonLd(payload);
    expect(out).not.toContain("<!--");
  });

  test("U+2028 LINE SEPARATOR in a string value is escaped", () => {
    const ls = String.fromCharCode(0x2028);
    const payload = { description: `before${ls}after` };
    const out = safeJsonLd(payload);
    expect(out).not.toContain(ls);
    expect(out).toMatch(/\\u2028/);
  });

  test("U+2029 PARAGRAPH SEPARATOR in a string value is escaped", () => {
    const ps = String.fromCharCode(0x2029);
    const payload = { description: `before${ps}after` };
    const out = safeJsonLd(payload);
    expect(out).not.toContain(ps);
    expect(out).toMatch(/\\u2029/);
  });

  test("ampersand round-trips through reverse-replacement", () => {
    const payload = { description: "Tom & Jerry & Spike" };
    const out = safeJsonLd(payload);
    const parsed = JSON.parse(
      out
        .replace(/\\u003C/g, "<")
        .replace(/\\u003E/g, ">")
        .replace(/\\u002F/g, "/"),
    );
    expect(parsed.description).toBe("Tom & Jerry & Spike");
  });

  test("escape values are valid JSON (round-trip cleanly)", () => {
    const payload = {
      name: "Foo</script>",
      desc: `with U+2028 ${String.fromCharCode(0x2028)} and U+2029 ${String.fromCharCode(0x2029)}`,
      url: "https://example.com/path?q=1&r=2",
      nested: { tag: "<x onload=alert(1)>" },
      tags: ["</script>", "</style>", "<img onerror=alert(1)>"],
    };
    const out = safeJsonLd(payload);
    const reconstructed = out
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\u002F/g, "/")
      .replace(/\\u2028/g, String.fromCharCode(0x2028))
      .replace(/\\u2029/g, String.fromCharCode(0x2029));
    const parsed = JSON.parse(reconstructed);
    expect(parsed.name).toBe(payload.name);
    expect(parsed.desc).toBe(payload.desc);
    expect(parsed.nested.tag).toBe(payload.nested.tag);
    expect(parsed.tags).toEqual(payload.tags);
  });

  test("payload with null / empty / 0 / false preserves structure", () => {
    const payload = { a: null, b: "", c: 0, d: false };
    const out = safeJsonLd(payload);
    const parsed = JSON.parse(out);
    expect(parsed.a).toBeNull();
    expect(parsed.b).toBe("");
    expect(parsed.c).toBe(0);
    expect(parsed.d).toBe(false);
  });

  test("nested attacker strings remain inert", () => {
    const payload = {
      items: [
        { name: "</script><script>alert(1)</script>" },
        { name: `evil${String.fromCharCode(0x2028)}newline` },
        { name: "javascript:alert(1)" },
      ],
    };
    const out = safeJsonLd(payload);
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain(String.fromCharCode(0x2028));
  });

  test("attacker strings used as object KEYS are also escaped", () => {
    const payload: Record<string, string> = {};
    payload["</script>"] = "value";
    const out = safeJsonLd(payload);
    expect(out).not.toMatch(/<\/script/i);
  });

  test("very deep / very wide payloads neither crash nor explode", () => {
    let deep: unknown = "leaf</script>";
    for (let i = 0; i < 100; i++) deep = { wrap: deep };
    const wide = Array.from({ length: 1000 }, (_, i) => ({
      idx: i,
      evil: "</script>",
    }));
    const out = safeJsonLd({ deep, wide });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/<\/script/i);
  });

  test("output is JSON.parse-able without pre-processing", () => {
    const payload = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Artagon",
    };
    const out = safeJsonLd(payload);
    const parsed = JSON.parse(out);
    expect(parsed["@type"]).toBe("WebSite");
  });

  test("JSON.parse natively understands all emitted escape forms", () => {
    const payload = {
      less: "<",
      greater: ">",
      slash: "/",
      ls: String.fromCharCode(0x2028),
      ps: String.fromCharCode(0x2029),
    };
    const out = safeJsonLd(payload);
    const parsed = JSON.parse(out);
    expect(parsed.less).toBe("<");
    expect(parsed.greater).toBe(">");
    expect(parsed.slash).toBe("/");
    expect(parsed.ls).toBe(String.fromCharCode(0x2028));
    expect(parsed.ps).toBe(String.fromCharCode(0x2029));
  });

  test("double-pass is idempotent (no double-encoding of escapes)", () => {
    const payload = { url: "https://example.com/foo</script>" };
    const once = safeJsonLd(payload);
    const twice = safeJsonLd(JSON.parse(once));
    expect(once).toBe(twice);
  });

  test("function values are stripped under isJSON: true", () => {
    // Arbitrary-shape payload — `unknown` discriminated by lib behaviour.
    const payload: Record<string, unknown> = {
      name: "Foo",
      evil: () => "alert(1)",
    };
    const out = safeJsonLd(payload);
    expect(out).not.toContain("alert");
    expect(out).not.toContain("=>");
  });

  test("Date values stringify (no `new Date(...)` constructor leak)", () => {
    const payload = { datePublished: new Date("2026-05-07T00:00:00Z") };
    const out = safeJsonLd(payload);
    expect(out).not.toContain("new Date");
    expect(out).toMatch(/2026-05-07T00:00:00/);
  });
});
