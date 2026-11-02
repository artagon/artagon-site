## ADDED Requirements

### Requirement: Skill Tree Accounting

Every directory under `.agents/skills/` MUST either have an entry in `skills-lock.json` `skills` or be listed in `skills-lock.json` `unlocked` with a non-empty reason. Every lock entry and every `unlocked` name MUST exist on disk. `scripts/verify-skills.mjs` MUST exit 1 on any violation.

#### Scenario: A new skill directory without a lock entry fails

- **WHEN** a contributor adds `.agents/skills/new-skill/` without a `skills-lock.json` entry or `unlocked` reason
- **THEN** `npm run verify:skills` exits 1 with `new-skill: unaccounted`

### Requirement: Vendored Skill Integrity

A third-party lock entry with a `files` map MUST match the skill directory exactly: every file's sha256 equals its listed digest, no listed file is missing, and no unlisted file is present. Third-party entries MUST record `source`, `sourceType`, `commit`, `license`, `execution` and `network`. Updating a vendored skill MUST go through a reviewed diff that updates the lock in the same change; skills MUST NOT update themselves at run time.

#### Scenario: Editing a vendored file without updating the lock fails

- **WHEN** a vendored `SKILL.md` changes and its digest in `skills-lock.json` does not
- **THEN** `npm run verify:skills` exits 1 with `<skill>: hash-drift: SKILL.md`

### Requirement: Skill Content Safety

`scripts/verify-skills.mjs` MUST reject hidden Unicode (zero-width characters, bidi controls, tag characters; a leading byte-order mark is allowed) and base64 runs of 200 or more characters in any file of any skill directory, locked or not.

#### Scenario: A zero-width character in a skill fails

- **WHEN** any file under `.agents/skills/` contains U+200B
- **THEN** `npm run verify:skills` exits 1 with `<skill>: hidden-unicode: <file>:<line>`

### Requirement: Declared Execution and Network Class

A lock entry that declares `execution` MUST declare at least the class its content needs: `script` for any script or executable file, `binary` for any binary file, `hook` for any hook manifest. A lock entry that declares `network: "none"` MUST NOT contain an agent instruction that reaches the network (`curl`, `wget`, `npx`, `pnpx`, `bunx`, `WebFetch`, `git clone`, `pip install`, `npm install`) or a network call in a script file. Any entry MUST NOT reference a moving `@latest` version. A reviewed exception MUST be listed in the entry's `acknowledged` map with a reason, and an acknowledgement that matches nothing MUST fail.

#### Scenario: A text-only skill that ships a script fails

- **WHEN** a lock entry declares `execution: "text-only"` and its directory contains `scripts/run.sh`
- **THEN** `npm run verify:skills` exits 1 with `execution-class`

#### Scenario: A stale acknowledgement fails

- **WHEN** an `acknowledged` key no longer matches a finding after a re-vendor
- **THEN** `npm run verify:skills` exits 1 with `stale-ack`

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
