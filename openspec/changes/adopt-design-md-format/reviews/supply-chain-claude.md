# Adversarial Review: adopt-design-md-format — Supply-Chain / Dependency / License

Reviewer: Claude (Opus 4.7) | Dimension: SUPPLY-CHAIN only | Confidence floor: 80%

## Upstream verification facts (npm view + gh api, 2026-05-01)

- `@google/design.md@0.1.1`, published 2026-04-21, only 2 versions ever (`0.1.0`, `0.1.1`).
- npm `package.json` has **no `license` field** (GitHub repo claims Apache-2.0, but the published artifact omits it).
- **No `postinstall` script.** `scripts` block contains only `build`, `dev`, `test`, `spec:gen`, `check-package`. Bin: `dist/index.js`.
- 3 npm maintainers: `google-wombot`, `ofrobots`, `mrdoob`. Publish goes through Google's wombat-dressing-room (2FA-gated). Tarball is signed (npm provenance).
- Repo bus factor: 17 commits total across 7 contributors; top contributor `davideast` has 7 commits. **`mrdoob` (npm publisher) is not in the top contributor list** — publish capability decoupled from code authorship.
- Direct deps licenses: `@json-render/core` + `@json-render/ink` Apache-2.0 (single maintainer `matt.straka` — secondary bus-factor); `citty`, `ink`, `remark-*`, `zod`, `unified` all MIT. **No GPL/AGPL contamination.**

## Findings

### F1 — Bus factor / acquisition risk (HIGH)

Upstream is a Google Labs alpha with 17 commits and 7 contributors total. Google Labs projects historically deprecate (Stadia, Domains, Jamboard). The proposal's "weekly drift check" only catches schema text changes; it does not detect repo archival or npm unpublish. proposal.md:48,53 cites mitigation but no automated _liveness_ probe. **Remediation:** add a CI job that GETs `gh api repos/google-labs-code/design.md` weekly and fails if `archived=true` OR last push >90 days; pair with the exit strategy in F9.

### F2 — npm package missing `license` field (MEDIUM)

`npm view @google/design.md license` returns nothing — the published `package.json` does not declare a license. The GitHub repo is Apache-2.0, but downstream license scanners (FOSSA, Snyk, license-checker) read npm metadata. design.md:81-87 asserts attribution suffices via package-lock; that's wrong if `license-checker` flags this as `UNKNOWN`. **Remediation:** Phase 0 must (a) file an upstream issue requesting `"license": "Apache-2.0"` in `package.json`, AND (b) document the upstream LICENSE file SHA in `docs/design-md.md` to satisfy auditors.

### F3 — Maintainer/publisher decoupling (HIGH)

`mrdoob` (Three.js author, personal email `info@mrdoob.com`) holds publish rights but has zero commits in the top contributors list. Account compromise → malicious `0.1.2` republish even with our exact-version pin would still affect the _next_ deliberate bump, and any contributor running `npm install` outside lockfile (e.g., `npm i @google/design.md` ad-hoc) gets the new version. **Remediation:** add `"overrides"` block in package.json + enable `npm ci` (not `npm install`) in CI; require `--ignore-scripts` defense-in-depth even though current version has no scripts (future versions might).

### F4 — Postinstall risk is currently zero but unbounded (MEDIUM)

Current 0.1.1 has no postinstall. Nothing in tasks.md or design.md requires `npm ci --ignore-scripts` for the design.md install path, so a future pinned-bump could silently introduce one. tasks.md:20 (`npm install --save-dev`) does not specify flags. **Remediation:** Phase 2.1 must use `npm install --save-dev --ignore-scripts @google/design.md@<X>`; CI step in 7.x must run `npm ci --ignore-scripts` for the lint container.

### F5 — Lockfile attestation present but not cited (LOW)

`package-lock.json` exists at repo root (verified). Proposal does not explicitly require committing the updated lockfile after Phase 2.1 nor verifying the integrity hash matches the upstream signed tarball (`sha512-S5xdF4DrELQ...`). **Remediation:** add Phase 2.1.a: "Commit `package-lock.json` and assert integrity hash equals npm registry's published `dist.integrity`."

### F6 — Spec cache check is a text gate, not a behavior gate (MEDIUM)

tasks.md:84 (Phase 7.7) only diffs `openspec/.cache/design-md-spec.md`. A linter rule behavior change (e.g., `broken-ref` widening its detection scope) would not change the spec markdown — but would shift CI findings. design.md:39-42 acknowledges weekly drift but only at spec-text level. **Remediation:** add a fixture-based behavior test: commit `tests/fixtures/design-md/{good.md,bad.md}` and assert `lint` exit code + finding-count snapshots; bump = deliberate snapshot update.

### F7 — Weekly drift check not in tasks.md (MEDIUM)

design.md:39-42 commits to a "weekly CI job" comparing spec output. **No corresponding task exists in tasks.md Phase 2 or Phase 7.** Stated goal without owning task = won't ship. **Remediation:** add Phase 2.7 "Add `.github/workflows/design-md-drift.yml` cron weekly running `spec:cache` + `git diff --exit-code`; failure opens an issue."

### F8 — `diff:design` not gated on PRs touching DESIGN.md (LOW)

proposal.md:19 wires `diff:design` as a script but tasks.md never requires it on PRs that mutate DESIGN.md. Blast-radius assessment for design changes is the script's main value. **Remediation:** add Phase 2.8 — GitHub Actions `paths: ['DESIGN.md']` job that runs `npx @google/design.md diff origin/main:DESIGN.md DESIGN.md` and posts as PR comment.

### F9 — No exit strategy if upstream is abandoned (MEDIUM)

proposal.md mentions rollback (revert package.json) but offers no preservation path. If `@google/design.md` is unpublished or repo archives, our DESIGN.md still references the format but loses tooling. design.md:60-66 commits the spec to git (good) but does not commit the linter source. **Remediation:** add design.md Decision #9: "If upstream is archived or npm-unpublished for >90 days, vendor `@google/design.md@<pinned>` source into `vendor/design.md/` under Apache-2.0 with NOTICE; this triggers the bundling calculus referenced in Decision #7."

### F10 — Telemetry not verified or disabled (LOW)

`@google/design.md` deps include `ink` (terminal UI) — no obvious phone-home, and `package.json` shows no analytics deps. However, no proposal task confirms this or sets `DO_NOT_TRACK=1` / `npm_config_audit=false` in CI. **Remediation:** Phase 7.x: assert `npm run lint:design` makes zero outbound network calls (run under `--offline` or `unshare -n` in CI).

### F11 — Secondary bus factor: `@json-render/*` (LOW)

Two direct deps published by single individual `matt.straka`. Not a Google project, not flagged in proposal. **Remediation:** mention in `docs/design-md.md` risk register; pin via lockfile (already done by F5).

## Verdict

**APPROVE-WITH-CHANGES** — must-fix count: **6** (F1, F2, F3, F4, F6, F7). F5/F8/F9/F10/F11 are should-fix.

The proposal's threat modeling is good for format-drift but underweights publisher-vs-author decoupling (F3), missing license metadata (F2), and the gap between stated mitigations (drift check, fixture tests) and owned tasks (F6, F7). All must-fixes are mechanical additions to tasks.md/design.md — no architectural rework required.
