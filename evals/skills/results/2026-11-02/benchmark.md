# Skill Benchmark: artagon-skills

**Model**: claude-opus-5-5
**Date**: 2026-11-02T16:05:55Z
**Evals**: anchored-tooltip, faqsearch-review, oauth-draft-review, pricing-hero, rebac-check-howto, starlight-install, tailwind-progress-bar (1 run each per configuration)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|------------|---------------|-------|
| Pass Rate | 100% ± 0% | 96% ± 9% | +0.04 |
| Time | 214.8s ± 100.7s | 210.5s ± 78.6s | +4.3s |
| Tokens | 127023 ± 21523 | 138092 ± 16827 | -11068 |
## Analyst notes

- Non-discriminating set: 35 of 36 assertions passed in both configurations. The baseline repo copy still carries CLAUDE.md/AGENTS.md, DESIGN.md, ADR 0001, verify-stack.mjs and the adopt-tailwind-and-starlight proposal, so the guardrails these assertions test are already enforced by repo docs without the skills. The +4 pp delta comes from one format assertion (faqsearch-review file:line format).
- Skill-only wins not covered by any assertion: tailwind-progress-bar/with_skill found theme.css `body > * { z-index: 1 }` that would hide an in-<main> bar under the sticky header; oauth-draft-review/with_skill identified RFC 9725 as WHIP and checked claims against primary sources (8 fetches); rebac-check-howto/with_skill set draft: true, checked the Zanzibar figures against the paper, and found DESIGN.md drift (<StandardChip>, <Diagram>, src/content/posts/); anchored-tooltip/with_skill used interestfor + popover=hint + CSS anchor positioning with @supports fallback, as the guides recommend.
- Baseline-only wins not covered by any assertion: oauth-draft-review/without_skill caught the frontmatter schema failures (44-char description, missing headline/lede); faqsearch-review/without_skill found the 1.4.11 input-border contrast and missing font: inherit; starlight-install/without_skill found Starlight 0.39.3 supports Astro 6 (registry-verified by the grader), a path the skill's 'needs Astro 7' framing hides.
- Regression to fix in artagon-stack-guard / adopt-tailwind-and-starlight: both state Starlight requires Astro 7; 0.39.3 declares astro ^6.0.0. The proposal should list it as an option.
- Data bug in the modern-web-guidance fork: several guides claim anchor positioning ships only in Safari 27, while Chromium has shipped it since 125 (reported by anchored-tooltip/with_skill; not yet verified).
- Cost: with-skill runs used 8% fewer tokens (127k vs 138k) at similar wall time (215s vs 211s); time variance is high (tooltip runs took 6-7 min). One run per configuration, so no variance estimate per eval.
- rtk is not installed in the eval container; runs that tried `rtk rg` fell back to built-in Grep. Re-run on a machine with rtk for a faithful check of the routing rule.
- Trigger evals (separate, description-only): 0 false positives on 20 near-miss queries, but only 4 of 20 should-trigger queries fired (each at 50%). All four artagon-* descriptions under-trigger and need a pushier rewrite (skill-creator run_loop).

## Trigger evals (description only, 2 runs per query)

| Skill | Should trigger (fired) | Near-miss (correctly ignored) |
|---|---|---|
| artagon-authz-content-review | 1/5 | 5/5 |
| artagon-design-system | 1/5 | 5/5 |
| artagon-docs-authoring | 0/5 | 5/5 |
| artagon-stack-guard | 2/5 | 5/5 |
