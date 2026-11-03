## Context

This change implements the approved original cleanup plan numbered PR 0–12. It does not adopt the later combined build-modernization list. The authoring checkout is the integrated site after the visual-threshold, forced-colors, theme-color, and search-permission fixes. Those fixes remain intact.

The source boundary already matches the [Astro project structure](https://github.com/withastro/docs/blob/main/src/content/docs/en/basics/project-structure.mdx): routes and application code under src/, stable unprocessed URLs under public/, and tool-discovered configuration at the root. The problem is ownership drift around that application, not an absent framework hierarchy.

Current evidence was rechecked with focused source reads and rtk rg over code, config, tests, docs, and active specs. The earlier audit's no-caller claims are not deletion authority. Manual tools, public URLs, snapshots, generated config, locks and spec mirrors have independent consumers. Numerical inventories are observations, not new requirements.

The modeled add-agent-skills-supply-chain change supplies the proposal/capability and numbered-task format; it has no design.md. This document follows the OpenSpec design template directly.

## Goals / Non-Goals

**Goals**

- Give each retained file family an explicit owner and stable location.
- Execute each approved cleanup as a small PR with a complete reference map and observable proof.
- Preserve application routing, content IDs, image URLs, security checks, runner discovery and historical task state.
- Remove tracked local scratch and move generator verification reports out of the published asset tree.

**Non-Goals**

The proposal's Out of Scope list is binding: no broad source/test/config relocation, root deployment or agent-entry deletion, snapshot/eval reduction, branded-PNG deletion, vendor rewrite, schema pruning, font/pipeline/CSP migration, or USMR archive/completion. A mismatch uncovered during implementation is recorded and handled as a separate task or change; it is not permission to widen a cleanup.

## Decisions

### D1 — Keep the working application and discovery boundaries

Target layout (existing paths unless marked new/moved):

    artagon-site/
    ├── src/
    │   ├── pages/                  file-based routes
    │   ├── layouts/
    │   ├── components/             Astro, React islands and colocated CSS
    │   │   └── ui/
    │   ├── content/                authors/, pages/, writing/, taglines.json
    │   ├── content.config.ts       collection configuration, sibling of content/
    │   ├── data/                   typed registries, including standards.ts
    │   ├── lib/
    │   ├── scripts/                browser behavior
    │   ├── styles/
    │   └── types/ and env.d.ts
    ├── public/                     contracted static URLs
    │   ├── assets/                 theme.css and retained logo/brand images
    │   ├── icons/                  retained image outputs; no checksum reports
    │   └── CNAME, .nojekyll, .well-known/, manifests and other static files
    ├── scripts/                    repository/build/asset tools
    │   ├── templates/og/           two moved SVG inputs
    │   ├── icons/                  generator and operating documentation
    │   ├── fixtures/
    │   └── lib/
    ├── tests/                      existing flat runner-disjoint layout
    │   ├── fixtures/ and helpers/
    │   └── *.spec.ts-snapshots/    retained platform-specific references
    ├── docs/
    │   ├── agents/ and decisions/
    │   ├── guides/
    │   │   ├── cloudflare-hsts.md  moved operator note
    │   │   └── logo-assets.md      moved logo contract/guide
    │   └── archive/
    │       └── 2025-11-12-site-audit.md
    ├── deploy/                     Caddy/nginx sample configuration
    ├── rules/security/
    ├── evals/                      retained inputs and raw evidence
    ├── openspec/
    │   ├── specs/
    │   └── changes/update-site-marketing-redesign/
    │       ├── tasks.md            active checklist stays here
    │       └── evidence/implementation-history.md
    ├── .agents/                    canonical project agent material
    ├── .claude/, .codex/, .gemini/  client adapters at discovery paths
    ├── .github/, .husky/, .playwright/, .serena/, .beads/
    ├── root discovery/config/contract files
    └── .build/                     ignored configured output
        ├── cache/
        ├── reports/icon-checksums/ new report destination
        └── dist/

Future imported diagrams use src/assets/diagrams/<slug>.svg. No diagram files currently move and no empty placeholder directory is created.

Root files retained: package.json/package-lock.json; astro.config.ts; tsconfig.json; playwright.config.ts; vitest.config.ts; sgconfig.yml; build.config.json/build.config.ts; generated lighthouserc.json/lychee.toml; .npmrc/.nvmrc; Git config files; CNAME and _config.yml; README.md, DESIGN.md, AGENTS.md and its CLAUDE.md/GEMINI.md links; COPILOT.md; skills-lock.json; client dotfiles. Configurable discovery is not a reason to introduce a config/ migration.

The ignored .astro/, .lighthouseci/ and .lycheecache locations are not relocated here. The sibling modernize-build-pipeline change owns reconciliation of generated-framework metadata with the build umbrella spec.

**Alternative rejected:** apps/site/, framework-specific component trees, or tests/e2e/unit/node would require broad import, glob, root-calculation and snapshot changes with no demonstrated benefit.

### D2 — Make every move atomic with its references

The map below is the implementation checklist. Search both exact full paths and relative/variable forms before moving; rerun the map against the implementation head. Keep historical review quotations as history, with a nearby current-location pointer if needed, rather than silently rewriting their findings.

| PR / current path → target | References and ownership updates | Proof |
| --- | --- | --- |
| 1: tracked session.txt → absent; tracked .lycheecache → ignored at the same runtime path | .gitignore adds /session.txt and retains the existing Lychee rule. docs/build-artifacts.md and the build-config cache exception continue to describe the same Lychee location. | Scoped ls-files no longer lists either artifact; check-ignore matches both; recreating the cache does not dirty tracked source. |
| 3: assets/og-template.svg and assets/og-template-image.svg → scripts/templates/og/ with the same basenames | scripts/make-og-from-template.sh TEMPLATE_TXT/TEMPLATE_IMG; README script tree and OG usage; openspec/contributing.md OG guidance; openspec/project.md tooling ownership; _config.yml drops only the obsolete root assets exclusion while scripts stays excluded. DESIGN.md future assets/diagrams path becomes src/assets/diagrams. tests/scripts-tooling.test.mts needs real branch/template-resolution coverage beyond its existing argument-prefix test. | Both SVGs retain identical bytes. Image mode selects the relocated image template only when both it and the logo exist as files; otherwise text fallback consumes the relocated text template. Missing image input may therefore succeed via fallback; a missing selected text template must fail. Positive image-mode proof must show the image template was actually consumed, not only exit zero. CLI/output defaults and application output remain stable. |
| 4: deploy/cloudflare-hsts.md → docs/guides/cloudflare-hsts.md | openspec/project.md deploy description; README guide index. No exact source/config/test consumer or relative hyperlink was found. Both parent directories are already excluded by _config.yml. | Note content is unchanged and new link resolves; server files remain under deploy/. |
| 5: docs/SITE_AUDIT.md → docs/archive/2025-11-12-site-audit.md | Audit self-path; README audit link and incorrect date; .agents/context/glossary.md; every occurrence in active USMR tasks.md (including repeated historical narrative occurrences). | Historical findings/date retained; only location/date-index corrections change; all current links resolve. |
| 9: public/assets/logos/README.md → docs/guides/logo-assets.md | README logo-guide references; .agents/context/glossary.md; comment in tests/lint-orphan-public-svg.test.mts. First amend add-brand-assets-and-writing-pipeline/proposal.md (opening, dependency assumption, adoption matrix), tasks.md (3.2 and 8.1a), and specs/site-branding/spec.md (15-PNG output requirement). Its reviews/domain-claude.md and reviews/CONSOLIDATED.md are historical evidence, not current-path authority. | Guide's image contract survives, 15 PNG outputs and image URLs remain, old guide URL retirement is documented, new guide links work, active branding delta validates. |
| 10: public/icons/checksums/* → .build/reports/icon-checksums/* | build.config.json reports.iconChecksums; build.config.ts BuildPaths and REQUIRED_SHAPE; tests/build-config.test.mjs; docs/build-artifacts.md; scripts/icons/make-icons.sh checksum mkdir/writes/message and summary exclusion; scripts/icons/README.md output tree, checksum descriptions/examples; scripts/icons/VERIFICATION.md checksum commands. Regenerate lighthouserc.json/lychee.toml because their source hash changes. | Both digest formats reproduce from each icon's bytes at the new location; malformed/missing config fails before writing reports; old public reports are absent from a clean build; image output paths are unchanged. |
| 12: historical prose in active USMR tasks.md → active USMR evidence/implementation-history.md | Keep tasks.md path and concise evidence links. Rebase moved Markdown and backticked relative file references, including proposal.md/design.md/tasks.md, to their original targets from evidence/. Update openspec/project.md's merge-order/Constraints history pointers, docs/archive/2025-11-12-site-audit.md's pt236 locator after PR 5, and docs/guides/new-design-conversion.md's history/count paragraph. Preserve the consumers and boundaries in D6. Move only the NARRATIVE_ARCHAEOLOGY exception to the exact history file; adjust only affected legacy-placeholder exclusions in scripts/sync-build-config.mjs and regenerate lychee.toml. | Ordered checkbox preservation, zero stale design-path matches in live tasks before/after extraction, recorded link-base repairs, real configured Lychee with include_verbatim=true and a broken-relative-path negative, and explicit history-pointer review. No blanket sibling-Markdown exclusions or archive marker/directory. |

A logo-guide move and checksum-report relocation intentionally retire their old published documentation/report URLs. That is the bounded breaking surface approved by this plan; announce it in README's tooling migration notes. No redirect mechanism or deployment migration is introduced by these PRs. If an external dependency on either retired URL is identified before implementation, hold that PR and revise its migration contract.

### D3 — Preserve string boundaries beyond module references

| Boundary | Required treatment |
| --- | --- |
| Astro frontmatter/templates and MDX imports | Exact moved paths were not source imports. Keep application imports/tags and content collection IDs; check src/ including astro and mdx files on every move. |
| CSS tokens, DOM selectors, routes and public image links | None is renamed. Keep theme.css, public/_redirects, src/lib/indexation.ts and sitemap semantics. Scan route/path strings, not just a module call graph. |
| TypeScript paths/includes | No new path alias or moved TS module. Existing src/tests/scripts/root includes remain; do not relocate tsconfig.json. |
| package.json scripts and hooks | Keep command names and manual CLI argument/output contracts. Only the approved dependency declarations/overrides change in PR 2. |
| build.config.json keys | Only the checksum report leaf is added. Update typed validation/tests and generated config hashes; no second source of path truth. |
| Workflows and CODEOWNERS | No job, source workflow path, artifact name, or test glob moves. Verify checks still select the changed files. The server examples are operator inputs, not proof of a live deployment. |
| Playwright/Vitest/node:test | Keep configs, explicit globs, Node file lists, fixtures and snapshot paths. The .mts Node exception stays excluded from Vitest. |
| sgconfig.yml and rule discovery | No rule-directory or language-map move. PR 11 retains the identified rule and source test until the D5 build gate is proven, then retires both atomically and synchronizes the active contracts listed there. |
| Docs, manifests, glossary, specs and issue history | Update every current reference listed above. Preserve historical issue exports/reviews as historical; do not rewrite .beads/issues.jsonl to cosmetically alter path strings. |
| Generated assets/config/evidence | Do not infer disposability from generated origin. Retain locks, spec mirror, snapshots, eval records and contracted image deliverables. |

All paths are repository-relative. No developer home directory, swarm checkout path, or transient report URI becomes a durable artifact reference.

### D4 — Keep behavior while repairing dependency and tool intent

PR 2 removes the obsolete direct Sharp pin, leaving Astro's compatible transitive Sharp dependency. Future branding generators that import Sharp directly must declare a compatible direct dependency in their own implementation; amend the active branding proposal's “already a dependency” assumption. Remove only the evidenced inactive rimraf/glob overrides. Declare YAML as a direct development dependency for these imports:

- tests/branch-protection-workflows.test.mts
- tests/ci-workflow-behavior.test.mts
- tests/lint-ci-workflows.test.mts
- tests/lint-ci-node-version.test.mts
- tests/dependabot-config.test.mts

Reconfirm the import inventory and compatible lockfile resolution before editing. Fresh installation, all runners and an actual Astro image transform prove this change; a lockfile diff alone does not.

PR 6 changes .agents/workflows/update-hero.md and .agents/AGENT_MANIFEST.yaml to direct editorial hero work to src/content/pages/home.mdx. src/pages/index.astro remains the rendering/template path. Its focused acceptance is explicitly review-only: inspect the tasks entry whose id is update-hero and the entire short workflow; require the manifest output and editorial instructions to name the existing home.mdx, with page-template edits distinguished. Confirm src/pages/index.astro loads getEntry("pages", "home") and consumes home.data; retain the reviewed file:line evidence with the PR. Reject the PR if either instruction still assigns editorial copy to the template or names a nonexistent file. tests/lint-agent-manifest-skills-sync.test.mts checks mandatory/not-applicable skill lists, not tasks, and the existing path-citation discovery does not cover these workflow/manifest files. Those tests are common checks, not evidence for this edit. No new permanent test or broad manifest input/output path validator is claimed: inputs are named data parameters and other outputs include globs.

PR 3 preserves scripts/make-og-from-template.sh's existing selection rule: use the image template if both TEMPLATE_IMG and LOGO exist as files; otherwise use TEMPLATE_TXT. No new fail-on-missing-image mode is introduced. Exercise a valid image/valid logo pair, a missing-logo text fallback, and a missing-image/valid-logo text fallback. Only when the selected template is unavailable must generation fail; in particular, missing TEMPLATE_TXT with a fallback-triggering condition exits nonzero before conversion. A valid image branch may still succeed when the unused text template is absent. Use real conversion for positive output proof and verify which template branch was consumed so a wrong image path cannot hide behind a successful fallback. Update README.md and openspec/contributing.md to state this preserved behavior.

PR 7 fixes scripts/make-favicon.sh to consume public/icons/icon-16.png, icon-32.png and icon-48.png. Argument 1 remains an output directory, default public; the destination is always <output-directory>/favicon.ico. Callers create a non-default directory before invocation, as the current helper does not create it. The argument is never interpreted as an ICO filename. Update README.md and openspec/contributing.md with both no-argument and explicit-directory examples and the actual PNG inputs. In a disposable repository fixture, validate the default public/favicon.ico and a second ICO under an existing custom output directory, including 16/32/48 dimensions; missing input/tool and an unusable output directory must fail visibly. A command that exits zero with the wrong format is insufficient.

PR 8 keeps deploy/Caddyfile and deploy/nginx.conf but replaces the SPA-style index fallback with static 404 behavior. Known extensionless routes and assets remain readable, while an unknown path returns status 404 and the intended 404 body. .agents/workflows/deploy.md and openspec/project.md explain how the built .build/dist tree is copied into the chosen external document root. Do not mechanically rewrite /var/www/artagon-web/dist into a repository path or change TLS/HSTS/CSP settings.

**Alternatives rejected:** deleting manual utilities based on automated-call absence; upgrading unrelated dependencies; deleting server examples based on an external absolute document-root path.

### D5 — Trusted sink modules for raw HTML (site-w1n.12, site-kks)

**Decision (2026-11-03).** Replace the proposed static rule repair with a build-time gate that observes the real configured module graph passively and accepts raw HTML only through reviewed exports of trusted sink modules. The initial exports are src/lib/charset.ts safeJsonLd for JSON-LD and src/lib/markdown.ts renderMarkdown for FAQ content. This is an export-level trust boundary, not a FAQ/file exemption: other exports, calls, raw nodes and wrappers are not trusted by location or name. The current Markdown renderer accepts plain strings and can pass raw HTML through; it must meet the new typed-content and no-passthrough or sanitization contract before cutover. The earlier static-only repair and pathname-only identity approaches are rejected because they missed actual runtime wrappers and real-build resolver/load substitutions.

The gate inventories source and generated sinks across the actual build's reachable routes, static and dynamic imports, and JS/TS wrappers. It also audits all tracked Astro source, including unreachable components, separately without force-loading them into the build; unsafe or unproved uses fail. It covers Astro directives, runtime helpers and JSX object-property/runtime forms. For each output, it proves the effective binding and exact producer-to-sink path; local shadows, mutations and unsupported transformations do not inherit trust. Internal marking within a trusted export is accepted only when the specific producer-to-marking path is reviewed and proves the export's escaping/sanitization contract, not by module location. Candidate parser, compiler and source-map evidence must account for every generated/source sink without unmatched or ambiguous mappings. Unknown syntax, missing information, unexplained plugins or ordering, and incomplete graph coverage fail the build. Unrelated valid shadowing and genuine direct/const/conditional/null forms are positive controls, not grounds for a file-wide bypass.

Provenance is the export and implementation actually linked and transformed in this build, not a filesystem guess. Observation must not call the resolver again or otherwise mutate resolution, graph construction, plugin state or build output. It must detect aliases, competing extensionless modules, re-exports including export-star proxies, virtual/load/transform substitutes, and stateful resolution discrepancies. The design does not presume module IDs or imported-ID lists alone establish occurrence-level binding or original bytes; if the actual binding and trusted implementation cannot be proved through the configured plugin pipeline, reject. Observer-order and graph-completeness proof is an implementation gate, not an assumption.

The single versioned allowlist is security/trusted-html-sinks.json. Each module/export pair names its contract and has a positive and negative test. CODEOWNERS protects the allowlist, trusted implementation modules, contract artifacts, gate code, helpers, tests and fixtures, and openspec/changes/standardize-repository-layout/evidence/trusted-html-sinks.md; required CI compares the protected base with the proposed revision and binds base/proposed digests of those subjects, their security-critical dependency/configuration closure and the base revision to fresh evidence naming an independent security reviewer and approval. The gate routes closure changes to the same approval even when CODEOWNERS has no explicit matching path. A domain-separated ABSENT state handles initial creation and reviewed removal; unknown closure, unresolved subjects and replayed, absent or stale evidence fail. Implementation/dependency changes without an allowlist edit, deletion, reassignment, contract changes and restoring old content require a new review. Repository review policy must verify that the designated security owner approving the proposed revision is the named independent reviewer and is distinct from the author; relevant base or head changes invalidate or require revalidation of approval. CODEOWNERS or a self-asserted evidence entry alone does not enforce approval. Future implementations must prove this policy, the protected gate configuration and the CI check cannot be bypassed in the protected branch before relying on the mechanism.

The existing FAQ source remains src/data/faq.ts as the live site-content contract requires. A validated collection loader or bridge supplies the typed collection data, preserving every existing FAQ answer; merely branding its current string type does not prove provenance. The implementation must update the collection schema/loader and consumers as needed and exercise the real FAQ route. The renderer must also validate generated URL protocols: removing raw HTML alone does not prevent Markdown-generated javascript: or unsafe data: links.

**Migration.** Keep rules/security/no-set-html-directive.yml and tests/lint-set-html-safejsonld.test.mts enabled and unmodified until the new actual build gate is proven on the full preserved round-5 baseline matrix and every round-6 bypass. First run the original controls unchanged and test the candidate independently in disposable fixtures; the original YAML's safe-fixture false positives must not be misrepresented as new-gate failures. After independent security review and passing positive/negative controls, enable the new gate in the real build and CI and retire the old rule and source test together in one atomic implementation commit. Run the post-cutover real gates and reconcile every active contract in that commit. If any proof or post-cutover gate fails, do not land; retain both original controls. No unprotected intermediate state is permitted.

PR 11's complete active reference map is:

| Active consumer | Same-PR amendment and proof |
| --- | --- |
| AGENTS.md rule table; docs/agents/static-analysis.md; docs/agents/code-intelligence.md | Describe the build gate and remaining rule inventory accurately; tests/lint-sg-rules-doc-sync.test.mts must agree with disk. |
| DESIGN.md §9.4.1 inline-handler/XSS guidance | Name the trusted-sink build gate without weakening the inline-handler prohibition or changing visual behavior. |
| tests/lint-set-html-safejsonld.test.mts; tests/lint-no-inline-event-handler.test.mts; rules/security/no-set-html-directive.yml | Retire the first test and named YAML only at proven cutover; update remaining comments, preserve negative controls and CI discovery in the replacement tests. |
| openspec/changes/update-site-marketing-redesign/specs/site-structured-data/spec.md, requirement JSON-LD Safety and Script-Tag Escape and scenario ast-grep passes | Replace the inaccurate per-line exception claim with the trusted export and real-build gate. Preserve JSON-LD escaping, parseability and XSS protections. Validate USMR. |
| openspec/changes/update-site-marketing-redesign/design.md JSON-LD safety paragraph; tasks.md task 12.8 | Correct present-tense rule/pragma claims and name the build gate. Preserve task IDs/states; historical pt428 review narratives remain historical evidence. |
| openspec/changes/add-brand-assets-and-writing-pipeline/specs/site-branding/spec.md, scenario Import from brand-svgs.ts allowed | Align its named-rule assertion with the new gate; preserve safe component composition and the prohibition on arbitrary SVG set:html. Validate branding. |
| openspec/config.yaml Conventions security-rule bullet; .agents/skills/ast-grep/SKILL.md HTML parser guidance | Describe actual rule and gate responsibilities. Update only first-party guidance; follow required skill/security review and verification. |

Before implementation, repeat the exact-name and set:html-boundary search across source, config, tests, docs, skills and active specs. Update any newly discovered active claim in the same PR; do not rewrite archived specs or frozen reviews. The live site-content FAQ Markdown requirement remains unchanged.

### D6 — Extract history while keeping the checklist authoritative

USMR remains active at openspec/changes/update-site-marketing-redesign/. No archive-named sibling is created. The new history file stores extracted historical prose verbatim except explicitly recorded link-base repairs; the concise live tasks retain current action/acceptance meaning and links to the corresponding history anchors. It is a historical authoring record, not an actionable checklist or a new prerequisite-scanner input.

Before extraction, capture the implementation head's complete ordered checkbox sequence, including every occurrence of repeated IDs, state, indentation/parent context and task ID. Compare that sequence after extraction. A count or set comparison cannot detect a reordered, deduplicated or state-changed checkbox. Do not hardcode the earlier survey's count/hash: integrated tasks have already changed. This is a migration comparison, not a permanent prohibition on future authorized task completion.

The migration also has a before-move precondition: the live USMR tasks.md must contain zero occurrences of the exact stale path new-design/extracted/DESIGN.md. Use a literal rtk rg search and retain its no-match exit 1; treat read/search errors as failures. A match blocks extraction until corrected in the live checklist, rather than being hidden by moving it. Repeat the check after extraction and retain the existing prerequisite fixture/runtime gates. scripts/verify-design-prerequisites.mjs remains tasks-only; no claim is made that it scans evidence/implementation-history.md, proposal.md or design.md.

Lychee's include_verbatim=true means inline-code file references are part of the move map, not just Markdown hyperlinks. Inventory moved relative file references and their resolved targets before extraction. In the new evidence file, sibling references proposal.md, design.md and tasks.md become ../proposal.md, ../design.md and ../tasks.md; apply the same resolution-preserving repair to other moved relative references. Preserve fragments and keep line-number annotations outside the link target when necessary for valid resolution. Record each repair in the narrative comparison. Do not exclude these existing Markdown targets to hide a broken relocation or broaden exclusions to the evidence directory. Only the already-documented non-navigable historical placeholders may receive a narrowly rebased generator exclusion.

Run the workflow-equivalent pinned Lychee check from the checkout root using the generated lychee.toml, its include_verbatim=true setting and --root-dir pointing to that checkout, over all USMR Markdown plus openspec/project.md and the two reader documents below. The gate must fail on unresolved moved file references. A disposable migration fixture with only parent-level proposal.md/design.md/tasks.md must fail for unrepaired bare references in its evidence/ child, then pass after ../ repairs; also verify each repaired reference targets the same original file. Run the normal link-check CI job and generated-config check mode. Review anchors/content as well as file existence so a surviving tasks.md path cannot falsely prove that a removed pt-log remains there.

| Actual consumer | Preservation rule and proof |
| --- | --- |
| scripts/verify-design-prerequisites.mjs | Reads only live tasks.md and scans new-design/extracted/DESIGN.md; evidence is not scanned, just as historical proposal/design authoring records are not scanned. Preserve that boundary. Require the before/after zero-match migration precondition above so extraction cannot make a failing live checklist pass merely by moving its stale reference. |
| tests/verify-design-prerequisites.test.mjs and tests/fixtures/design-md-prereqs/ | Preserve in-flight, archived and stale-path fixtures. These test the prerequisite script, not the entire real checklist's IDs. |
| scripts/verify-prerequisites.mjs and tests/verify-prerequisites.test.mjs | Preserve archive/ancestor checks and fixture tasks-file existence. They are not parsers of real task IDs; do not invent that dependency. |
| scripts/lib/openspec-archive.mjs | A matching directory suffix can report a change archived. Prove isChangeArchived for USMR remains false; do not put history under openspec/changes/archive/. |
| tests/lint-scoped-package-versions.test.mts | Replace the existing live tasks.md exception with only the exact historical evidence file. Move remaining historical version quotations into retained evidence with links, preserving task IDs/states and meaning. Prove a stale package pin in the live checklist fails while a historical quotation remains exempt; do not exempt both files or the entire evidence tree. |
| scripts/sync-build-config.mjs → lychee.toml | Keep include_verbatim=true. Repair relative/backticked references in the moved prose; rebase only existing placeholder exclusions if needed. Generate TOML, never hand-edit it; prove actual Lychee failure/pass for unrepaired/repaired sibling-file references. |
| openspec/project.md merge-order item for USMR and Constraints/Notes archive-citation sweep (currently lines 58 and 87) | Keep tasks.md as the live checklist and direct the pt-counter/5.5.16-loop historical sweep to retained-history anchors. From this document, the history path resolves through changes/update-site-marketing-redesign/evidence/implementation-history.md. |
| docs/archive/2025-11-12-site-audit.md historical banner after PR 5 (currently docs/SITE_AUDIT.md:5-6) | Repair only the pt236 locator to a retained-history anchor, using the correct ../../openspec/changes/update-site-marketing-redesign/evidence/implementation-history.md relative base. Preserve audit date/findings and its historical label. |
| docs/guides/new-design-conversion.md source-of-truth paragraph (currently line 121) | Replace the combined checklist/narrative size claim with separate live-checklist and history pointers; any line-count command names the file it actually measures. Use the correct ../../openspec/... history link. This is a bounded pointer correction, not a vendor-guide rewrite. |
| OpenSpec tasks/status and human readers | Preserve IDs, states, ordering, nesting and useful acceptance text; validate and inspect status before/after. Follow the updated project/audit/guide pointers to actual pt236 and archive-sweep entries, not merely an existing tasks.md. Retained evidence is not a new completion signal. |

**Alternative rejected:** moving the whole active change into archive, collapsing duplicate IDs, truncating long narratives, or using a byte-size target as acceptance. Each would lose state, disable a prerequisite, or discard evidence.

### D7 — Isolate merge and ownership boundaries

- This change's authoring writes only its own directory. All amendments below are future implementation tasks.
- modernize-build-pipeline owns LHCI, .astro umbrella reconciliation, timing/build reuse and related pipeline work. Layout adds only distinct checksum, HTML-gate and checklist-preservation requirements to shared live capabilities; neither change replaces the other's delta. Rebase shared build.config.*, package.json, generator, tests and docs edits before each implementation PR. Run strict validation on both affected changes after any shared contract reconciliation.
- Cross-change prerequisite: layout PR 1/task 1.2 must land before modernize-build-pipeline task 1.4 (its PR 1) adds the no-tracked-cache assertion. Verify the integrated checkout with git ls-files .astro .lighthouseci .lycheecache returning no paths, while check-ignore still identifies .lycheecache's ignore rule. Do not call modernization PR 1 independently shippable before that prerequisite; this authoring change does not edit the sibling plan.
- add-brand-assets-and-writing-pipeline is amended in PR 2 and PR 9 at the exact files in D2/D4. Preserve its dependency on USMR archive for feature implementation; changing documentation ownership is not permission to implement or archive the branding feature.
- USMR task references change in PR 5, its JSON-LD requirement/design/task 12.8 are reconciled in PR 11, then its prose is extracted in PR 12. PR 11 also amends the branding safe-composition scenario named in D5. Capture the PR 12 preservation baseline after those repairs and any legitimate integrated task additions; preserve existing IDs/states throughout.
- Do not edit the font, Cloudflare, Tailwind/Starlight, or skill-supply-chain changes to fit layout preferences.

## Risks / Trade-offs

- Public guide/checksum URLs stop resolving → mark the bounded break, document new operator paths, and preserve all image URLs; hold the affected PR if a consumer requires a compatibility plan.
- Missing a string reference → apply D2 and D3 together; an AST-only or ripwire-only search is insufficient for Astro/MDX, shell/config or prose.
- Native image-service resolution changes → use a clean install and a real image transformation, not only npm ls.
- HTML enforcement weakens during cleanup → keep both existing controls enabled while the actual new build gate, baseline and bypass controls undergo security review. Retire both only in the same proven cutover commit that enables the new gate; otherwise leave PR 11 unlanded with both original controls intact.
- A narrative extraction falsely archives or completes work → compare ordered occurrences and active-state helpers, preserve evidence, and never create an archive-shaped directory.
- Generated config drifts after adding a BUILD leaf → regenerate through the source generator and run check mode; keep sibling generator edits.
- Manual asset/server tools are absent locally → record the gate as unrun and leave the relevant implementation task unchecked until an environment with the real tool proves it.
- Excessive maintenance machinery → prefer existing tests and a one-time extraction comparison over new general-purpose migration frameworks.

## Migration Plan

Land PR groups 0 through 12 in the order in tasks.md. Each is independently reviewable. Reference repairs and corresponding implementation are atomic within that PR. All implementation tasks start unchecked.

Common acceptance: lifecycle-enabled build, Astro check, node:test, Vitest, pinned static analysis where relevant, generated-config drift checks, affected documentation/reference checks, and existing CI. Run built-output tests after build. The coordinator runs Playwright serially against the correct checkout; visual acceptance uses the pinned Linux container and does not update baselines to hide a layout regression.

Rollback restores a move and all of its references together. Restore generator/config/typed-shape changes together for checksum relocation, without overwriting unrelated report data. Restore the original live task file and retained narrative from the same parent revision if extraction fails; never synthesize archive state. Do not partially restore package.json without its lockfile.

## Open Questions

Implementation still has evidence gates: external use of the two retired documentation/report URLs, real native-image/manual-generator/server behavior, complete passive graph observation, trusted Markdown remediation, and enforceable independent security-owner review. Failure to prove PR 11's coverage and governance keeps both original controls intact; it never authorizes retirement. These are explicitly bounded acceptance conditions, not blanket deletion approval.

