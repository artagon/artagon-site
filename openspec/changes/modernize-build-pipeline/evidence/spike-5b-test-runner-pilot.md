# Spike 5B — node:test to Vitest pilot

**Recommendation: needs more evidence before consolidation.** A seven-case pure conversion test ports cleanly, but the timing samples cover different suites and do not establish a speedup from migration. Consolidation would lose the independent `node:test` execution boundary and risks the documented `@playwright/test` matcher collision if the palette test is moved into Vitest. Keep that boundary until an actual migrated suite, discovery, and CI behavior are proven.

## Environment and timing

The pinned `.nvmrc` Node `22.23.4` was unavailable; all measurements below used Node **`v26.13.0`**, in a disposable copy outside the worktree with its own Git fixture and symlinked shared dependencies. **Node 22.23.4 results remain UNVERIFIED.** No installation or dependency changes were made. Each suite was run once as the first sample in the copied fixture and once immediately afterward as the repeat. These are process-first and repeat samples, not OS-cache-cold measurements; other build activity had already warmed filesystem caches. There was one sample per condition, so differences are not statistically meaningful.

| Command | First wall time | Repeat wall time | Cases per run |
| --- | ---: | ---: | --- |
| `npm run test:node --ignore-scripts=false` | 19.16 s | 17.59 s | 191 passed |
| `npm run test:vitest --ignore-scripts=false -- --maxWorkers=2 --testTimeout=30000` | 45.53 s | 56.12 s | 96 files, 829 passed |

Each command exited 0. Timing used `time -p`; fixture Git commits inherited only a process-scoped `GIT_CONFIG_COUNT=1`, `commit.gpgsign=false` override. Different case sets and parallelism prevent an apples-to-apples runner comparison. The pinned-runtime repeat remains a follow-up.

## Pilot

Copied `tests/oklch-to-hex.test.mjs` to a disposable `tests/oklch-spike.test.mts`, changing only `import { test } from 'node:test'` to `import { test } from 'vitest'`; all assertions and test bodies were retained. `node --test tests/oklch-to-hex.test.mjs` passed 7/7, and `npx --no-install vitest run tests/oklch-spike.test.mts --maxWorkers=1 --testTimeout=30000` passed 7/7. As a negative control, changing the expected black result to white caused the Vitest copy to exit 1 with one failing case; the disposable copy was restored afterward. `tests/visual-palette-threshold.test.mjs` was never edited: its SHA-256 was `f964c48a76d75584f3d2787109e6dc73c22eef31f66ddad5f6cc07edfb767d4c` before and after, including in the production worktree.

## Immutability guard

The complete task guard passed on the production worktree before and after experiments: unstaged diff empty, staged diff empty, and no untracked paths under the declared guarded roots. In a separate disposable Git fixture, a staged `scripts/` probe made the guard exit 1; the same probe untracked also made it exit 1; removal restored exit 0. No production test or script was edited.
