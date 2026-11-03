## ADDED Requirements

### Requirement: The build inventories every raw HTML path

The production build SHALL enforce a fail-closed inventory of raw HTML reaching output over its actual reachable module graph, including route and component code, generated code, dynamically imported modules and imported JavaScript/TypeScript wrappers. The security gate SHALL also independently audit every tracked Astro file, including currently unreachable files, without forcing those files into or changing the production graph; unsafe or unproved raw uses there SHALL fail. It SHALL account for Astro set:html directives, unescapeHTML and markHTMLString runtime helpers and their compiled forms, JSX object-property and runtime raw-HTML sinks, and dynamic or computed imports and properties that can reach these sinks. Every source and generated sink SHALL be accounted for exactly; an unknown, ambiguous, unmatched or unsupported form SHALL cause a build error rather than be ignored. This concerns raw-HTML escape hatches, not ordinary escaped template rendering.

#### Scenario: Raw sink forms and wrappers are inventoried
- **GIVEN** separate actual-build fixtures using set:html, each named or compiled runtime helper, a JSX raw object property, a computed property and a JS/TS wrapper that creates a raw node
- **WHEN** each fixture reaches the build graph with an untrusted value
- **THEN** the build fails and identifies the raw path, including paths through imported wrappers.

#### Scenario: Dynamic imports cannot hide a sink
- **GIVEN** a reachable dynamic or computed runtime import that can invoke a raw helper or JSX raw sink
- **WHEN** the build cannot prove its target and raw-value provenance
- **THEN** the build fails; a resolvable untrusted target also fails rather than being omitted from the inventory.

#### Scenario: Tracked but unreachable Astro is still audited
- **GIVEN** a tracked Astro component that is not reachable from any current build entry and contains an unsafe set:html use
- **WHEN** the actual build and tracked-source security gates run without force-loading that component
- **THEN** the security gate fails and identifies the unsafe use.

#### Scenario: Unknown or unmapped forms fail closed
- **GIVEN** a parser error, unknown sink shape, unmatched generated sink, ambiguous source mapping or incomplete reachable graph
- **WHEN** the production build gate runs
- **THEN** the build fails with a diagnostic instead of accepting the affected output.

### Requirement: Trust follows the implementation actually linked by the build

A raw HTML output SHALL be accepted only when its effective per-use binding and value provenance are proved to originate from an allowlisted export of an allowlisted module and satisfy that export's contract. Within that reviewed export's implementation, a raw-marking operation MAY consume the proven contract-compliant sanitizer or escaping result before the export returns; every such internal operation and its exact producer-to-sink path SHALL be individually reviewed and verified, with unproved operations rejected. This does not trust other operations merely because they share a module. The gate SHALL passively observe the real configured build graph and linked implementation, without extra resolver calls or other observation that changes resolver state, plugin behavior, graph construction or output. A path, realpath, function name, import list, or claimed module ID alone SHALL NOT establish trust. Local lookalikes, shadowed or rebound values, competing modules, re-export and export-star proxies, plugin-loaded or virtual substitutes, and unresolved or ambiguous bindings SHALL be rejected. Unknown parser, source-map, graph, load/transform or plugin-order behavior and any divergence between observed evidence and the actual linked implementation SHALL fail the build.

#### Scenario: Genuine binding and unrelated shadow are accepted
- **GIVEN** genuine allowlisted JSON-LD calls in direct, const, safe conditional and null forms, including parenthesized direct calls and unrelated nested shadowing
- **WHEN** the actual production build gate verifies each effective use
- **THEN** it accepts those valid uses without extending trust to the unrelated shadow.

#### Scenario: Spoofed effective bindings are rejected
- **GIVEN** separate uses of a locally defined lookalike, callback-shadowed sanitizer or safe const, rebound value, wrong-module import, unresolved import, or mixed genuine and unsafe sinks
- **WHEN** the real build gate evaluates each use
- **THEN** it rejects every unsafe or ambiguous use even if another use in the same file is genuine.

#### Scenario: Competing module and proxies are rejected
- **GIVEN** an extensionless import that the actual build links to a competing charset.js instead of the approved charset.ts, or a re-export/export-star proxy including a side-effect import of the approved module
- **WHEN** the build gate checks the actual linked provider for the raw value
- **THEN** the build fails; the presence of the approved path elsewhere in the graph does not grant trust.

#### Scenario: Substitution and stateful resolution are rejected without perturbation
- **GIVEN** a plugin that supplies substitute code under an approved ID, a virtual substitute, or a stateful resolver whose actual linked target differs from the evidence presented to the checker
- **WHEN** the build gate observes the build
- **THEN** it rejects the substitute or divergence and makes no extra resolver call; a control proves observation does not change the selected module or rendered output.

