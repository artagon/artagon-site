## ADDED Requirements

### Requirement: Skill Tree Accounting

Every entry under `.agents/skills/` MUST be a real directory (not a symlink) with an entry in `skills-lock.json` `skills` or a reason in `unlocked`. Every entry under `.claude/skills/`, `.codex/skills/` and `.gemini/skills/` MUST be a symlink to `../../.agents/skills/<same name>` of an existing skill, or be listed in `mirrorExceptions` for that tree with a reason. Every lock entry, `unlocked` name and mirror exception MUST exist on disk. Name lookups MUST use own properties only. `scripts/verify-skills.mjs` MUST exit 1 on any violation.

#### Scenario: A new skill directory without a lock entry fails

- **WHEN** a contributor adds `.agents/skills/new-skill/` without a `skills-lock.json` entry or `unlocked` reason
- **THEN** `npm run verify:skills` exits 1 with `new-skill: unaccounted`

#### Scenario: A skill placed only in a mirror tree fails

- **WHEN** a contributor adds `.claude/skills/new-skill/SKILL.md` as a real directory
- **THEN** `npm run verify:skills` exits 1 with `mirror-unaccounted`, and the directory's content is still scanned

### Requirement: Vendored Skill Integrity

`sourceType` MUST be `github` or `local`, and `local` MUST be used only with `source: "artagon/artagon-site"`. A `github` entry MUST record `commit`, `license`, `execution`, `network` and a `files` map; only `design-md` is grandfathered without `files`. The `files` map MUST match the skill directory exactly: every file's sha256 equals its listed digest, no listed file is missing, and no unlisted file is present. Updating a vendored skill MUST go through a reviewed diff that updates the lock in the same change; skills MUST NOT update themselves at run time.

#### Scenario: Editing a vendored file without updating the lock fails

- **WHEN** a vendored `SKILL.md` changes and its digest in `skills-lock.json` does not
- **THEN** `npm run verify:skills` exits 1 with `<skill>: hash-drift: SKILL.md`

#### Scenario: A third-party entry without hashes is rejected

- **WHEN** a lock entry for a third-party skill omits `files`, `commit`, `license` or a class, or claims `sourceType: "local"` for another source
- **THEN** `npm run verify:skills` exits 2 naming the entry and the missing field

### Requirement: Skill Content Safety

In every scanned directory (locked, unlocked, or a mirror exception), `scripts/verify-skills.mjs` MUST reject: Unicode format characters (`\p{Cf}`, which includes zero-width characters, bidi marks, embeddings, overrides and isolates, the soft hyphen and tag characters), line and paragraph separators, filler characters and variation selectors, except a leading byte-order mark and a single emoji presentation selector after a pictograph; base64 runs of 200 or more characters, also when split across lines; symlinks and special files; files over 5 MB; binary files unless the class is `binary`; `allowed-tools` frontmatter; and moving `@latest` references. UTF-16 text with a byte-order mark MUST be decoded and scanned.

#### Scenario: A zero-width character in a skill fails

- **WHEN** any file under `.agents/skills/` contains U+200B
- **THEN** `npm run verify:skills` exits 1 with `<skill>: hidden-unicode: <file>:<line>`

### Requirement: Declared Execution and Network Class

A skill's content MUST NOT need more than its declared `execution` class (undeclared means `text-only`): any file that is not a known text or image type, a shebang, an executable bit or `package.json` scripts needs `script`; a binary needs `binary`; a hook manifest, `.mcp.json`, a manifest with `hooks` or `mcpServers`, or frontmatter `hooks:` needs `hook`. Network instructions (shell and package-runner commands that reach the network, network calls and URLs in scripts, URLs in shell code fences) MUST NOT appear under `network: "none"` (the default), and under `{ "allowlist": [...] }` every host they reach MUST be listed. A reviewed exception MUST be listed in `acknowledged` as `"path:line"` with the sha256 of that exact line and a reason; a changed line or an acknowledgement that matches nothing MUST fail.

#### Scenario: A text-only skill that ships a script fails

- **WHEN** a lock entry declares `execution: "text-only"` and its directory contains `scripts/run.sh`
- **THEN** `npm run verify:skills` exits 1 with `execution-class`

#### Scenario: Swapping an acknowledged line fails

- **WHEN** an acknowledged sample line is replaced with a real network instruction and the file hash is updated
- **THEN** `npm run verify:skills` exits 1 with `ack-mismatch`

### Requirement: Stack Contract Gate

`scripts/verify-stack.mjs` MUST print the installed versions of `astro`, the `@astrojs/*` packages, `react` and Node, read from `package-lock.json` and `.nvmrc`. It MUST exit 1 when `src/`, `public/assets/*.css` or `astro.config.*` use `Astro.glob(`, `<ViewTransitions`, a Tailwind `@tailwind` directive or `@import "tailwindcss"`; when `package.json` declares `tailwindcss`, `@tailwindcss/*`, `@astrojs/tailwind` or `@astrojs/starlight`; or when a root `tailwind.config.*` exists. These checks MUST change only through an approved OpenSpec change that supersedes ADR 0001.

#### Scenario: Adding Tailwind outside OpenSpec fails

- **WHEN** a contributor adds `@tailwindcss/vite` to `package.json`
- **THEN** `npm run verify:stack` exits 1 with `package.json: dependency: @tailwindcss/vite`

### Requirement: Gates Run in CI

`.github/workflows/agents-check.yml` MUST run `scripts/verify-skills.mjs` and `scripts/verify-stack.mjs` on every pull request, and `npm run test:node` MUST include `tests/verify-skills.test.mjs` and `tests/verify-stack.test.mjs`.

#### Scenario: A pull request with a skill violation fails CI

- **WHEN** a pull request adds a skill with a hash drift
- **THEN** the "Agents folder check" workflow fails at "Verify agent skills"
