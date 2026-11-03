# Tasks — add-agent-skills-supply-chain

> Phased plan. See `proposal.md` for why and `specs/agent-skills/spec.md` for the binding requirements.

## 1. Vendor and author skills

- [x] 1.1 Vendor `frontend-design` from anthropics/skills at a pinned commit, unmodified, with its LICENSE.txt. Files: `.agents/skills/frontend-design/`.
- [x] 1.2 Vendor `accessibility`, `best-practices`, `core-web-vitals`, `performance`, `seo` and `web-quality-audit` from addyosmani/web-quality-skills at a pinned commit, unmodified, each with the MIT LICENSE.
- [x] 1.3 Fork `modern-web-guidance`: local-mode SKILL.md, cross-reference rewrite in `guides/`, Apache-2.0 change notice in `FORK.md`. No npm CLI, no network, no telemetry.
- [x] 1.4 Author `web-interface-review` over the vendored MIT rules file from vercel-labs/web-interface-guidelines (`references/command.md`); never fetch rules at run time.
- [x] 1.5 Author `artagon-stack-guard`, `artagon-design-system` (including the `frontend-design` conflict note), `artagon-docs-authoring` and `artagon-authz-content-review` (with `references/standards-status.md`).
- [x] 1.6 Link every new skill into `.claude/skills/` for Claude Code; Codex and Gemini read `.agents/skills/` directly.

## 2. Supply-chain gate

- [x] 2.1 Extend `skills-lock.json` (version 1): `commit`, `license`, `execution`, `network`, `files`, `acknowledged`, `reviewedBy`, `reviewedAt`, `modified`, and the `unlocked` reasons map. Keep the legacy `design-md` entry unchanged.
- [x] 2.2 `scripts/verify-skills.mjs`: accounting, integrity, hidden Unicode, base64, execution and network classes, acknowledgements; exit 0/1/2; `--json`.
- [x] 2.3 `tests/verify-skills.test.mjs` (node:test, temp-dir fixtures) covering each finding code and the exit codes; added to `test:node`.
- [x] 2.4 Run `node scripts/verify-skills.mjs` in `.github/workflows/agents-check.yml`; add `npm run verify:skills`.
- [x] 2.5 Document the lock format, the review procedure, updates, and the Impeccable opt-in in `docs/agents/skills-supply-chain.md`.
- [x] 2.6 Harden the gate after the 2026-11-02 red-team review (13 reproduced bypasses): strict lock shape (`github` entries need commit, license, classes and hashes; `local` only for this repo), own-property lookups, mirror-tree accounting for `.claude/skills`, `.codex/skills` and `.gemini/skills`, line-hash-bound acknowledgements, enforced network allowlists, wider network-command and hidden-Unicode coverage, UTF-16 decoding, binary and special-file and symlink rejection, inverted execution rule with frontmatter `hooks:` and `allowed-tools:`, `@latest` everywhere, split-line base64. A negative test for each in `tests/verify-skills.test.mjs`.
- [x] 2.7 Fix what the hardened gate found in existing skills: remove the `allowed-tools` frontmatter (which pre-approved `web_fetch`) from `design-md`, delete the dangling `.claude/skills/ink` link, declare `playwright-cli` as `network: "arbitrary"`, and record mirror exceptions for the external `artagon-ai-skills` links and OpenSpec scaffold copies.

## 3. Stack gate

- [x] 3.1 `artagon-stack-guard` skill (see 1.5).
- [x] 3.2 `scripts/verify-stack.mjs`: installed versions, removed Astro APIs, Tailwind and Starlight outside OpenSpec; exit 0/1/2; `--json`; `npm run verify:stack`.
- [x] 3.3 `tests/verify-stack.test.mjs` (node:test); added to `test:node`; run in `agents-check.yml`.

## 4. MCP and plugins

- [x] 4.1 Add the Astro Docs MCP (`astro-docs`, `https://mcp.docs.astro.build/mcp`) to `.mcp.json`, `.codex/config.toml` and `.gemini/settings.json`; enable it in `.claude/settings.json`.
- [x] 4.1a Exclude the POST-only Astro Docs MCP endpoint from the link check (`scripts/sync-build-config.mjs` → `lychee.toml`); lychee's GET returned 405 on PR #94. Gate: `sync-build-config --check` clean and the exclusion matches only that endpoint.
- [x] 4.2 Pin `chrome-devtools` to `chrome-devtools-mcp@1.12.0` with `--isolated`, `--no-performance-crux`, `--no-usage-statistics`, `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS=1` and `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1` (flags verified in the 1.12.0 package README).
- [x] 4.3 Disable `frontend-design@claude-plugins-official`; the pinned `.agents/skills/frontend-design` replaces it.
- [x] 4.4 Update `docs/agents/mcp-servers.md` and the AGENTS.md MCP table.

## 5. Routing and manifests

- [x] 5.1 AGENTS.md: skill routing section; symbolic references for the new docs and changes.
- [x] 5.2 `.agents/AGENT_MANIFEST.yaml` sources and `mandatory` (`artagon-stack-guard`); `.agents/skills/README.md` installed table.

## 6. Review and land

- [ ] 6.1 Owner sign-off on every third-party lock entry (replace `reviewedBy: "pending owner sign-off"` with the reviewer).
- [x] 6.2 Rebase onto `chore/consolidate-skills` and reconcile with `tests/lint-skills-layout.test.mts` from that branch: lock entries for the five search-tool skills (`ripwire`, `tgrep`, `ripgrep`, `ast-grep`, `ast-grep-mcp`), stale `unlocked` and `mirrorExceptions` entries removed.
- [ ] 6.3 Adversarial reviews (NTM swarm): supply chain (Claude Opus 5.5), correctness (Claude Fable 5.1), red team (Codex gpt-6-astra). Fix every Critical and Major finding.
- [ ] 6.4 Triage the owner's GitHub stars against this stack; vendor any further skill through the same procedure.
- [x] 6.6 Skill evals: seven with-skill vs baseline cases under `evals/skills/` and trigger evals for the four `artagon-*` skills; results in `evals/skills/results/2026-11-02/`.
- [ ] 6.7 Act on the eval findings: rewrite the four `artagon-*` descriptions to fix under-triggering; verify the anchor-positioning support data in the `modern-web-guidance` fork; add discriminating assertions (frontmatter schema, zookie, border contrast, stacking context).
- [ ] 6.5 `npm run check`, `npm run test:node`, `npm run test:vitest`, `npm run lint:sg:ci`, `npm run verify:skills`, `npm run verify:stack` green in CI.
