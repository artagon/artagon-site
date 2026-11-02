## Why

Agents working on artagon-site (Claude Code, Codex CLI, Gemini CLI and Antigravity, often together in an NTM swarm) read every `SKILL.md` under `.agents/skills/` as instructions. Until now that tree had no provenance or content checks beyond the single `design-md` entry in `skills-lock.json`, and the repo had no skills for the work it does most: UI and UX design inside DESIGN.md, web quality audits, modern platform CSS and HTML, and accurate identity and authorization content.

Public skills for these jobs exist, but several fetch or execute unpinned code at run time:

- GoogleChrome/modern-web-guidance runs its npm CLI on a moving version tag for every search and sends usage telemetry.
- vercel-labs `web-design-guidelines` downloads its rules from a moving branch before every review.
- The `frontend-design` Claude plugin floats with the marketplace.

Public skill registries also carry real risk: Snyk's 2026 ToxicSkills audit found a security flaw in 36.82% of 3,984 skills and 76 confirmed malicious payloads.

Generic design skills also contradict this repo. `frontend-design` calls mono eyebrows, numbered sections and single-word serif emphasis "generated page" tells; DESIGN.md makes each of them a deliberate choice. Skills that teach Tailwind would contradict ADR 0001.

## What Changes

- Vendor reviewed third-party skills at pinned commits into `.agents/skills/`:
  - `frontend-design` (anthropics/skills)
  - `accessibility`, `best-practices`, `core-web-vitals`, `performance`, `seo` and `web-quality-audit` (addyosmani/web-quality-skills)
  - `modern-web-guidance` (GoogleChrome/modern-web-guidance, forked to read its vendored guides locally, with no network and no telemetry)
  - `web-interface-review` (a repo-authored skill over the MIT rules file from vercel-labs/web-interface-guidelines)
- Add four repo-authored skills:
  - `artagon-stack-guard`, backed by `scripts/verify-stack.mjs`
  - `artagon-design-system`, which routes to DESIGN.md and resolves the `frontend-design` conflict
  - `artagon-docs-authoring`
  - `artagon-authz-content-review`, with a dated standards-status reference
- Extend `skills-lock.json` (still version 1) with:
  - per-file sha256 hashes, commit, license and reviewer fields
  - execution and network classes
  - acknowledged findings
  - an `unlocked` list that gives a reason for every directory without a lock entry
- Add `scripts/verify-skills.mjs` (`npm run verify:skills`). It enforces accounting, integrity, hidden-Unicode and base64 checks, and the declared execution and network classes.
- Add `scripts/verify-stack.mjs` (`npm run verify:stack`). It reports installed versions and fails on removed Astro APIs and on Tailwind or Starlight adoption outside OpenSpec.
- Run both gates in `.github/workflows/agents-check.yml`, and their node:test suites in `npm run test:node`.
- MCP servers:
  - Add the official Astro Docs MCP (`astro-docs`) to the Claude, Codex and Gemini configs.
  - Pin `chrome-devtools` to `chrome-devtools-mcp@1.12.0` with `--isolated`, `--no-performance-crux` and `--no-usage-statistics`, and turn off its update checks.
- Disable the floating `frontend-design@claude-plugins-official` plugin, which the pinned skill replaces.
- Document the supply-chain process in `docs/agents/skills-supply-chain.md` and the skill routing in AGENTS.md.

## Capabilities

### New Capabilities

- `agent-skills`: provenance, integrity and content requirements for the agent skill tree, the CI gates that enforce them, and the stack-contract gate.

## Impact

- New files:
  - `.agents/skills/` (13 skill directories)
  - `scripts/verify-skills.mjs`, `scripts/verify-stack.mjs`
  - `tests/verify-skills.test.mjs`, `tests/verify-stack.test.mjs`
  - `docs/agents/skills-supply-chain.md`
- Changed files:
  - `skills-lock.json`, `package.json` (scripts only, no dependencies)
  - `.github/workflows/agents-check.yml`
  - `.mcp.json`, `.codex/config.toml`, `.gemini/settings.json`, `.claude/settings.json`
  - `.claude/skills/` (symlinks)
  - `AGENTS.md`, `docs/agents/mcp-servers.md`, `docs/agents/README.md`
  - `.agents/AGENT_MANIFEST.yaml`, `.agents/skills/README.md`
- No site output changes and no dependency changes.

## Out of scope

- Impeccable (pbakaus/impeccable). It downloads and runs a native engine binary, always calls its roll API at impeccable.style for new-design flows, and installs hooks that run outside model approval. It is documented as an opt-in, per-developer install in `docs/agents/skills-supply-chain.md`, not vendored.
- Tailwind v4 and Starlight skills: see `adopt-tailwind-and-starlight`.
