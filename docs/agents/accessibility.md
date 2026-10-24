# Accessibility contracts

WCAG 2.1 AA is the floor. The project follows WCAG 2.2 AA wherever it is stricter. The `openspec/changes/enhance-a11y-coverage/` change owns the durable contracts.

- **Tap targets ≥ 44 × 44 CSS px.** This is the project's contract, stricter than WCAG 2.2's 24 px minimum (2.5.8). The visible target may be smaller; invisible padding or a pseudo-element extends the hit area.
- **Contrast ≥ 4.5:1 for text, ≥ 3:1 for non-text.** `tests/contrast-tokens.test.mts` asserts the ratios; `DESIGN.md` §2.4 documents the policy.
- **Semantic token roles.** `DESIGN.md` §2.2 (Accent), §2.3 (Semantic), and §6.5 (Trust chain) assign `--ok` to PERMIT/pass, `--bad` to DENY/fail, and `--accent` to primary CTAs and the trust chain's current stage. `--brand-teal` is a retained alias of `--accent`. Components consume the semantic alias, never a staging `--nd-*` token.
- **Focus.** Every interactive element has an explicit `:focus-visible` style (2 px `var(--accent)` outline, 2 px offset). Do not rely on browser defaults, and do not set `outline: none` without a visible replacement.
- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` sets `animation: none` and `transition: none` on animated UI, including the `glow-tag` and `glow-text-shimmer` primitives (upstream reference: `new-design/extracted/src/styles/global.css`). Scoped Astro rules can outrank the global reduced-motion rule, so components that add hover transforms need their own guard.
- **Forced colors.** `@media (forced-colors: active)` maps semantic aliases to system colors (`Canvas`, `CanvasText`, `Highlight`, `Mark`). Tints made with `color-mix()` lose their meaning there without explicit overrides.
- **Input parity.** Every interactive component on a content route supports pointer, keyboard, and touch. Hover-only affordances need a tap-toggle equivalent (`aria-pressed`).
- **Headings.** One `<h1>` per page; sections use `<h2>`, sub-sections `<h3>`; never skip levels (`DESIGN.md` §11.4).
- **Live regions.** The trust-chain decision card uses `aria-live="polite"`. A screen-reader Tab-navigation proxy test is planned in `enhance-a11y-coverage` Phase 6; until then, coverage is the live-region attribute plus the axe audit.
- **Automated gate.** `tests/home-axe.spec.ts` runs `@axe-core/playwright` with WCAG 2.1 A and AA tags on chromium, webkit, and Mobile Safari. It is mandatory, and it audits `/` only.

Open findings from the 2026-10-20 review (beads under epic `site-2m1`):

- Five of the six main-nav routes have no `<h1>` (`site-2m1.4`).
- BridgeFlow nests links inside buttons (`site-2m1.54`).
- The active nav link has no visible focus change (`site-2m1.56`).
- `Tagline.astro` puts `aria-label` on a plain `<span>` (`site-2m1.61`).
- The header hit-area tests are disabled (`site-2m1.32`).
