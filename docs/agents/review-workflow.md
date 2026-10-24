# Review workflow

Multi-agent review is the default for non-trivial changes. Every reviewer, sub-agent or direct, must load `.claude/skills/review-verification-protocol/` before reporting findings. The protocol requires reading the actual code (not only the diff), searching usages before calling anything unused, calibrating severity (Critical / Major / Minor / Informational), and downgrading net-new-code suggestions to Informational.

## Lenses

Lenses come from the `pr-review-toolkit` plugin. Each agent reads the same diff through a different lens.

| Lens            | Agent                                     | Use for                                                  |
| --------------- | ----------------------------------------- | -------------------------------------------------------- |
| Neutral         | `pr-review-toolkit:code-reviewer`         | First-pass correctness and style                         |
| Silent failures | `pr-review-toolkit:silent-failure-hunter` | Swallowed errors, weak error handling, fallback behavior |
| Types           | `pr-review-toolkit:type-design-analyzer`  | Encapsulation, invariants, enforcement                   |
| Comments        | `pr-review-toolkit:comment-analyzer`      | Comments that lie about the code; stale references       |
| Test coverage   | `pr-review-toolkit:pr-test-analyzer`      | Gaps against shipped logic                               |
| Simplification  | `pr-review-toolkit:code-simplifier`       | Duplication, over-conditional rendering                  |

## Tiers

Run lenses within a tier in parallel (one message, several Agent calls). Serialize between tiers when a Tier-1 finding would change the diff a later tier reviews.

| Tier | When                                             | Lenses                                                                                                                                                                                                          |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Every non-trivial diff                           | `code-reviewer`, `silent-failure-hunter`, `type-design-analyzer`; add an `astro-expert` custom brief for any diff touching `src/pages/`, `src/components/` `.astro` files, `src/layouts/`, or `astro.config.ts` |
| 2    | UI work, new tests, or comment-heavy diffs       | `comment-analyzer`, `pr-test-analyzer`, a `ux-design-expert` custom brief                                                                                                                                       |
| 3    | One-off adversarial briefs via `general-purpose` | Visual fidelity against the mock, token coverage, DESIGN.md ↔ implementation drift, accessibility (axe-core), CSP/SRI hash drift                                                                                |

## Architectural-review trio

These are custom briefs, not installed sub-agents. Spawn `general-purpose` with the brief as the prompt scope, in this order:

1. **Security architecture**: inline JSON-LD, `set:html`, and pre-paint script allow-lists; CSP and SRI; the ast-grep security rules; build-time versus runtime trust boundaries.
2. **Modularity and boundaries**: content collections versus typed data modules (no ad hoc `fs.readFile` outside `scripts/`); test-runner isolation; the `build.config.json` SSoT; orphaned exports; Astro `pages/` versus `components/` versus `layouts/`. The question to answer: can a new contributor predict where any change belongs?
3. **Type system**: discriminated unions over optional-prop combinations; invariant expression; tuples for fixed arity; `readonly` / `as const`; branded types where structural equivalence is unsafe.

## Prompt rules

- Keep each agent prompt under 500 words: scope, verification anchors, output format. List surfaces with FILE:LINE pointers; never ask an agent to "verify everything".
- Re-review mode: after fixes, ask the agent to verify the original findings only and add no new ones. Otherwise reviews never converge.

## Multi-model reviews through NTM

For a whole-repo adversarial review across models, run NTM panes and use one shared brief:

1. Write one brief with hard rules, the tool order, the evidence standard, and a fixed report format. Use repo-relative paths only, never absolute paths or account names. Keep the brief and reports in `.ntm/review/<date>/`, which git ignores.
2. Give each reviewer one lane. High-level lanes (architecture, build and CI, security) go to the strongest Claude and Codex models; line-level lanes go to Codex and Agy models.
3. Verify across levels: each report is checked by a reviewer at the opposite level, which returns CONFIRMED, PLAUSIBLE, or REFUTED per finding. Expect verifiers to lower severities and to refute findings whose "before" code does not match the file.
4. Keep reviewers read-only. Approve file reads and read-only searches; deny edits outside the report file.
5. File the verified findings as beads under one epic. Merge duplicate findings from different lanes into one bead as corroboration.

## Commit identity

Per "Commit messages" in `AGENTS.md`, never add vendor-attribution trailers, and never author commits as an assistant identity (for example `Claude <noreply@anthropic.com>` or `copilot-swe-agent[bot]`). PR #46 had to rewrite two such commits (`9a3981b`, `67abd4b`).
