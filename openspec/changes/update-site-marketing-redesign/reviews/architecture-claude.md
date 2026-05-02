# Architecture Review — update-site-marketing-redesign

Scope: ARCHITECTURE only. Confidence ≥80%.

### [High] `site-mobile-layout` overlaps `style-system`
**Location**: `specs/site-mobile-layout/spec.md:1-52`; `specs/style-system/spec.md:12-28`
"Three Global Breakpoints" defines `--bp-sm/md/lg` tokens in `theme.css` — a token contract owned by `style-system`. "Fluid Type Scale" (style-system) and "No Horizontal Overflow at 360 px" / "No Global Viewport Scale" overlap the 360 px floor. "Tap Targets ≥ 44 px" is accessibility, "Single H1" is metadata — neither is layout. The capability is mostly a re-tag of tokens already owned elsewhere.
**Remediation**: Fold breakpoint, no-scale, and no-overflow into `style-system`. Move "Single H1" into `site-navigation`. Delete `site-mobile-layout` or narrow it to primitive composition.

### [High] Four capabilities mutate `BaseLayout.astro`
**Location**: `tasks.md:94-121,141-146`; `design.md:124-133`
`site-structured-data`, `site-indexation`, `site-navigation`, `site-branding` each ADD head tags to one file. The proposal admits "share `BaseLayout.astro` — stage edits". Capabilities that must coordinate edits to one file are not orthogonal — shotgun surgery as modularity.
**Remediation**: Collapse `site-structured-data` + `site-indexation` + `site-branding` into one `site-metadata` capability; OR add a Requirement in `site-navigation` defining a slot ABI (`<JsonLd/>`, `<Indexation/>`, `<Branding/>`) that the other capabilities consume.

### [High] Merge-order gate is hygiene, not enforcement
**Location**: `tasks.md:7`; `design.md:29-35`
"Confirm `refactor-styling-architecture` has merged" is a checkbox. `openspec validate --strict` passes while the blocker is open.
**Remediation**: Add `npm run verify:prerequisites` checking `openspec/changes/refactor-styling-architecture/` is archived or its merge commit is an ancestor of HEAD. Wire into postbuild.

### [Medium] MODIFIED `Solid Card Variant` smuggles in new variants
**Location**: `specs/style-system/spec.md:97-109` vs `openspec/specs/style-system/spec.md:22-28`
Source defines `variant="solid"`. Delta MODIFIED text adds `domain`, `pillar`, `component`, `product` — a net addition, not a modification.
**Remediation**: Keep MODIFIED text identical. Move multi-variant clause to ADDED `Card Variant Set`.

### [Medium] No "preserve existing tokens" contract
**Location**: `specs/style-system/spec.md:1-66`; `design.md:158`
design.md promises additive-first, but no requirement says existing tokens must remain defined. A strict reader of `Token Categories` could clean-rebuild `theme.css` and break out-of-scope routes.
**Remediation**: ADD `Existing Token Preservation`: pre-existing `--color-*`, `--surface-*`, `--ink-*` tokens MUST remain resolvable; rename/removal requires a separate change.

### [Medium] `lint-tokens` belongs in ast-grep, not mjs
**Location**: `tasks.md:28`; `design.md:144-149`
Forbidding hex/rgb/oklch literals and raw px in `.css` is the canonical single-AST CSS pattern. tasks.md lists `lint-tokens.mjs` as primary and ast-grep as "Where … fits".
**Remediation**: Promote to `rules/security/no-raw-color-literal.yaml` + `no-raw-length.yaml`. Keep mjs only for cross-file MDX. Change §2.8 "Where" to "MUST".

### [Medium] Broken reference to deleted `openspec/AGENTS.md`
**Location**: `proposal.md:86`
"…per `openspec/AGENTS.md` workflow." File deleted by openspec init upgrade; replaced by `openspec/config.yaml` + `openspec/contributing.md`.
**Remediation**: Replace with `openspec/contributing.md` or remove citation.

### [Medium] Open Questions are decisions in disguise
**Location**: `design.md:166-171`
Three of five Open Questions (vision ownership, twilight default, brand-gallery deferral) materially affect in-scope spec content.
**Remediation**: Promote those three to Decisions §19–21. Move `/changelog` and `/about/[author]` to Non-Goals.

### [Low] Rollback "self-contained per phase" overstates reality
**Location**: `tasks.md:148-150`
Phases 2/3/9/10/11 all touch `BaseLayout.astro`; Phases 2/3 touch `theme.css` and `csp.mjs`. Per-phase revert needs manual reconciliation.
**Remediation**: State explicitly that BaseLayout.astro and theme.css revert via tagged `pre-redesign` baseline; tag the ref in §0.5.

### [Low] Astro 5 glob loader API not addressed
**Location**: `design.md:163`; `tasks.md:46-47`
Astro 5 uses `defineCollection({ loader: glob({...}) })`. tasks.md says "extend Zod schemas" without specifying loader; the writing sub-collection may not resolve.
**Remediation**: Add task confirming `src/content/config.ts` uses Astro 5 `glob()` loaders for `pages` and `pages/writing`.

## Verdict

**APPROVE-WITH-CHANGES** — must-fix: 4 (Findings 1, 2, 3, 5).