#### Scenario: Uncertain plugin order or mapping is an error
- **GIVEN** a build where the checker cannot establish its observation order, the actual load/transform lineage, or a unique source-to-generated-sink correspondence
- **WHEN** it evaluates the build
- **THEN** it fails instead of assuming that a canonical-looking path or incomplete map is trusted.

#### Scenario: Internal marking is limited to the reviewed producer
- **GIVEN** the approved Markdown export marks the verified sanitized or escaped result, and a separate fixture marks an unsanitized value inside that same module
- **WHEN** the actual build gate evaluates each producer-to-marking path
- **THEN** it accepts the contract-compliant path and rejects the unproved path despite its location inside the trusted module.

### Requirement: Each trusted sink has a reviewed input and escaping contract

The initial trusted exports SHALL be src/lib/charset.ts safeJsonLd and src/lib/markdown.ts renderMarkdown. safeJsonLd SHALL serialize JSON and escape HTML-significant characters so JSON-LD remains parseable without allowing script termination or raw HTML injection. The FAQ Markdown renderer SHALL accept only typed content-collection data whose provenance the gate can establish and SHALL either prevent raw-HTML passthrough or explicitly sanitize it before marking output as HTML. Generated Markdown links and other URL-bearing output SHALL also enforce a reviewed safe protocol policy; blocking raw tags alone SHALL NOT authorize javascript: or unsafe data: URLs. Existing FAQ answers SHALL remain authored in src/data/faq.ts, with a validated collection loader or bridge that establishes the required provenance without dropping records. The renderer's current plain-string and passthrough behavior is not proof of this contract. Trust SHALL apply only to each approved export and its reviewed contract, not every operation in its module or an entire FAQ file. Each export SHALL have positive and negative contract tests.

#### Scenario: JSON-LD escaping is maintained
- **GIVEN** valid structured data including script-closing text and HTML-significant characters
- **WHEN** safeJsonLd produces JSON-LD through the actual build path
- **THEN** the data remains parseable and cannot terminate the script or introduce an HTML element; an unsafe unsanitized value is rejected.

#### Scenario: FAQ Markdown renders safely
- **GIVEN** all existing FAQ answers authored in src/data/faq.ts and loaded through the validated typed collection, plus separate inputs containing raw tags, event handlers and script payloads
- **WHEN** renderMarkdown is invoked through the actual build path
- **THEN** every existing answer remains present and supported Markdown renders, and raw HTML is rejected, escaped or explicitly sanitized so the payload cannot reach output as active HTML.

#### Scenario: Non-collection Markdown is not trusted
- **GIVEN** a plain string or an unrelated input whose content-collection provenance cannot be established
- **WHEN** it is sent to the trusted FAQ renderer
- **THEN** the build or contract validation rejects it rather than trusting it based only on a TypeScript annotation.

#### Scenario: Markdown cannot generate unsafe URLs
- **GIVEN** typed FAQ Markdown containing allowed HTTPS and relative links and separate javascript: and data:text/html links and images, including mixed-case, encoded and control-character scheme variants
- **WHEN** the actual renderer and build process the content
- **THEN** allowed links remain usable and normalization plus the reviewed protocol policy prevents the unsafe schemes from appearing as active link or image URLs in rendered output.

### Requirement: Trusted sink changes require independent security review

The allowlisted module/export pairs and their contract references SHALL reside in the single versioned file security/trusted-html-sinks.json. CODEOWNERS SHALL name designated security owners for that file, all trusted implementation modules and contract artifacts, the gate implementation, helpers, tests and fixtures, and openspec/changes/standardize-repository-layout/evidence/trusted-html-sinks.md; protected-branch review policy SHALL require their approval and protect the policy and gate configuration. A required CI test SHALL compare the change with its protected-branch base and verify a fresh evidence entry binding base and proposed content digests of the allowlist, every trusted module, referenced contract artifact, gate implementation and controls, and their security-critical transitive code, dependency and configuration closure, and the base revision, to an independent security review. The digest subject SHALL exclude the evidence file itself to avoid self-reference; the protected policy SHALL independently review that evidence and the final proposed revision. The required gate SHALL route closure changes to the same authenticated security approval even when those paths are not explicitly named by CODEOWNERS. A domain-separated ABSENT state SHALL distinguish a missing base or proposed file from an empty file: absence on the base is permitted for an explicitly reviewed creation or addition, and absence on the proposal for an explicitly reviewed removal of trust. Unknown or incomplete closure, unexpectedly missing, deleted, unresolved or repointed subjects SHALL fail closed. The protected review policy SHALL verify that the named reviewer is the authenticated designated security owner approving the proposed revision, distinct from the change author; approval SHALL be dismissed or revalidated when the relevant base or proposed revision changes. It SHALL NOT infer approval from a self-asserted name in a file. Every addition, removal, export reassignment, implementation, gate, dependency or contract change or restoration of earlier contents SHALL require fresh matching review; absent, stale, replayed or malformed evidence SHALL fail. Enforcement of both review policy and CI SHALL be verified before cutover.

