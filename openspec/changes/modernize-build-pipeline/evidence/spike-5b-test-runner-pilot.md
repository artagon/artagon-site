# Spike 5B — node:test to Vitest pilot

**Recommendation: needs more evidence before consolidation.** A seven-case pure conversion test ports cleanly, but the timing samples cover different suites and do not establish a speedup from migration. Consolidation would lose the independent `node:test` execution boundary and risks the documented `@playwright/test` matcher collision if the palette test is moved into Vitest. Keep that boundary until an actual migrated suite, discovery, and CI behavior are proven.

## Environment and timing

The pinned `.nvmrc` Node `22.23.4` was unavailable; all measurements below used Node **`v26.13.0`**, in a disposable copy outside the worktree with its own Git fixture and symlinked shared dependencies. The Node 22.23.4 repeat is in the next section. No installation or dependency changes were made. Each suite was run once as the first sample in the copied fixture and once immediately afterward as the repeat. These are process-first and repeat samples, not OS-cache-cold measurements; other build activity had already warmed filesystem caches. There was one sample per condition, so differences are not statistically meaningful.

| Command                                                                            | First wall time | Repeat wall time | Cases per run        |
| ---------------------------------------------------------------------------------- | --------------: | ---------------: | -------------------- |
| `npm run test:node --ignore-scripts=false`                                         |         19.16 s |          17.59 s | 191 passed           |
| `npm run test:vitest --ignore-scripts=false -- --maxWorkers=2 --testTimeout=30000` |         45.53 s |          56.12 s | 96 files, 829 passed |

Each command exited 0. Timing used `time -p`; fixture Git commits inherited only a process-scoped `GIT_CONFIG_COUNT=1`, `commit.gpgsign=false` override. Different case sets and parallelism prevent an apples-to-apples runner comparison. The pinned-runtime repeat follows.

## Pinned-runtime repeat (Node 22.23.4)

Run 2026-11-03 in Docker image `node:22.23.4-bookworm` (`node v22.23.4`, `aarch64`, 12 CPUs) on a disposable `git archive` export of integration head `2452319` with its own throwaway Git repository; the worktree was not touched. `npm ci` took 15.06 s. The site was built first (`npm run build`, 5.27 s), as CI does before its unit suites; `jq` was installed because the CI image installs it before Vitest. Default configuration for both runners (no timeout or worker overrides). One sample per condition.

| Command               | First run |  Repeat | Cases per run                                       |
| --------------------- | --------: | ------: | --------------------------------------------------- |
| `npm run test:node`   |    1.28 s |  1.66 s | 197 tests, 197 pass, 0 fail, 0 skipped              |
| `npm run test:vitest` |   10.77 s | 10.88 s | 97 files passed, 1 skipped; 1878 passed, 32 skipped |

All four commands exited 0. A first attempt without the build ran Vitest against a missing `.build/dist/` and failed 17 build-dependent cases in 4 files (`frontend-built-contracts`, `lint-lhci-trailing-slash`, `lint-rss-discovery`, `lint-visual-regression-selectors`); that was a harness omission, not a runtime difference, and the rerun above includes the build.

The Node 22.23.4 pilot repeated the conversion below: `node --test tests/oklch-to-hex.test.mjs` passed 7/7 (0.08 s); the Vitest copy, which differs only in its import line, passed 7/7 (0.48 s); the negative control (black expectation changed to white) exited 1 with 1 failed and 6 passed. `tests/visual-palette-threshold.test.mjs` kept SHA-256 `f964c48a76d75584f3d2787109e6dc73c22eef31f66ddad5f6cc07edfb767d4c` before and after.

The recommendation is unchanged: `node:test` is already the cheaper runner at about 1.5 s for 197 cases, so migration buys no measured speed and would lose the separate process boundary that keeps the `@playwright/test` matcher collision out of Vitest.

## Pilot

Copied `tests/oklch-to-hex.test.mjs` to a disposable `tests/oklch-spike.test.mts`, changing only `import { test } from 'node:test'` to `import { test } from 'vitest'`; all assertions and test bodies were retained. `node --test tests/oklch-to-hex.test.mjs` passed 7/7, and `npx --no-install vitest run tests/oklch-spike.test.mts --maxWorkers=1 --testTimeout=30000` passed 7/7. As a negative control, changing the expected black result to white caused the Vitest copy to exit 1 with one failing case; the disposable copy was restored afterward. `tests/visual-palette-threshold.test.mjs` was never edited: its SHA-256 was `f964c48a76d75584f3d2787109e6dc73c22eef31f66ddad5f6cc07edfb767d4c` before and after, including in the production worktree.

## Immutability guard

The complete task guard passed on the production worktree before and after experiments: unstaged diff empty, staged diff empty, and no untracked paths under the declared guarded roots. In a separate disposable Git fixture, a staged `scripts/` probe made the guard exit 1; the same probe untracked also made it exit 1; removal restored exit 0. No production test or script was edited.
