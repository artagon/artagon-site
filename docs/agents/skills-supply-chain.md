# Agent skills: routing and supply chain

Every `SKILL.md` under `.agents/skills/` is an instruction to every agent that works here, so the
skill tree is treated as executable supply-chain input. Rule: **pin what executes, keep authoritative
docs live, enforce invariants in CI.** A skill is never the security gate; `scripts/verify-skills.mjs`
is. Requirements: `openspec/changes/add-agent-skills-supply-chain/specs/agent-skills/spec.md`.

## Which skill for which job

| Job                                                                    | Skill or tool                                                                                   | Notes                                                                                                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Any change to components, pages, styles, integrations or dependencies  | `artagon-stack-guard` + `npm run verify:stack`                                                  | Reads the installed stack; framework facts come from the `astro-docs` MCP                                                                 |
| New or restyled UI, marketing copy                                     | `artagon-design-system`, then `frontend-design`                                                 | DESIGN.md wins; see the conflict note in `artagon-design-system`                                                                          |
| HTML, CSS and client-side platform patterns                            | `modern-web-guidance`                                                                           | Local guides only; never copy CDN polyfill imports                                                                                        |
| UI review against interface rules                                      | `web-interface-review`                                                                          | Pinned rules, no network                                                                                                                  |
| Accessibility, performance, Core Web Vitals, SEO, best-practice audits | `accessibility`, `performance`, `core-web-vitals`, `seo`, `best-practices`, `web-quality-audit` | Use the repo's pinned tools (`@lhci/cli`, `@axe-core/playwright`, `chrome-devtools` MCP), not `npx` or global installs the skills suggest |
| Long-form, MDX, docs, code samples, diagrams                           | `artagon-docs-authoring`                                                                        |                                                                                                                                           |
| Any identity or authorization claim                                    | `artagon-authz-content-review`                                                                  | Records verified standards status in `references/standards-status.md`                                                                     |
| DESIGN.md edits                                                        | `design-md`                                                                                     |                                                                                                                                           |

## `skills-lock.json`

Version 1. `skills` maps a directory name under `.agents/skills/` to its entry; `unlocked` maps a
directory without an entry to the reason it has none (legacy mirrors and OpenSpec scaffolds).

| Field                      | Required for    | Meaning                                                                                                                                     |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`, `sourceType`     | all             | `owner/repo` and `github`, or `artagon/artagon-site` and `local` for repo-authored skills                                                   |
| `skillPath`                | third-party     | Path of the skill inside the upstream repo                                                                                                  |
| `commit`                   | third-party     | 40-hex upstream commit that was reviewed                                                                                                    |
| `license`                  | third-party     | SPDX id or a short statement                                                                                                                |
| `execution`                | all new entries | `text-only`, `script`, `binary` or `hook`; must be at least what the content needs                                                          |
| `network`                  | all new entries | `none`, `docs-only`, `arbitrary`, or `{ "allowlist": [hosts] }`                                                                             |
| `files`                    | third-party     | Relative path → sha256 of every file in the directory; no more, no fewer                                                                    |
| `acknowledged`             | when needed     | `"path:line"` or `"path:*"` → reason, for reviewed scanner hits that are sample code rather than agent actions. A stale key fails the gate. |
| `modified`                 | third-party     | `true` when the vendored copy differs from upstream (explained in the skill's `FORK.md` or SKILL.md)                                        |
| `reviewedBy`, `reviewedAt` | third-party     | Who signed off and when                                                                                                                     |
| `computedHash`             | legacy          | Hash written by the `npx skills` CLI for `design-md`; not checked by the gate                                                               |

## What `npm run verify:skills` checks

1. Every skill directory is locked or has an `unlocked` reason; every entry exists.
2. Locked files match their sha256; no missing or unlisted files.
3. No hidden Unicode (zero-width, bidi controls, tag characters) or base64 runs of 200+ characters, in
   any skill.
4. Declared `execution` covers scripts, executable bits, binaries and hook manifests.
5. With `network: "none"`, no `curl`, `wget`, `npx`, `pnpx`, `bunx`, `WebFetch`, `git clone`,
   `pip install` or `npm install` instruction, and no `fetch(` in a script. No moving `@latest`
   reference anywhere.

Exit codes: 0 clean, 1 findings, 2 usage or IO error. `--json` prints the findings and the list of
legacy entries. CI runs it in `.github/workflows/agents-check.yml`.

## Adding or updating a third-party skill

1. Clone the upstream repo at a specific commit into a scratch directory outside the repo. Do not run
   its installer, CLI, scripts or hooks, and do not use `npx skills add`.
2. Read every file that will ship (SKILL.md, references, scripts, manifests). Note what it executes,
   which hosts it contacts, and whether it collects telemetry.
3. If it fetches or runs unpinned code, fork it (patch SKILL.md to local or pinned behaviour and
   explain the change in `FORK.md`), or reject it.
4. Copy the files plus the upstream license into `.agents/skills/<name>/`, and link
   `.claude/skills/<name>` to `../../.agents/skills/<name>`.
5. Add the lock entry with `files` hashes (`node scripts/verify-skills.mjs --json` shows what is
   missing), and run `npm run verify:skills` until it exits 0.
6. A human reviewer signs off by filling `reviewedBy` and `reviewedAt`. An agent may prepare the
   entry, but never signs off.

## Not vendored

- **Impeccable** (pbakaus/impeccable). Its launcher downloads and runs a native engine binary; new
  design flows always call its roll API at `impeccable.style`; its installer adds hooks that run
  outside model approval; and with `OPENAI_API_KEY` set it can bill image generation to that key.
  It stays a per-developer opt-in, outside this repo. If you install it, use `--no-hooks`, set
  `IMPECCABLE_NO_TELEMETRY=1`, unset `OPENAI_API_KEY` for agent sessions, pin the skill and engine
  versions, and keep it away from sessions that hold deploy credentials.
- **Tailwind v4 and Starlight skills.** The stack does not use them (ADR 0001). They are planned in
  `openspec/changes/adopt-tailwind-and-starlight/`.
- **Generic Astro skills** from community registries. They predate the installed Astro major; use
  the `astro-docs` MCP and `artagon-stack-guard` instead.
