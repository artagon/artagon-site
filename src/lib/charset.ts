/**
 * Charset / encoding utilities for build-time emission of structured
 * data into HTML.
 *
 * `safeJsonLd` is the post-5.1q-review hardening for inline JSON-LD
 * `<script>` tags. The default `JSON.stringify` does NOT escape the
 * characters that have HTML / JS lexer semantics, so a string value
 * containing `</script>` or a U+2028 / U+2029 byte can break out of
 * (or silently corrupt) the surrounding inline JSON-LD script.
 *
 * Implementation delegates to Yahoo's `serialize-javascript` (BSD-3,
 * 50M+ weekly downloads, used by webpack / Next.js / Yahoo!). The
 * library applies a battle-tested escape table covering U+003C `<`,
 * U+003E `>`, U+002F `/`, U+2028 LINE SEPARATOR, U+2029 PARAGRAPH
 * SEPARATOR, plus a regex-based defense-in-depth pass that catches
 * full `</script ...>` close-tag sequences (case-insensitive).
 *
 * We pass `isJSON: true` so the lib treats the payload as plain JSON
 * (skipping the function / regex / undefined / Date marshaling that
 * would emit JS-only constructs which schema.org parsers reject).
 *
 * IMPORTANT: source MUST stay 7-bit-ASCII. Embedding raw U+2028 or
 * U+2029 bytes in a comment (or anywhere in source) makes esbuild
 * close the surrounding regex / string literal at the byte and emit
 * "Unterminated regular expression". The escape characters themselves
 * are referenced by their U+XXXX label, never inlined.
 */

// pt428 — types declared in `src/types/serialize-javascript.d.ts`.
// Pre-pt428 this import used `@ts-expect-error` because the upstream
// package ships no .d.ts, so the returned `serialize(...)` value was
// implicitly `any` and propagated through `safeJsonLd`'s return path.
// The dedicated ambient declaration tightens the boundary to `string` —
// closing the type hole flagged in the 2026-05-09 security review.
import serialize from "serialize-javascript";

export function safeJsonLd(payload: unknown): string {
  return serialize(payload, { isJSON: true, space: 2 });
}
