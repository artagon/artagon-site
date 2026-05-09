## ADDED Requirements

### Requirement: Build-Time Remote Fetch (SHA-pinned)

`scripts/fetch-content.mjs` MUST fetch content from the repo named in `WRITING_REMOTE_REPO` at the commit named in `WRITING_REMOTE_REF` to `.cache/content-repo/`, sparse-checking out only the path named in `WRITING_REMOTE_PATH` (default: `posts/`). Because `WRITING_REMOTE_REF` is normally a 40-hex commit SHA (sent by the dispatch payload, not a branch name), the clone command sequence MUST be:

```
rm -rf .cache/content-repo
git clone --no-checkout --depth 1 --filter=blob:none --sparse --no-tags <url> .cache/content-repo
git -C .cache/content-repo sparse-checkout set $WRITING_REMOTE_PATH
git -C .cache/content-repo fetch --depth 1 origin $WRITING_REMOTE_REF
git -C .cache/content-repo checkout FETCH_HEAD
```

`git clone --branch <REF>` MUST NOT be used when `WRITING_REMOTE_REF` is a SHA (it accepts only branch and tag names). When `WRITING_REMOTE_REF` matches `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` the script MAY use `--branch` instead of the fetch+checkout sequence. The script MUST `rm -rf .cache/content-repo` before clone (cleanup of any stale clone, embargoed-content guard). The script MUST exit 0 silently when `WRITING_REMOTE_REPO` is empty (graceful disable). All fetching MUST occur at build time only; no runtime fetches to GitHub MAY appear in client output.

#### Scenario: Empty env disables fetch

- **WHEN** `WRITING_REMOTE_REPO=""` and `npm run fetch:content` runs
- **THEN** the script exits 0 with no clone attempt; subsequent `astro build` proceeds with local-only writing.

#### Scenario: SHA ref clones via fetch+checkout (not --branch)

- **WHEN** `WRITING_REMOTE_REPO="artagon/content"` and `WRITING_REMOTE_REF="abc1234abc1234abc1234abc1234abc1234abc12"` (40-hex SHA)
- **THEN** the script uses `git fetch --depth 1 origin <SHA> && git checkout FETCH_HEAD` (NOT `git clone --branch <SHA>`); `.cache/content-repo/` contains `posts/` from that exact commit; subsequent `astro build` includes those posts.

#### Scenario: Branch ref MAY use --branch shortcut

- **WHEN** `WRITING_REMOTE_REF="refs/heads/main"`
- **THEN** the script MAY use `git clone --depth 1 --branch main` directly.

#### Scenario: Stale cache cleared before clone

- **WHEN** `.cache/content-repo/` already exists from a prior run
- **THEN** `fetch-content.mjs` removes the directory before cloning; no stale embargoed content can leak into the build.

#### Scenario: No client-side GitHub call

- **WHEN** `dist/` is searched for `api.github.com`, `github.com/.../raw`, or `raw.githubusercontent.com` references in JS payloads
- **THEN** zero matches; remote content lives only in pre-rendered HTML.

### Requirement: Dual-Source Content Collection

