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

Version 1. Three maps:

- `skills`: directory name under `.agents/skills/` → its lock entry.
- `unlocked`: directory with no entry → a reason string, or `{ "reason", "execution", "network", "acknowledged" }` when its content needs a class (legacy mirrors, OpenSpec scaffolds, the `playwright-cli` package skill).
- `mirrorExceptions`: per mirror tree (`.claude/skills`, `.codex/skills`, `.gemini/skills`), entries that are not a link to `../../.agents/skills/<same name>`, each with a reason. Examples are real OpenSpec scaffold copies, and links into the external `artagon-ai-skills` checkout that `chore/consolidate-skills` removes.

| Field                           | Required for                                              | Meaning                                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`, `sourceType`          | all                                                       | `owner/repo` and `github`, or exactly `artagon/artagon-site` and `local` for repo-authored skills. No other source type is accepted.                                                                                              |
| `commit`, `license`, `files`    | every `github` entry except the grandfathered `design-md` | 40-hex reviewed upstream commit; SPDX id or statement; relative path → sha256 of every file, no more, no fewer                                                                                                                    |
| `execution`                     | every `github` and `local` entry                          | `text-only`, `script`, `binary` or `hook`; at least what the content needs. Undeclared (unlocked, mirror) means `text-only`.                                                                                                      |
| `network`                       | every `github` and `local` entry                          | `none`, `arbitrary`, or `{ "allowlist": [hosts] }`. Undeclared means `none`.                                                                                                                                                      |
| `acknowledged`                  | when needed                                               | `"path:line"` → `{ "reason", "sha256" }`, where `sha256` is the hash of that exact line. Changing the line voids the acknowledgement (`ack-mismatch`); one that matches nothing is `stale-ack`. Whole-file keys are not accepted. |
| `skillPath`, `modified`, `note` | third-party                                               | Upstream path; `true` when the copy differs from upstream (see the skill's `FORK.md`); free-text review note                                                                                                                      |
| `reviewedBy`, `reviewedAt`      | third-party                                               | Who signed off and when                                                                                                                                                                                                           |
| `computedHash`                  | `design-md` only                                          | Hash written by the `npx skills` CLI; not checked                                                                                                                                                                                 |

## What `npm run verify:skills` checks

1. **Accounting.**
   - Every `.agents/skills/` entry is a real directory that is locked or `unlocked`.
   - Every mirror-tree entry links to `../../.agents/skills/<same name>` or is a listed exception.
   - Nothing listed is missing on disk.
2. **Integrity.** Hashed files match exactly.
3. **Content**, in every scanned directory, locked or not:
   - no hidden Unicode (Unicode format characters, which include zero-width and bidi marks and tag characters; also line and paragraph separators, fillers and variation selectors), apart from a single emoji presentation selector after a pictograph;
   - no base64 runs of 200 or more characters, also when split across lines;
   - no symlinks, special files, or files over 5 MB;
   - no binary files unless the class is `binary`;
   - no `allowed-tools` frontmatter;
   - no moving `@latest` references.
4. **Execution class.** Anything that is not a known text type (`.md`, `.txt`, `.json`, `.yaml`, `.toml`, `.csv`, license and readme files) or an image counts as a script. So do a shebang, an executable bit, and `package.json` scripts. Hook manifests, `.mcp.json`, manifests with `hooks` or `mcpServers`, and frontmatter `hooks:` count as `hook`.
5. **Network class.** These are checked case-insensitively: shell and package-runner commands (`curl`, `wget`, `npx`, `bun x`, `npm`/`pnpm`/`yarn` install, exec and dlx forms, `pip install`, `pipx`, `uvx`, `cargo install`, `go install`, `git clone`/`fetch`/`pull`, `gh api`, `deno run https:`, `Invoke-WebRequest`, `iwr`, `ssh`, `nc` and more); network calls and any URL in script files; and any URL in a shell code fence.
   - Under `none`, any such hit fails.
   - Under an allowlist, every host the hit reaches must be listed, where package runners imply their registry.

Exit codes: 0 clean, 1 findings, 2 usage or IO error. `--json` prints the findings, the legacy entries, and the mirror-exception links that CI cannot review. CI runs it in `.github/workflows/agents-check.yml`.

## Adding or updating a third-party skill

1. Clone the upstream repo at a specific commit into a scratch directory outside the repo. Do not run
   its installer, CLI, scripts or hooks, and do not use `npx skills add`.
2. Read every file that will ship (SKILL.md, references, scripts, manifests). Note what it executes,
   which hosts it contacts, and whether it collects telemetry.
3. If it fetches or runs unpinned code, fork it (patch SKILL.md to local or pinned behaviour and
   explain the change in `FORK.md`), or reject it.
4. Copy the files plus the upstream license into `.agents/skills/<name>/`, and link
   `.claude/skills/<name>` to `../../.agents/skills/<name>`.
5. Add the lock entry with `files` hashes, and run `npm run verify:skills` until it exits 0. For a
   hit that is sample code rather than an agent action, add an `acknowledged` entry with the line's
   sha256 and a reason a reviewer can check. Never acknowledge a real instruction; fork the skill.
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
