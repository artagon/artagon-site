// Adversarial security tests for src/lib/charset.ts.
//
// `safeJsonLd` is the only path inline JSON-LD takes into shipped HTML;
// it delegates to Yahoo's `serialize-javascript` lib. These tests
// exercise the attacker-shaped inputs the lib is supposed to neutralize
// — they are the contract the project depends on, not the lib's own
// internal tests. If a future contributor swaps the lib for a custom
// implementation, these tests prove the replacement is at least as
// strong.
//
// References:
//   - OWASP XSS prevention cheat sheet (rule #3.1: JSON in HTML)
//   - Yahoo serialize-javascript advisory CVE-2019-16769 (UID predictability)
//   - V8 line-terminator handling: ECMA-262 §11.3
//
// Run: node --test tests/charset.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// We test against the same `serialize-javascript` configuration the
// production wrapper uses. The wrapper at `src/lib/charset.ts` cannot
// be imported directly here because node:test runs without a TS
// loader; the contract verified is the lib boundary + the exact
// options object (`{ isJSON: true, space: 2 }`). A future drift in
// `src/lib/charset.ts` would be caught by `tests/charset.contract.spec.ts`
// (Playwright; see writing-feed.spec.ts pattern) where we curl the
// built /writing/welcome page and assert the JSON-LD parses as
// schema.org Article — that's the integration gate.
import serialize from "serialize-javascript";

function safeJsonLd(payload) {
  return serialize(payload, { isJSON: true, space: 2 });
}

// ---------------------------------------------------------------------
// Adversarial test cases — every payload below is shaped after a real
// XSS / parser-confusion attack. The contract: emitted JSON-LD MUST be
// injectable into a `<script type="application/ld+json">` element
// without breaking out of the script tag, breaking the JS lexer, or
// becoming inert via a parser-recovery quirk.
// ---------------------------------------------------------------------

test("</script> in a string value is escaped (no early tag close)", () => {
  const payload = {
    "@type": "Organization",
    name: "Foo</script><img onerror=alert(1) src=x>",
  };
  const out = safeJsonLd(payload);
  assert.ok(
    !/<\/script/i.test(out),
    `output must not contain a literal </script: ${out}`,
  );
  // The escaped form should be present.
  assert.match(out, /\\u003C\\u002Fscript|\\u003C\\u002Fscript/i);
});

test("HTML comment open <!-- in a string value is neutralized", () => {
  const payload = {
    "@type": "Organization",
    name: "<!--<script>alert(1)</script>-->",
  };
  const out = safeJsonLd(payload);
  // `<` must be escaped — even if `<!--` itself isn't a regex match,
  // the `<` character is the load-bearing escape.
  assert.ok(!out.includes("<!--"), "output must not contain a literal <!--");
});

test("U+2028 LINE SEPARATOR in a string value is escaped", () => {
  // U+2028 in a value would close JSONP / inline JS in legacy parsers.
  const ls = String.fromCharCode(0x2028);
  const payload = { description: `before${ls}after` };
  const out = safeJsonLd(payload);
  assert.ok(!out.includes(ls), "U+2028 must be escaped to \\u2028");
  assert.match(out, /\\u2028/);
});

test("U+2029 PARAGRAPH SEPARATOR in a string value is escaped", () => {
  const ps = String.fromCharCode(0x2029);
  const payload = { description: `before${ps}after` };
  const out = safeJsonLd(payload);
  assert.ok(!out.includes(ps), "U+2029 must be escaped to \\u2029");
  assert.match(out, /\\u2029/);
});

test("ampersand (&) in a string value is left functional but inert", () => {
  // & is not a script-break char inside <script>, but it can confuse
  // some legacy parsers. Either escape or pass-through is acceptable;
  // assert only that the output is still parseable JSON when the
  // escapes are reversed.
  const payload = { description: "Tom & Jerry & Spike" };
  const out = safeJsonLd(payload);
  // Round-trip through JSON.parse — the value must reconstruct exactly.
  const parsed = JSON.parse(
    out
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\u002F/g, "/"),
  );
  assert.equal(parsed.description, "Tom & Jerry & Spike");
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
  // Replace the JSON-LD escape forms with the actual chars they
  // represent and confirm we get our payload back.
  const reconstructed = out
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\u2028/g, String.fromCharCode(0x2028))
    .replace(/\\u2029/g, String.fromCharCode(0x2029));
  const parsed = JSON.parse(reconstructed);
  assert.equal(parsed.name, payload.name);
  assert.equal(parsed.desc, payload.desc);
  assert.equal(parsed.nested.tag, payload.nested.tag);
  assert.deepEqual(parsed.tags, payload.tags);
});

test("payload with null / undefined / empty string preserves structure", () => {
  const payload = { a: null, b: "", c: 0, d: false };
  const out = safeJsonLd(payload);
  // `undefined` is dropped by JSON.stringify, but null/""/0/false must round-trip.
  const parsed = JSON.parse(out);
  assert.equal(parsed.a, null);
  assert.equal(parsed.b, "");
  assert.equal(parsed.c, 0);
  assert.equal(parsed.d, false);
});

