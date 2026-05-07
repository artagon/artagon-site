// USMR Phase 5.5.7 — Home "Explore" data registry. Extracted from
// `src/components/HomeExplore.astro` so the 6-card tuple shape can be
// invariant-tested at vitest time. Mirrors the canonical inline
// EXPLORE_CARDS const in new-design/extracted/src/components/HomeExplore.jsx.
//
// PRIMARY = 4 product surfaces, SECONDARY = 2 wide cards (Roadmap +
// GitHub external). Order is product-narrative — do not reshuffle
// without a corresponding home-page narrative review.

export interface ExploreCard {
  /** Mono numeric prefix on the card header — "01"…"06". */
  idx: ExploreIdx;
  /** Bold display title. */
  title: string;
  /** Body lede inside the card (≤ 64ch). */
  desc: string;
  /** Internal route or absolute external URL. */
  href: string;
}

export type ExploreIdx = "01" | "02" | "03" | "04" | "05" | "06";

export const PRIMARY: readonly [
  ExploreCard,
  ExploreCard,
  ExploreCard,
  ExploreCard,
] = [
  {
    idx: "01",
    title: "Platform",
    desc: "Three pillars — Identity, Credentials, Authorization — under one runtime.",
    href: "/platform",
  },
  {
    idx: "02",
    title: "The Bridge",
    desc: "OID4VP → OIDC. Adopt verifiable credentials without a rewrite.",
    href: "/bridge",
  },
  {
    idx: "03",
    title: "Use cases",
    desc: "CSR delegation, specialist consult, valet keys, AI agent leashes.",
    href: "/use-cases",
  },
  {
    idx: "04",
    title: "Standards",
    desc: "Every feature maps to a published IETF, OIDF, W3C, or NIST spec.",
    href: "/standards",
  },
] as const;

export const SECONDARY: readonly [ExploreCard, ExploreCard] = [
  {
    idx: "05",
    title: "Roadmap",
    desc: "Five phases over eighteen months — from core trust to agent authorization.",
    href: "/roadmap",
  },
  {
    idx: "06",
    title: "GitHub",
    desc: "Open-source core — Apache 2.0. Follow along and contribute.",
    href: "https://github.com/artagon",
  },
] as const;

/** True when the href targets an external origin (http/https/protocol-relative). */
export function isExternal(href: string): boolean {
  return /^(https?:|\/\/)/i.test(href);
}
