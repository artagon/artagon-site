## MODIFIED Requirements

### Requirement: Per-route Frontmatter Contract

Each marketing-route MDX file MUST declare frontmatter `eyebrow`, `headline`, `lede`, `description` (80–160 chars), and a `ctas[]` array (each with `label` and `href`). Writing posts (under `pages/writing`) additionally accept optional `repo`, `path`, `commit`, and constrained `cover` fields per the requirements below.

The `pages/writing` Zod schema MUST accept optional `repo` (Zod enum constrained to the allowlist `['artagon/content']` — extending the allowlist requires a separate OpenSpec change), `path` (string, relative path within `repo` matching `^posts/[A-Za-z0-9._/-]{1,200}$`), and `commit` (string, 40 hex characters — no truncated SHAs because the redeploy workflow pins on the merge SHA). These fields MUST be auto-populated by `scripts/fetch-content.mjs` for posts sourced from a remote content repo; local posts MAY omit all three. Posts that declare `repo` MUST also declare `path` and `commit`; the schema MUST fail the build if any one is present without the other two.

The `cover` field MUST match `^(\.\/assets\/|posts\/assets\/)[A-Za-z0-9._/-]+\.(png|jpg|jpeg|webp|avif|svg)$` for both local and remote posts; absolute URLs (anything starting with `http://`, `https://`, `//`) MUST be rejected. This prevents build-host SSRF when `astro:assets` resolves the cover at build time (a malicious post could otherwise set `cover: https://169.254.169.254/...` to exfiltrate cloud-metadata from the GitHub Actions runner).

#### Scenario: Missing frontmatter fails build

- **WHEN** an editor commits an MDX file without the `description` field
- **THEN** `astro build` fails with a Zod validation error citing the missing field.

#### Scenario: Local post omits remote-source fields

- **WHEN** a contributor authors `src/content/pages/writing/welcome.mdx` without `repo`, `path`, or `commit` frontmatter
- **THEN** the build succeeds and the post is recorded as a local-source entry with `repo === undefined`.

#### Scenario: Remote post declares all three

- **WHEN** `scripts/fetch-content.mjs` writes a post into `.cache/content-repo/posts/2026-05-01-launch.mdx` and populates `repo: "artagon/content"`, `path: "posts/2026-05-01-launch.mdx"`, `commit: "abc1234abc1234abc1234abc1234abc1234abc12"`
- **THEN** the build succeeds and the post is recorded with all three fields, addressable as a remote-source entry.

#### Scenario: Partial remote frontmatter fails

- **WHEN** a post declares `repo: "artagon/content"` but omits `commit`
- **THEN** Zod validation fails the build with a precise error citing the missing `commit` field and the offending file path.

#### Scenario: Non-allowlisted repo rejected

- **WHEN** a post declares `repo: "evil/repo"` (not on the allowlist)
- **THEN** Zod enum validation fails the build before any rendering or SSRF-prone operation runs.

#### Scenario: Truncated SHA rejected

- **WHEN** a post declares `commit: "abc1234"` (7 hex chars, not 40)
- **THEN** Zod validation fails because the redeploy pipeline requires full 40-hex merge SHAs for SHA-pinning to be unambiguous.

#### Scenario: Absolute-URL cover rejected (SSRF guard)

- **WHEN** a post declares `cover: "https://169.254.169.254/latest/meta-data/iam/security-credentials/"`
- **THEN** Zod validation fails before `astro:assets` ever attempts the fetch; the build does not proceed.

#### Scenario: Relative cover under posts/assets passes

- **WHEN** a post declares `cover: "./assets/launch-cover.png"` or `cover: "posts/assets/launch-cover.png"`
- **THEN** Zod validation passes and the cover is processed by the local `astro:assets` pipeline.

#### Scenario: Future-dated post excluded but build succeeds

- **WHEN** a post declares `published: "2027-01-01"` and the build runs on 2026-05-01
- **THEN** `getCollection('pages/writing')` does NOT include the post in returned entries; the build succeeds without error and the post becomes visible after a rebuild on or after 2027-01-01.
