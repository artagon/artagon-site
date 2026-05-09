// Ambient type declaration for the upstream `serialize-javascript`
// package, which ships no .d.ts. Authored 2026-05-09 (USMR pt428) to
// close the `any` propagation through `src/lib/charset.ts:safeJsonLd`
// flagged by the 2026-05-09 security review's type-design lens.
//
// API surface mirrors the v6.0.x public contract per
//   https://github.com/yahoo/serialize-javascript#user-content-api
// We only consume `isJSON` + `space`; the other flags are typed but
// unused by the current callers.

declare module "serialize-javascript" {
  export interface SerializeOptions {
    isJSON?: boolean;
    space?: number | string;
    unsafe?: boolean;
    ignoreFunction?: boolean;
  }
  function serialize(value: unknown, options?: SerializeOptions): string;
  export default serialize;
}
