# Fork notes: modern-web-guidance

Upstream: https://github.com/GoogleChrome/modern-web-guidance, `skills/modern-web-guidance/`, at the
commit recorded in `skills-lock.json` (`skills["modern-web-guidance"].commit`). License: Apache-2.0
(`LICENSE`). This notice states the changes made to the upstream files, per Apache-2.0 §4(b).

## Changes

1. **`SKILL.md` rewritten.** Upstream tells the agent to run the npm package `modern-web-guidance`
   on a moving version tag for every search and retrieval. That fetches and executes unpinned code,
   needs outbound network, and sends usage telemetry (installation counts, retrieved guide IDs and
   search queries, per the upstream README). This fork reads the guides vendored in `guides/`
   instead, adds artagon-site's authority order (AGENTS.md, ADR 0001, DESIGN.md, CSP/SRI,
   accessibility contracts), and drops the upstream "disclose skill usage" output section.
2. **Cross-references in `guides/` rewritten.** Every ``(via `npx -y modern-web-guidance@<tag> retrieve "<id>"`)``
   became ``(guide `<id>`)``, and every bare `` `npx … retrieve "<id>"` `` became `` guide `<id>` ``.
   No other guide text changed. A few referenced IDs (for example `element-shape`,
   `fit-text-to-container`, `gradient-borders`, `line-drawing-animation`, `slider-tooltip`) are not
   in the vendored set; `SKILL.md` tells agents to proceed without them.
3. **Not vendored:** the upstream `chrome-extensions` skill, plugin manifests, and the npm CLI.

## Remaining reviewed network references

Some guides show code samples that import a polyfill from a CDN on a moving version tag. They are
sample code for a site, not instructions to the agent, and they are listed file by file in
`skills-lock.json` under `acknowledged`. `SKILL.md` forbids copying them into artagon-site, whose CSP
and SRI postbuild gates reject third-party script origins anyway.

## Re-vendoring

1. Clone upstream at a reviewed commit into a scratch directory outside the repo. Do not run its CLI.
2. Read the diff of `skills/modern-web-guidance/` against the recorded commit.
3. Replace `guides/` with the new upstream `guides/`, re-apply change 2 with the same two
   substitutions, and keep this `SKILL.md` unless upstream changed what the guides contain.
4. Update `commit`, `files` and `acknowledged` in `skills-lock.json` (`node scripts/verify-skills.mjs --json`
   lists what changed), then run `npm run verify:skills`.
