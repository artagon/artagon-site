# Hosted CI acceptance for the shared Playwright build (tasks 3.1–3.3, `site-j2l.4`)

Observed on draft PR #94 (`swarm/2026-11-02-integration`), GitHub-hosted runners, 2026-11-03. Run IDs are from `artagon/artagon-site` Actions.

## Verified on hosted CI

| Scenario (spec)                                                                                                  | Run / job                                                              | Observation                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One build per run; every browser consumer downloads and verifies it (`build-config` single-build scenario)       | run `41645205476`, attempt 1                                           | `build` ran once and wrote provenance; `test (1)`–`test (5)`, `visual-regression` and `accessibility` each ran **Download built site** and **Verify build provenance** with conclusion `success`, and none ran `npm run build`.                                                                                                             |
| Partial rerun of a failed consumer verifies against the attempt-1 producer (`check-site-quality` rerun scenario) | run `41645205476`, attempt 2, `visual-regression` job `125952596321`   | "Re-run failed jobs" carried `build` over from attempt 1 (same start time, 13:32:20Z). The rerun downloaded artifact `playwright-dist-41645205476-1` (ID 13234702935) with digest check `sha256:cbd699d4…b492`, ran `verify-build-provenance.mjs --verify` with `EXPECTED_PRODUCER_RUN_ATTEMPT: 1`, and logged `Build provenance verified`. |
| `merge-reports` fails closed when a required browser job fails (`build-config` merge-reports scenario)           | run `41645205476`, attempt 2, `merge-reports` job `125953837668`       | With `BUILD_RESULT`, `TEST_RESULT` and `ACCESSIBILITY_RESULT` all `success` and `VISUAL_RESULT: failure` on `pull_request`, it exited 1: `Visual regression must succeed; only dispatch may skip it.`                                                                                                                                       |
| `merge-reports` fails closed when `test` fails                                                                   | run `41640485556` (head `97ede9a`), `merge-reports` job `125935662607` | `TEST_RESULT: failure` (a shard failed) produced `Build, test, and accessibility must all succeed.` and exit 1.                                                                                                                                                                                                                             |

The `visual-regression` failures in these runs are the expected 18 midnight snapshots awaiting the trusted-main reseed (`site-grc`); hosted results (18 failed, 31 passed) match the local pinned-image calibration recorded in `docs/agents/testing.md`.

## Not yet exercised on hosted CI

- **Expired artifact** (past the 1-day retention) and **real provenance mismatch**: covered only by `tests/ci-workflow-behavior.test.mts` fixtures; no hosted run has hit them.
- **Producer cancellation or upload failure** leading to skipped consumers.
- **`workflow_dispatch` on `main`**, where `visual-regression` is skipped and `merge-reports` must pass: first exercised by the post-merge update-snapshots dispatch.
- **Fork pull requests** (read-only token, artifact access across the fork boundary).