`src/content.config.ts` MUST configure the `writing` collection (pre-pt414 cited as `pages/writing` — collection is named `writing`, not `pages/writing`; the `pages` and `writing` collections are SIBLINGS under `src/content/`. Verified: `src/content.config.ts:128` declares `const writing = defineCollection({...})` with `base: "./src/content/writing"` at line 131. Sister to pt401/pt413 path-nesting drift) with two glob loaders unified under one schema: (a) the local glob at `src/content/writing/**/*.{md,mdx}` (pre-pt414 cited as `src/content/pages/writing/**/*.{md,mdx}`), (b) the remote glob at `.cache/content-repo/posts/**/*.{md,mdx}`. Both glob outputs MUST be validated by the same Zod schema (extended per `site-content`'s additive frontmatter requirement). Local and remote entries MUST coexist in the same collection without duplicate `id` collisions; CI MUST fail if duplicate ids are detected.

The collection's content-layer cache key MUST include `entry.data.commit` (for remote posts) and a SHA-256 hash of the file body (for local posts). Astro's default `.astro/` cache is path-mtime-keyed; with the SHA-pinned remote pipeline, the SAME path can hold DIFFERENT commits across rebuilds (force-push, rebase) → without commit-aware caching, stale parses serve while the build-sha meta tag updates, producing a desynced page where users see old content with a new SHA. The loader MUST therefore emit a `digest` in its `loader.load` callback that incorporates `entry.data.commit ?? sha256(fileContent)`; cache invalidation tracks content, not path.

#### Scenario: Dual sources merge cleanly

- **WHEN** `src/content/writing/local.mdx` (pre-pt414 cited as `src/content/pages/writing/local.mdx` — sister path-nesting drift to pt401/pt413) and `.cache/content-repo/posts/remote.mdx` both exist with distinct slugs
- **THEN** `getCollection('writing')` returns both entries, validated under the same schema (pre-pt415 cited as `getCollection('pages/writing')` — collection is named `writing` per `src/content.config.ts:128`; sister to pt414).

#### Scenario: Duplicate id fails build

- **WHEN** a local post and a remote post produce the same collection id
- **THEN** the build fails with a precise error naming both file paths.

### Requirement: Webhook-Triggered Redeploy (Hardened)

`.github/workflows/content-redeploy.yml` MUST trigger on `repository_dispatch` with `event_type` of `pull-request-merged` only; other event types MUST NOT trigger this workflow. The workflow MUST hardcode `WRITING_REMOTE_REPO=artagon/content` and IGNORE any `client_payload.repo` value (defense against social-engineered or leaked-PAT dispatches that name an attacker-controlled repo). The workflow MUST declare an explicit minimum-privilege `permissions:` block at workflow scope: `permissions: { contents: read, pages: write, id-token: write }` (the last two only on the deploy job). All `uses:` references in this workflow MUST be pinned by full 40-hex commit SHA (NOT by tag — tag pinning is reassignable); a comment on each line MUST record the human-readable version (e.g., `uses: actions/checkout@<sha>  # v4.2.0`). Dependabot's `package-ecosystem: github-actions` MUST be enabled at `.github/dependabot.yml` to surface SHA-pin upgrades.

The workflow MUST validate `client_payload.sha` against `^[a-f0-9]{40}$`; malformed values MUST exit the workflow non-zero before any clone or build runs. `client_payload.ref` MUST NOT be passed to git as a branch argument; if used, it MUST be validated against `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` and passed via the `--` boundary so it cannot be interpreted as a git option (defense against argument-injection attacks like `--upload-pack=…`, CVE-2017-1000117 family).

Before fetch, the workflow MUST verify the `sha` is reachable in `artagon/content`. `git ls-remote <repo> <sha>` is NOT sufficient — `ls-remote` matches advertised refs only, and merge SHAs are not refs. The verification MUST instead use the GitHub Commits API: `gh api repos/artagon/content/commits/$sha --jq .sha` (returns the SHA on success, exits non-zero on 404 or malformed). After clone+fetch, an additional safety check `git -C .cache/content-repo cat-file -e "$sha"` MUST confirm the object exists locally; absence MUST exit the workflow non-zero. The workflow MUST set `concurrency: { group: 'pages', cancel-in-progress: true }` to match the existing `deploy.yml` and avoid racing parallel deploys. The workflow MUST reuse the existing GitHub Pages deploy action.

Cross-repo commit-status posting (the "PR status check" referenced in the End-to-End Latency requirement) is NOT possible with the default site repo `GITHUB_TOKEN`. The workflow MUST authenticate the `gh api repos/artagon/content/statuses/$sha` call using a separate fine-grained PAT secret `CONTENT_STATUS_TOKEN` scoped to `Commit statuses: Read+Write` on `artagon/content` only; rotation policy ≤90 days documented in `docs/writing-pipeline.md` alongside `CONTENT_DISPATCH_TOKEN`.

#### Scenario: Valid dispatch redeploys at hardcoded repo

- **WHEN** `artagon/content` dispatches `event_type=pull-request-merged` with `client_payload.sha="abc1234abc1234abc1234abc1234abc1234abc12"`
- **THEN** the workflow sets `WRITING_REMOTE_REPO=artagon/content` (NOT from payload), `WRITING_REMOTE_REF=<sha>`, and rebuilds + deploys.

#### Scenario: Attacker-named repo in payload ignored

- **WHEN** a dispatch arrives with `client_payload.repo="evil/repo"` (any value)
- **THEN** the workflow IGNORES `client_payload.repo` entirely and clones from the hardcoded `artagon/content` only.

#### Scenario: Wrong event_type ignored

- **WHEN** a dispatch arrives with `event_type=foo`
- **THEN** the workflow does not run.

#### Scenario: Malformed sha rejected

- **WHEN** a dispatch arrives with `client_payload.sha="../etc/passwd"` or any value not matching `^[a-f0-9]{40}$`
- **THEN** the workflow exits non-zero before cloning; no build runs.

#### Scenario: SHA not present in upstream rejected (Commits API)

- **WHEN** a dispatch arrives with a well-formed but non-existent `sha` (`gh api repos/artagon/content/commits/$sha` returns 404)
- **THEN** the workflow exits non-zero before fetch.

#### Scenario: SHA passes Commits API but cat-file fails after fetch

- **WHEN** the Commits API returns the SHA but the post-fetch `git cat-file -e "$sha"` fails (filtered/blocked)
- **THEN** the workflow exits non-zero before build.

#### Scenario: Workflow declares minimum permissions

- **WHEN** `.github/workflows/content-redeploy.yml` is parsed
- **THEN** it contains an explicit `permissions:` block with `contents: read` at workflow scope; `pages: write` and `id-token: write` only on the deploy job; no other permissions granted.

#### Scenario: All actions SHA-pinned

- **WHEN** the workflow YAML is scanned for `uses:` lines
- **THEN** every `uses:` reference is `<owner>/<action>@<40-hex-sha>` form with a `# v<semver>` comment; no `@v4`, `@main`, or `@latest` tag references appear.

#### Scenario: Cross-repo status uses fine-grained PAT

- **WHEN** the workflow posts a commit status to `artagon/content`
- **THEN** the call uses `CONTENT_STATUS_TOKEN` secret (NOT `GITHUB_TOKEN`); the token is fine-grained, scoped to `Commit statuses: Read+Write` on `artagon/content` only.

#### Scenario: Malformed ref rejected

- **WHEN** `client_payload.ref` is present and contains characters outside `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` (e.g., `--upload-pack=evil`, `;rm -rf /`, etc.)
- **THEN** the workflow exits non-zero before fetch.

#### Scenario: Concurrent dispatches do not race

- **WHEN** three rapid dispatches arrive within 30 seconds
- **THEN** only the most recent completes; earlier in-flight builds are canceled by the `concurrency` group; Pages deploys monotonically.

### Requirement: Edit-on-GitHub Link for Remote Posts (Repo Allowlisted)

Each `/writing/[slug]` page MUST render a "View source on GitHub" link iff `entry.data.repo`, `entry.data.path`, and `entry.data.commit` are all defined AND `entry.data.repo` matches an allowlist constant (default: `['artagon/content']`). The link target MUST resolve to `https://github.com/${repo}/blob/${commit}/${path}` (commit-pinned, not branch-floating). The link label MUST be "View source on GitHub" rather than "Edit on GitHub" because GitHub's edit pencil at a non-branch SHA spawns a fork-and-PR flow, not in-place editing — the wording must match the destination behavior. Local posts (those omitting `repo`) MUST NOT render the link. Posts whose `repo` is not in the allowlist MUST fail Zod schema validation at build time, preventing phishing through "Edit on GitHub" → attacker-controlled repo.

#### Scenario: Remote post shows view-source link pinned to commit

- **WHEN** a `/writing/[slug]` route renders a remote post with `repo="artagon/content"`, `path="posts/welcome.mdx"`, `commit="abc1234abc1234abc1234abc1234abc1234abc12"` (full 40-hex SHA per the schema's commit-format requirement)
- **THEN** the page contains `<a href="https://github.com/artagon/content/blob/abc1234abc1234abc1234abc1234abc1234abc12/posts/welcome.mdx">View source on GitHub</a>`.

#### Scenario: Local post hides view-source link

- **WHEN** a `/writing/[slug]` route renders a local post with `repo` undefined
- **THEN** the page does NOT contain a "View source on GitHub" link.

#### Scenario: Non-allowlisted repo rejected at validation

- **WHEN** a remote post declares `repo: "evil/repo"` (not on the allowlist)
- **THEN** Zod validation fails the build, naming the offending file and the rejected `repo` value.

### Requirement: MDX Component Allowlist (AST-Enforced)

Posts (local OR remote) MUST only use the MDX component allowlist `['StandardChip', 'StandardsRow', 'TrustChain', 'Diagram', 'Callout']`. Astro's MDX `components` config maps known names but does NOT reject unknown JSX (it falls through to render as plain HTML/custom-element); enforcement therefore MUST come from a remark/rehype plugin (e.g., a custom `remark-mdx-restrict-jsx`) that walks the MDX AST during build and throws on any AST node of these kinds whose `name` is not in the allowlist: `mdxJsxFlowElement` (block-position JSX), `mdxJsxTextElement` (inline JSX), `mdxFlowExpression` and `mdxTextExpression` (JSX wrapped in `{...}` expression position — bypass vector if not covered). Additionally, `mdxjsEsm` nodes (top-of-MDX `import` / `export` statements) MUST be rejected unconditionally for posts where `entry.data.repo` is defined (remote-source posts) — they could pull arbitrary remote modules. Local-source posts MAY use ESM imports for whitelisted helper modules, configured per-post by editor convention. The plugin MUST be wired into `astro.config.ts`'s `markdown.remarkPlugins` (or `mdx.remarkPlugins`) — file renamed from `astro.config.mjs` mid-USMR per pt342 archaeology; this change's own `design.md:129` and `tasks.md:55` already cite the `.ts` form, so this spec delta is internally consistent post-pt403. `astro build` MUST fail before reaching the renderer when a disallowed AST node is encountered. The allowlist + rejected AST kinds MUST be documented in `docs/writing-pipeline.md`.

#### Scenario: Disallowed component fails build at AST walk

- **WHEN** a remote post uses `<UntrustedThirdPartyWidget>` in MDX
- **THEN** the remark/rehype allowlist plugin throws during `astro build`, naming the component and the post's path; the renderer never executes.

#### Scenario: Allowlist component renders normally

- **WHEN** a post uses `<StandardChip id="dpop"/>`
- **THEN** the AST plugin permits the node and Astro renders the component.

#### Scenario: Allowlist documented

- **WHEN** a contributor opens `docs/writing-pipeline.md`
- **THEN** the file contains the exact 5-component list and the plugin path.

### Requirement: Graceful Local-Only Fallback

When `WRITING_REMOTE_REPO=""` (or unset), the build MUST succeed using only local-source posts; the home Writing widget MUST render the latest local post if one exists, or hide the widget if the local collection is empty. No CI failure MUST be triggered by an empty `WRITING_REMOTE_REPO`. The default value of `WRITING_REMOTE_REPO` MUST be empty until `artagon/content` exists publicly; once the upstream content repo is created, the default MAY be flipped to `artagon/content` in a follow-up edit (single-line change, separate PR).

#### Scenario: Empty env produces working build (no Lighthouse drift)

- **WHEN** CI runs with `WRITING_REMOTE_REPO=""` and the local collection has at least one post
- **THEN** `astro build` succeeds, the writing routes render local posts only, and Lighthouse CI passes the redesign's thresholds.

#### Scenario: Zero-post case

- **WHEN** both `WRITING_REMOTE_REPO=""` AND the local collection has zero entries
- **THEN** `astro build` succeeds, `/writing` renders an empty-state page (NOT a 404), the home Writing widget hides, and `/writing/feed.xml` emits an empty-but-valid RSS feed.

### Requirement: End-to-End Merge-to-Visible Latency

From PR-merge in `artagon/content` (the dispatch trigger) to the live `/writing/[slug]` page on **the production deployment at `https://artagon.com`** (NOT `astro preview`, NOT a CI-local synthesized URL — the latency target measures real user-facing time including GitHub Pages CDN propagation), the pipeline MUST complete within 10 minutes (P95). Every NON-noindex marketing route (i.e. routes not in `NOINDEX_ROUTES` from `src/lib/indexation.ts`) MUST emit `<meta name="artagon:build-sha" content="${WRITING_REMOTE_REF}">` in the head so contributors can verify their merge SHA is live. Noindex routes (`/console`, `/search`, `/play`, `/404`, `/brand`) MUST NOT emit the build-sha meta — they are tooling/app-shell surfaces, not user-facing content. The `content-redeploy.yml` workflow MUST post a status check back to the dispatching repo's PR via `gh api repos/artagon/content/statuses/${sha}` (using the fine-grained `CONTENT_STATUS_TOKEN` secret per the Webhook-Triggered Redeploy requirement) so authors see "deployed" or "failed" without polling. Deploy failures MUST surface in the workflow's tracking issue.

The latency-measurement test (`tests/writing-pipeline-latency.spec.ts`) MUST poll `https://artagon.com/writing/<slug>` (the deployed URL, not a localhost preview) until the rendered HTML's `<meta name="artagon:build-sha">` matches `WRITING_REMOTE_REF`, with a poll interval of 30 seconds and a hard timeout of 15 minutes. Failure to match within 15 minutes MUST fail the test. The 10-minute P95 target leaves 5 minutes of headroom in the timeout for CDN propagation.

#### Scenario: Merged PR is visible within 10 minutes

- **WHEN** `artagon/content` merges a PR at time T
- **THEN** by T+10 minutes the rendered `/writing/[slug]` page contains a head meta tag matching the merge SHA.

#### Scenario: Build-SHA visible on indexable routes

- **WHEN** a contributor inspects the deployed `/`, `/platform`, `/use-cases`, `/standards`, `/roadmap`, `/writing`, or any `/writing/[slug]` route
- **THEN** the head contains `<meta name="artagon:build-sha" content="${WRITING_REMOTE_REF}">` (40-hex value).

#### Scenario: Build-SHA absent on noindex routes

- **WHEN** a contributor inspects the deployed `/console`, `/search`, `/play`, `/404`, or `/brand` route
- **THEN** the head does NOT contain a `<meta name="artagon:build-sha">` tag.

#### Scenario: Status posted back to content-repo PR

- **WHEN** the deploy succeeds
- **THEN** `gh api repos/artagon/content/statuses/${sha}` shows a status with state `success` and target_url pointing at the deployed page.

### Requirement: Diagrams in Remote MDX

Remote posts MUST be able to use the same diagram authoring formats as local posts (Mermaid, D2, hand-authored SVG) per DESIGN.md §4.12 — there is NO out-of-scope exclusion for remote-source diagrams. The `astro:mdx` pipeline already processes both local and remote MDX uniformly; Mermaid and D2 fenced blocks MUST compile to inline SVG at build time for both sources. If a contributor at `artagon/content` includes a ` ```mermaid ` fenced block, the build MUST render it identically to a local post.

#### Scenario: Mermaid fenced block in remote post compiles

- **WHEN** a remote MDX post under `.cache/content-repo/posts/` contains a ` ```mermaid graph TD A-->B ``` ` fenced block
- **THEN** the rendered `/writing/[slug]` page contains an inline `<svg>` produced from the Mermaid source; no client-side Mermaid runtime is loaded.

#### Scenario: D2 fenced block in remote post compiles

- **WHEN** a remote MDX post contains a ` ```d2 ``` ` fenced block
- **THEN** the rendered page contains an inline `<svg>` produced from the D2 source.
