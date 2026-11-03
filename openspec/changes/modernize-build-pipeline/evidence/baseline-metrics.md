# Pre-change baseline metrics (task 0.2)

Captured 2026-11-03 under the pinned runtime from `.nvmrc`. This replaces the earlier single-sample local observation of 22.34 s (Node 26 on a loaded macOS host, `.ntm/swarm/2026-11-02/r1b/r1b-VioletJaguar.md`), which is not comparable.

## Method

- **Tree:** integration commit `95a0346`, the last commit before any `modernize-build-pipeline` implementation landed (layout PR 7, 8 and 10 and the Astro 7 consolidation are included; the postbuild runner, LHCI contract and shared Playwright build are not). Exported with `git archive` into a disposable directory, with a throwaway Git repository so the gates that call `git ls-files` work. The worktree was not touched.
- **Runtime:** Docker image `node:22.23.4-bookworm`. The tooling reported `node v22.23.4`, npm `10.9.9`, `aarch64`, 12 CPUs.
- **Install:** `npm ci --no-audit --no-fund` took 13.55 s and exited 0.
- **Timing:** wall-clock from `date +%s.%N` around each command. Each postbuild stage ran as its own command, in the order of the pre-change `scripts.postbuild` chain, so per-stage times include one process start (plus npm's start-up for `npm run` stages).
- **Cold vs warm:** cold = `.build/` and `.astro/` removed before the pass; warm = the immediately following pass with those caches present. The OS file cache was warm for both. **One sample per condition**; differences under about 0.2 s are noise.

## Build timings (seconds, all exit 0)

| Step                                                 |     Cold |     Warm |
| ---------------------------------------------------- | -------: | -------: |
| prebuild (`npm run build:prebuild-chain`)            |     0.21 |     0.19 |
| `astro build`                                        |     3.31 |     2.40 |
| postbuild 1: `verify:prerequisites`                  |     0.09 |     0.11 |
| postbuild 2: `verify:design-prerequisites`           |     0.09 |     0.10 |
| postbuild 3: `lint:tokens`                           |     0.10 |     0.10 |
| postbuild 4: `verify-font-self-hosting.mjs`          |     0.04 |     0.04 |
| postbuild 5: `minify-theme-css.mjs`                  |     0.07 |     0.05 |
| postbuild 6: `sri.mjs`                               |     0.29 |     0.27 |
| postbuild 7: `csp.mjs`                               |     0.37 |     0.32 |
| postbuild 8: `lint:skip-link`                        |     0.30 |     0.30 |
| postbuild 9: `lint:taglines`                         |     0.12 |     0.17 |
| postbuild 10: `lint:design`                          |     0.41 |     0.44 |
| postbuild 11: `lint:design-md-uniqueness`            |     0.09 |     0.10 |
| postbuild 12: `verify:indexation`                    |     0.40 |     0.53 |
| **Pass total** (steps plus harness overhead)         | **6.11** | **5.22** |
| Whole lifecycle `npm run build`, warm, as CI runs it |        — | **4.52** |

The 12 postbuild stages total about 2.4 s; `astro build` is the largest single step. The whole-lifecycle run is faster than the sum of separately launched steps because the chained npm scripts share one parent process.

## Built output

| Measure                                |                      Value |
| -------------------------------------- | -------------------------: |
| `.build/dist/` uncompressed (`du -sb`) | 1,842,476 bytes (86 files) |
| `.build/dist/` archived (`tar -czf`)   |              910,032 bytes |

## CI build count before the change

From `.github/workflows/playwright.yml` at `95a0346`:

- 4 `run: npm run build` steps: line 120 (`test`), line 254 (`visual-regression`), line 302 (`update-snapshots`) and line 387 (`accessibility`).
- On every pull-request run, `test` runs its matrix of 5 shards (`shard: [1, 2, 3, 4, 5]`, line 81), and `visual-regression` and `accessibility` each build once: **7 initial lifecycle builds per PR run**. `update-snapshots` builds only on a `workflow_dispatch` of `main` (line 275), so it adds an 8th build only on those runs.
- `tests/content-collections.spec.ts` keeps its **4 intentional schema-validation builds**: one isolated-build helper (`execFileSync` at line 48) invoked by the four frontmatter-schema tests at lines 107, 126, 145 and 179. These validate schema failures and are outside the shared-build change.

## Reproduction

`scratchpad/node22/run.sh` in the coordinator session (not committed) ran the steps above. To repeat: `git archive 95a0346`, extract it, `git init` and commit it, then in `node:22.23.4-bookworm` run `npm ci`, remove `.build` and `.astro`, and time `npm run build:prebuild-chain`, `npx astro build` and each `scripts.postbuild` stage twice.
