# Adversarial Review — SUPPLY-CHAIN / GIT-OPS / CI-OPS

**Change:** `add-brand-assets-and-writing-pipeline`
**Verified:** `gh api repos/artagon/content` → 404; `npm view sharp` → 0.34.5 (matches devDep); package.json has no `engines` field; existing `deploy.yml` already uses `concurrency: { group: pages, cancel-in-progress: true }` on Node 22; no `content-redeploy.yml` collision in current workflow set.

---

### F1 — `git clone --branch <REF>` cannot accept a SHA — BLOCKING — HIGH

**Citation:** spec.md L5; design.md L86; tasks.md 5.1; scenario L13 (`WRITING_REMOTE_REF="abc1234..."`).
**Finding:** `git clone --branch` only accepts branch and tag names, not SHAs. The dispatch payload (design.md L96) sends a 40-hex merge SHA as `WRITING_REMOTE_REF`, so every webhook-triggered build will exit 128 ("Remote branch <sha> not found"). The pipeline is broken on the only path that matters.
**Remediation:** Mandate `git init && git remote add origin … && git fetch --depth 1 --filter=blob:none origin <SHA> && git checkout FETCH_HEAD` for SHA refs; allow `--branch` only when `WRITING_REMOTE_REF` matches `refs/heads/*` or `refs/tags/*`. Update spec L5, design L86, tasks 5.1; add scenario covering both forms.

### F2 — Sparse-checkout ordering is wrong; partial-clone benefit lost — BLOCKING — HIGH

**Citation:** spec L5 ("sparse-checking out only the path"); design L86.
**Finding:** Without `--sparse` plus `--no-checkout` and a post-clone `git sparse-checkout set` BEFORE checkout, the clone materializes the full tree and pulls every blob ≤ 10 MB. The current single-line spec is parenthetical prose, not a real command sequence. Also `blob:limit=10m` still pulls non-post binaries from the content repo (unwanted).
**Remediation:** Spec the exact sequence: `git clone --no-checkout --depth 1 --filter=blob:none --sparse <url> <dir> && git -C <dir> sparse-checkout set posts/ && git -C <dir> checkout`. Switch to `blob:none` since posts are markdown.

### F3 — `content-redeploy.yml` lacks `concurrency:`; deploys race — BLOCKING — MEDIUM

**Citation:** tasks 7.1; existing `deploy.yml` L4.
**Finding:** N rapid dispatches launch N parallel builds; slowest wins on Pages, producing non-monotonic deploys. Existing `deploy.yml` already uses `concurrency: { group: pages, cancel-in-progress: true }` — the new workflow must too.
**Remediation:** Add Requirement to spec: "`content-redeploy.yml` MUST set `concurrency: { group: 'pages', cancel-in-progress: true }`." Add scenario.

### F4 — Default `artagon/content` repo does not exist (404) — HIGH — HIGH

**Citation:** proposal L7; design L82; `gh api repos/artagon/content` → 404.
**Finding:** Spec graceful-disables only on EMPTY env, not on clone-failed. With default `artagon/content` set but the repo missing, `git clone` exits 128 and `astro build` never runs — fail-closed CI but confusing local-dev failure. The "Remote content unreachable" risk mitigation in the proposal does not match what the spec actually requires.
**Remediation:** Either (a) defer the default to empty string until the repo exists, or (b) add a Requirement that clone-failures emit a structured warning and exit 0 when `WRITING_REMOTE_FAIL_OPEN=1` (default for local dev), exit non-zero in CI. Recommend (a) as the simpler option.

### F5 — Fine-grained PAT scope/rotation undocumented — MEDIUM — MEDIUM

**Citation:** design L103; proposal L51 ("No webhook auth/secret rotation policy").
**Finding:** Fine-grained PATs expire (default 90 days); on expiry dispatches 401 silently. Spec wording "scoped to repo: artagon/artagon-site (only the dispatches endpoint)" is not a real fine-grained scope — the actual permission is `Contents: Read and write` on `artagon/artagon-site`. GITHUB_TOKEN cannot dispatch cross-repo, so PAT is mandatory. Out-of-scope rotation policy means dispatches will silently break in 90 days.
**Remediation:** Add Requirement: "`CONTENT_DISPATCH_TOKEN` MUST be fine-grained, `Contents: Read+Write` on `artagon/artagon-site`, expiry ≤ 90 days, rotation tracked in `docs/writing-pipeline.md`." Add a calendar reminder or fail-loud monitoring (404/401 alert in workflow logs).

### F6 — `.cache/content-repo/` not cached across CI runs — LOW — LOW

**Citation:** No `actions/cache` step in tasks 7.1.
**Remediation:** Optional: cache keyed on `WRITING_REMOTE_REPO + WRITING_REMOTE_REF`; identical SHA reruns skip clone.

### F7 — Committed PNG growth long-term — LOW — MEDIUM

**Citation:** design L68 (~5–10 MB).
**Finding:** Acceptable for low-churn; revisit if regen > 2/year. Consider git-LFS in follow-up.

### F8 — Lockfile gating with `adopt-design-md-format` integrity check — LOW — LOW

**Citation:** tasks 3.3, 5.2 add scripts; no new deps.
**Remediation:** Confirm lockfile integrity check is unaffected; add explicit note in tasks 9.x.

---

## Verdict

**APPROVE-WITH-CHANGES** — must-fix count: **3** (F1, F2, F3). F4 and F5 strongly recommended; F6–F8 nice-to-have.