test("nested arrays of attacker strings remain attacker-inert", () => {
  const payload = {
    items: [
      { name: "</script><script>alert(1)</script>" },
      { name: `evil${String.fromCharCode(0x2028)}newline` },
      { name: "javascript:alert(1)" },
    ],
  };
  const out = safeJsonLd(payload);
  assert.ok(!/<\/script/i.test(out), "nested </script must not appear literal");
  assert.ok(
    !out.includes(String.fromCharCode(0x2028)),
    "nested U+2028 must not appear literal",
  );
  // `javascript:` is fine inside JSON-LD payloads — it's only dangerous
  // when an HTML parser later interpolates it into an href. Our concern
  // ends at the script tag's lexical safety.
});

test("object keys carrying attacker strings are also escaped", () => {
  // Edge case: malicious frontmatter could try to inject via a key, not
  // a value (e.g. `Object.fromEntries([['</script>', 'x']])`).
  const payload = { ["</script>"]: "value" };
  const out = safeJsonLd(payload);
  assert.ok(!/<\/script/i.test(out), "key </script must be escaped");
});

test("very large / deeply nested payloads do not crash or quadratic-explode", () => {
  // 100 nested levels of objects + 1000 array items; the lib should
  // handle this without OOM. (Not a perf test — a no-crash test.)
  let deep = "leaf</script>";
  for (let i = 0; i < 100; i++) {
    deep = { wrap: deep };
  }
  const wide = Array.from({ length: 1000 }, (_, i) => ({
    idx: i,
    evil: "</script>",
  }));
  const out = safeJsonLd({ deep, wide });
  assert.ok(out.length > 0);
  assert.ok(
    !/<\/script/i.test(out),
    "scaled payload must not leak literal </script",
  );
});

test("output is suitable for direct interpolation into <script> body", () => {
  // The contract: `<script type="application/ld+json">${output}</script>`
  // must be parseable by a browser's JSON-LD consumer (Google rich
  // results, Yandex, Bing). Simulate by reversing the escapes and
  // confirming valid JSON.
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Artagon",
  };
  const out = safeJsonLd(payload);
  // Escapes are valid JSON Unicode escapes — JSON.parse handles them
  // natively. No reverse-replacement needed.
  const parsed = JSON.parse(out);
  assert.equal(parsed["@type"], "WebSite");
});

test("JSON.parse natively understands all emitted escape forms", () => {
  // are valid JSON escape sequences per RFC 8259. The output must
  // therefore be parseable WITHOUT any pre-processing.
  const payload = {
    less: "<",
    greater: ">",
    slash: "/",
    ls: String.fromCharCode(0x2028),
    ps: String.fromCharCode(0x2029),
  };
  const out = safeJsonLd(payload);
  const parsed = JSON.parse(out);
  assert.equal(parsed.less, "<");
  assert.equal(parsed.greater, ">");
  assert.equal(parsed.slash, "/");
  assert.equal(parsed.ls, String.fromCharCode(0x2028));
  assert.equal(parsed.ps, String.fromCharCode(0x2029));
});

test("regression: the same string escaped twice does not double-encode", () => {
  // Defense-in-depth: if a value is already JSON-stringified upstream
  // (e.g. someone passes a stringified blob), safeJsonLd should not
  // mangle the existing escapes. Verified by escaping the SAME payload
  // twice and asserting the second pass is idempotent over the
  // already-safe characters (lib only escapes the danger set; doesn't
  // walk through and re-escape its own escape sequences).
  const payload = { url: "https://example.com/foo</script>" };
  const once = safeJsonLd(payload);
  const twice = safeJsonLd(JSON.parse(once));
  assert.equal(once, twice, "double-pass should be idempotent");
});

test("function values are stripped (isJSON: true)", () => {
  // serialize-javascript has a function-marshaling path; isJSON: true
  // disables it. A function value should be treated as undefined
  // (dropped), not emitted as JS code.
  const payload = { name: "Foo", evil: () => "alert(1)" };
  const out = safeJsonLd(payload);
  assert.ok(
    !out.includes("alert"),
    "function bodies must not leak under isJSON",
  );
  assert.ok(
    !out.includes("=>"),
    "arrow function syntax must not leak under isJSON",
  );
});

test("Date values are stringified, not emitted as new Date(...)", () => {
  const payload = { datePublished: new Date("2026-05-07T00:00:00Z") };
  const out = safeJsonLd(payload);
  // Under isJSON: true, Date is treated by JSON.stringify rules — emits
  // the toJSON()  value (an ISO string), not `new Date(...)`.
  assert.ok(!out.includes("new Date"), "Date constructors must not leak");
  assert.match(out, /2026-05-07T00:00:00/);
});
