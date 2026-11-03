---
name: artagon-authz-content-review
description: Accuracy review for identity, authentication and authorization content on artagon-site (OAuth, OIDC, GNAP, JWT, DPoP, mTLS, WebAuthn and passkeys, verifiable credentials, SD-JWT, Zanzibar and ReBAC). Use when writing or reviewing any page, post, sample or copy that states a protocol fact, cites a standard, or describes how Artagon makes an authorization decision. Read-only review that reports findings.
---

# Artagon authorization-content review

Artagon sells trust. One wrong protocol claim costs more credibility than any design flaw, so every
claim gets its authority checked.

## 1. Classify every external claim

Tag each claim with exactly one authority level, and say it the way that level allows:

| Level                 | Examples                                              | How the page may say it                         |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| RFC (Standards Track) | RFC 7636 PKCE, RFC 9449 DPoP, RFC 9207 `iss`          | "RFC NNNN requires…"                            |
| BCP                   | RFC 9700, OAuth 2.0 Security Best Current Practice    | "The OAuth security BCP (RFC 9700) recommends…" |
| W3C Recommendation    | a Rec-track spec at REC status                        | "The W3C … Recommendation…"                     |
| Active draft          | OAuth 2.1 (`draft-ietf-oauth-v2-1`)                   | "The OAuth 2.1 draft…", never "OAuth 2.1 (RFC)" |
| Paper                 | Zanzibar (USENIX ATC 2019)                            | "Google's Zanzibar paper describes…"            |
| Artagon contract      | SDK behaviour, token lifetimes, consistency semantics | Product voice; must match the product docs      |

Check status at the source (IETF Datatracker, rfc-editor.org, w3.org) when it is not in
`references/standards-status.md`, and add what you verified there with the date. Never upgrade a
draft to an RFC, and never cite an expired draft as current.

## 2. Check the claim itself

- Grant types and flows: OAuth 2.1 drops the implicit and resource-owner password grants and
  requires PKCE with `S256`; RFC 9700 says the same for OAuth 2.0 deployments. Flag any page that
  presents those grants as current practice.
- Token handling: bearer versus sender-constrained (DPoP, mTLS), lifetimes, where tokens may be
  stored, audience and issuer checks. Flag tokens in URLs, `alg: none`, unverified `jwt.decode`, and
  long-lived bearer tokens in `localStorage`.
- Zanzibar and ReBAC: tuples, usersets, rewrites, consistency tokens. Map Artagon's public terms to
  these concepts accurately; do not force Zanzibar's own names (for example "zookie") into Artagon's
  docs if Artagon defines different public terms.
- Names of things: flag invented spec names or versions (for example a version number for a spec that
  has no such version) and claims of certification or conformance the product does not hold.
- Numbers: every latency, IAL/AAL level, or benchmark links to a source (DESIGN.md §1.1.1, "proof over
  promise").

## 3. Report

One finding per line: `path:line - level - claim - problem - fix`, Critical (false or insecure
statement) / Major (wrong status or missing source) / Minor (wording). End with the list of sources
you opened. Load `.claude/skills/review-verification-protocol/` first if it is installed.