#### Scenario: Allowlist change without matching review fails
- **GIVEN** an addition, removal, reassignment, contract edit or restoration of an earlier allowlist without fresh evidence for the base and proposed content digests and base revision
- **WHEN** the required governance test and protected review policy run
- **THEN** the change cannot pass the gate or merge; replayed, stale, missing or malformed evidence also fails.

#### Scenario: Reviewed allowlist change passes governance
- **GIVEN** an allowlist change with matching base/proposed digest and base-revision evidence, an independent named security reviewer and the required designated-owner approval on the proposed revision
- **WHEN** the governance test and protected review policy run
- **THEN** the governance gate passes while the sink-specific contract and build tests remain mandatory.

#### Scenario: A trusted implementation cannot change unnoticed
- **GIVEN** the allowlist bytes remain unchanged but an approved implementation module or referenced contract artifact changes or is removed
- **WHEN** the required governance test and protected review policy run without fresh matching review for that change
- **THEN** the gate fails even if the old allowlist digest and evidence still match.

#### Scenario: Dependency and reviewer identity are verified
- **GIVEN** unchanged allowlist and sink source bytes but a changed security-critical renderer dependency or configuration, or evidence naming a reviewer other than the authenticated approving owner
- **WHEN** the required governance and protected review checks run
- **THEN** the change fails without a fresh matching review by an eligible security owner other than the author.

#### Scenario: Gate implementation tampering is reviewed
- **GIVEN** unchanged allowlist and workflow configuration but modified gate code, helper, regression test, fixture or security-relevant lock input
- **WHEN** the required governance and protected review checks run without fresh matching review
- **THEN** the change fails rather than trusting the unchanged job definition.

#### Scenario: Initial creation and removal are distinguishable
- **GIVEN** a reviewed first allowlist, an explicitly reviewed newly trusted subject, a reviewed removal of trust, or a still-required proposed subject that is unexpectedly missing
- **WHEN** the governance gate compares each side with the protected base
- **THEN** it accepts expected base absence for a reviewed addition and expected proposal absence for a reviewed removal using ABSENT distinct from an empty file, and rejects the unexpectedly missing required subject.

### Requirement: Existing controls remain until the build gate is proven

The repository SHALL retain rules/security/no-set-html-directive.yml and tests/lint-set-html-safejsonld.test.mts, enabled and unchanged, until the replacement has passed independent security review and the full round-5 baseline matrix plus every bypass recorded in the round-6 PR 11 investigation. The matrix SHALL cover small and 300-paragraph padded fixtures, genuine direct/const/safe-conditional/safe-or-null inputs, unsafe direct/conditional/concatenated/mixed output, and local lookalike, callback-shadowed sanitizer, rebound, wrong-module, unresolved and shadowed-safe-const uses; repeat the callback shadow in a real production-shaped component. The bypass controls SHALL include direct runtime helpers and raw JSX properties, computed dynamic imports/properties, imported JS/TS wrappers in an actual build, charset.js competing with extensionless charset.ts, a plugin substituting code under a canonical ID, export-star proxy with a canonical side-effect import, stateful resolver perturbation from a nested resolve, parser errors, and unmatched or ambiguous source maps. Source-mapping controls SHALL include ASCII, astral-prefix and two-on-one-line sinks; binding controls SHALL include valid unrelated shadowing and parenthesized direct calls. For existing JSON-LD set:html uses, the candidate SHALL NOT broaden the prior source grammar and SHALL reject the prior negative forms of a parenthesized safe const, a generic safeJsonLd call and an optional safeJsonLd call; the separately approved Markdown contract is unaffected. It SHALL reject any unsupported or ambiguous transformation including erased TypeScript syntax when it would evade the contract. The actual candidate build gate SHALL reject unsafe controls and accept genuine controls; baseline false positives SHALL be recorded accurately.

After proof, the repository SHALL enable the new build and CI gate and retire the old YAML rule and source test atomically in the same implementation commit. It SHALL reconcile the active contracts and guidance enumerated in design.md D5, preserve task IDs/states and historical evidence, and validate the affected active changes. If proof or post-cutover checks fail, the replacement SHALL NOT land and both old controls SHALL remain enabled; no intermediate unprotected state is permitted.

#### Scenario: Incomplete replacement cannot land
- **GIVEN** a candidate that misses any baseline or bypass negative, fails a genuine positive, or cannot prove complete passive graph observation
- **WHEN** the implementation is evaluated
- **THEN** the gate fails and the original YAML and source test remain enabled unchanged.

#### Scenario: Proven replacement cuts over atomically
- **GIVEN** the complete matrix, real-build gate, governance and independent security review all pass
- **WHEN** the implementation is committed
- **THEN** the build and CI enforce the new gate as the old YAML and source test retire together, and active guidance and security contracts describe the resulting enforcement.
