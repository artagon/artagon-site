## ADDED Requirements

### Requirement: The build inventories every raw HTML path

The production build plugin src/lib/vite-plugin-trusted-html-sinks.ts SHALL enforce a fail-closed inventory of raw HTML reaching output over the real reachable module graph, including route and component code, generated code, dynamic imports and imported JavaScript/TypeScript wrappers. tests/lint-trusted-html-sinks.test.mts SHALL exercise actual build fixtures and independently audit every tracked Astro file, including unreachable files, without force-loading them into the production graph. The inventory SHALL cover Astro set:html directives; unescapeHTML, markHTMLString, HTMLString and HTMLBytes and their compiled forms; Symbol.for("astro:html-string") branding; astro/jsx-runtime object-property, variable-props and spread-props raw sinks; .astro spread attributes; React dangerouslySetInnerHTML; and dynamic or computed imports and properties reaching these forms. Unknown, ambiguous, unmatched or unsupported source/generated forms SHALL fail the build rather than be ignored. This concerns raw-HTML escape hatches, not ordinary escaped template rendering.

The build SHALL capture a complete graph-audited rendered HTML baseline after Astro has rendered routes and before any unverified HTML output mutator. Each baseline HTML file SHALL be attributed to an audited route; copied public HTML or another unattributed file SHALL fail rather than inherit graph trust. If hook ordering or an earlier writer prevents that capture, the build SHALL fail. The final production build SHALL run scripts/verify-trusted-html-output.mjs after all HTML-writing Astro integrations, including astro:build:generated and astro:build:done, and all postbuild stages including SRI and CSP. It SHALL reject unexpected changes or additions relative to that rendered baseline, permitting only verified SRI and CSP transformations, and SHALL fail if the baseline or comparison data is missing. The build-fixture test SHALL exercise the actual complete build chain.

#### Scenario: Raw sink forms and wrappers are inventoried
- **GIVEN** separate actual-build fixtures using set:html, each named or compiled runtime helper, HTMLString, HTMLBytes, Symbol.for("astro:html-string"), JSX variable/spread props carrying set:html, .astro spread attributes, React dangerouslySetInnerHTML, a computed property and a JS/TS wrapper that creates a raw node
- **WHEN** each fixture reaches the build graph with an untrusted value
- **THEN** the build fails and identifies the raw path, including paths through imported wrappers.

#### Scenario: Dynamic imports cannot hide a sink
- **GIVEN** a reachable dynamic or computed runtime import that can invoke a raw helper or JSX raw sink
- **WHEN** the actual graph has an unresolved target, multiple possible targets, or an untrusted target or value source
- **THEN** the named build gate fails rather than omitting that path.

#### Scenario: Tracked but unreachable Astro is still audited
- **GIVEN** a tracked Astro component that is not reachable from any current build entry and contains an unsafe set:html use
- **WHEN** the actual build and tracked-source security gates run without force-loading that component
- **THEN** the security gate fails and identifies the unsafe use.

#### Scenario: Unknown or unmapped forms fail closed
- **GIVEN** a parser error, unknown sink shape, unmatched generated sink, ambiguous source mapping or incomplete reachable graph
- **WHEN** the production build gate runs
- **THEN** the build fails with a diagnostic instead of accepting the affected output.

#### Scenario: Later output writers cannot bypass inventory
- **GIVEN** a complete graph-audited rendered HTML baseline, an unattributed public HTML file, an integration or postbuild fixture that injects an unapproved raw element or attribute after that baseline, plus the ordinary SRI and CSP output stages
- **WHEN** the complete build and final-output gate run
- **THEN** the unattributed file and injected output fail, while the unchanged site with its verified SRI and CSP changes passes; missing baseline or audit data also fails.

### Requirement: Trust follows the implementation actually linked by the build

A raw HTML output SHALL be accepted only when its effective per-use binding and value provenance originate from an allowlisted export of an allowlisted module and satisfy that export's contract. Within that reviewed export, a raw-marking operation MAY consume the contract-compliant escaped result before return only when the exact producer-to-marking path passes the named build-fixture tests; another or unmatched internal operation SHALL fail. The plugin SHALL passively observe the actual configured build without extra resolver calls or changes to resolver state, graph construction or output. A path, realpath, function name, import list or claimed module ID alone SHALL NOT establish trust. Local lookalikes, shadowed or rebound values, competing modules, re-export and export-star proxies, plugin-loaded or virtual substitutes, and unresolved or ambiguous bindings SHALL fail.

The production-only plugin SHALL record its resolved configuration and ordering in configResolved; collect moduleParsed observations for each built prerender and client environment; and at each buildEnd reconcile getModuleIds and getModuleInfo (including code, importedIds, dynamicallyImportedIds, exports and inputFormat) with the observations. Internal executable modules SHALL have a moduleParsed observation; external modules SHALL be classified separately because Rolldown does not call moduleParsed for them and ModuleInfo has no isExternal field. Exact known builtin ID, null code and absent callback MAY classify node:crypto only when its imports are verified as permitted non-sink uses; these signs SHALL NOT classify arbitrary modules. Any external raw-sink provider, trusted-export substitute, unknown or ambiguous external use SHALL fail, with no blanket exemption. The plugin SHALL compare discovered entry modules with configured build entries, examine actual generated code and tracked source, and account for every source/generated sink and supported per-use binding. Missing environment completion, an unclassified graph module or entry, unavailable relevant internal code, unknown syntax, unmatched or ambiguous sink/source mappings, an unrecognized executable module format, a substituted trusted implementation, conflicting provider candidates or an unobserved later transformation SHALL fail. Empty non-executable asset modules MAY be classified explicitly. ModuleInfo.ast SHALL NOT be used because Rolldown does not support it; moduleParsed is not available in dev, so a dev server SHALL NOT count as this production gate. The design SHALL NOT treat importedIds membership alone as an occurrence-to-provider mapping.

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

#### Scenario: Missing observations or ambiguous mapping fail
- **GIVEN** a missing environment completion, later unobserved transform, entry or internal executable module absent from moduleParsed/buildEnd reconciliation, unavailable relevant code, multiple matching providers, or non-unique source-to-generated-sink mapping
- **WHEN** the named plugin evaluates the production build
- **THEN** it fails instead of assuming that a canonical-looking path or incomplete map is trusted.

#### Scenario: External modules are classified without a parsed callback
- **GIVEN** a real Astro build with benign external node:crypto used for a non-sink purpose, and separate builds importing an external raw-sink provider or an unclassified external
- **WHEN** the plugin classifies the exact builtin ID and observed null code without an extra resolver call at buildEnd
- **THEN** the benign build passes without requiring moduleParsed for node:crypto and each unsafe or unclassified external fails.

#### Scenario: Narrow JSON-LD grammar rejects widening forms
- **GIVEN** separate set:html fixtures using (safeConst), safeJsonLd<number>(payload), safeJsonLd?.(payload), (safeJsonLd(payload), input), member access obj.lng, a wrapper call wrap(payload), and let or var bindings
- **WHEN** tests/lint-trusted-html-sinks.test.mts runs the actual build and tracked-source gates
- **THEN** each fixture is rejected while genuine direct calls, supported const, conditional and null forms still pass.

#### Scenario: Internal marking is limited to the reviewed producer
- **GIVEN** the approved Markdown export marks the validated and safely serialized result, and a separate fixture marks an unvalidated value inside that same module
- **WHEN** the actual build gate evaluates each producer-to-marking path
- **THEN** it accepts the contract-compliant path and rejects the unmatched path despite its location inside the trusted module.

### Requirement: Each trusted sink has a reviewed input and escaping contract

The initial trusted exports SHALL be src/lib/charset.ts safeJsonLd and src/lib/markdown.ts renderMarkdown. safeJsonLd SHALL serialize JSON and escape HTML-significant characters so JSON-LD remains parseable without allowing script termination or raw HTML injection. FAQ rendering SHALL use a dedicated separately configured unified pipeline, not Astro's shared createMarkdownProcessor, which unconditionally runs rehype-raw. Raw HTML SHALL be disabled and rejected: configure remarkRehype with allowDangerousHtml:false, do not run rehype-raw, reject raw HTML nodes before a conversion could discard them, and reject any HAST raw node before serialization. Any newly imported pipeline packages SHALL be declared directly and locked. The element allowlist SHALL be p, strong, em, code, pre, ul, ol, li, a, br and img. The attribute allowlist SHALL permit only href/title/rel on a and src/alt/title on img; all other elements and attributes, including every event-handler and style attribute, SHALL be rejected. Every serialized attribute value SHALL be safely escaped.

After entity decoding and removal of ASCII controls and whitespace U+0000–U+0020 and U+007F, every generated URL SHALL match only https:, mailto:, a single-slash root-relative path that is not protocol-relative, or a #fragment. Root-relative candidates SHALL reject backslashes and resolve against the canonical site origin to the same origin, so slash-backslash cannot become a cross-origin URL. Protocol-relative URLs and http:, javascript:, vbscript:, file:, blob: and all data: URLs SHALL be rejected. Scheme checks SHALL be case-insensitive and cover encoded and control-character variants. The allowlists SHALL name every permitted URL-bearing attribute, including image src.

Existing FAQ answers SHALL remain authored in src/data/faq.ts. A validated content-collection loader in src/content.config.ts SHALL expose them without losing records. The renderer SHALL accept a validated FAQ entry checked against the canonical validated FAQ set after Content Layer serialization/deserialization, comparing every field affecting rendered output or retrieving the immutable canonical entry by key rather than trusting caller-supplied fields; a TypeScript annotation, valid ID alone, Symbol property or WeakSet identity is insufficient. The build gate SHALL restrict calls to the approved FAQ consumer src/components/FaqItem.astro. Each export SHALL have positive and negative contract tests using the actual renderer and build; other operations in a trusted module do not inherit trust.

#### Scenario: JSON-LD escaping is maintained
- **GIVEN** valid structured data including script-closing text and HTML-significant characters
- **WHEN** safeJsonLd produces JSON-LD through the actual build path
- **THEN** the data remains parseable and cannot terminate the script or introduce an HTML element; an unsafe unsanitized value is rejected.

#### Scenario: FAQ Markdown renders safely
- **GIVEN** all existing FAQ answers authored in src/data/faq.ts and loaded through the validated typed collection, plus separate inputs containing raw tags, event handlers and script payloads
- **WHEN** renderMarkdown is invoked through the actual build path
- **THEN** every existing answer remains present and supported Markdown renders, while every raw HTML input fails before marking or output.

#### Scenario: Non-collection Markdown is not trusted
- **GIVEN** a plain string, an unrelated entry, a forged entry reusing a genuine FAQ ID with a modified answer or question, a value-identical copy, and a valid FAQ entry read back after Content Layer serialization
- **WHEN** it is sent to the trusted FAQ renderer
- **THEN** the plain, unrelated and modified entries are rejected, the value-identical copy and round-tripped validated entry are accepted as canonical value matches, and a type annotation, ID alone or ephemeral object identity is insufficient.

#### Scenario: Markdown cannot generate unsafe URLs
- **GIVEN** typed FAQ Markdown containing HTTPS, mailto:, single-slash root-relative and fragment links, plus protocol-relative, slash-backslash, http:, javascript:, vbscript:, file:, blob: and data: links and images with entity, mixed-case and control/whitespace variants
- **WHEN** the actual renderer and build process the content
- **THEN** allowed URLs remain usable and every disallowed URL is rejected after normalization and same-origin resolution checks.

#### Scenario: Attribute payloads stay data
- **GIVEN** Markdown image alt/title or link title text containing quotes, including `![x" onerror="alert(1)](https://example.invalid/x)`, title breakout payloads and entity/control variants, alongside ordinary quoted text
- **WHEN** the actual renderer/build serializes output and the test parses the emitted HTML
- **THEN** ordinary and payload-bearing values remain data in the parsed allowed attributes and no payload creates an event handler or any unintended attribute or element.

### Requirement: Current trusted sink subjects match reviewed evidence

The single allowlist security/trusted-html-sinks.json SHALL list the approved module/export pairs and enumerate exact governed subjects: the allowlist itself; src/lib/charset.ts and src/lib/markdown.ts; src/content.config.ts and src/components/FaqItem.astro; src/lib/vite-plugin-trusted-html-sinks.ts, scripts/verify-trusted-html-output.mjs and all their gate modules; tests/lint-trusted-html-sinks.test.mts, tests/lint-trusted-html-sinks-governance.test.mts and their gate test/fixture files; astro.config.ts; and package-lock.json version and integrity tuples for serialize-javascript, @astrojs/markdown-remark and every directly imported sink runtime dependency, including selected FAQ pipeline packages. The stateless CI test tests/lint-trusted-html-sinks-governance.test.mts SHALL hash the current bytes of each listed file and the canonical current lock tuples, validate that every required subject is listed and resolves, and require a matching digest entry in openspec/changes/standardize-repository-layout/evidence/trusted-html-sinks.md. The entry SHALL cite a committed adversarial security-review report whose recorded verdict is exactly APPROVE and whose reviewed subject digests match the entry. The evidence and review report SHALL be excluded from their own digest subjects to avoid self-reference. No base-revision comparison or live branch lookup is required.

.github/CODEOWNERS SHALL list the allowlist path, but remains advisory under the existing zero-required-approval, code-owner-review-disabled, admin-bypass policy. The named test SHALL run in CI and locally against the current checkout, including after merge. Independent human security review is a recommended future upgrade, not an acceptance condition. Neither CODEOWNERS nor this test is claimed to prevent a deliberate maintainer/admin bypass.

#### Scenario: Sole maintainer with matching review passes
- **GIVEN** a sole-maintainer author, the existing zero-approval/admin-bypass policy, all required current subject hashes matching the evidence, and a committed report with exact verdict APPROVE and matching reviewed hashes
- **WHEN** tests/lint-trusted-html-sinks-governance.test.mts runs locally or in CI
- **THEN** the governance test passes without an authenticated independent human approval or new branch setting.

#### Scenario: Stale or missing subjects fail
- **GIVEN** an altered sink, gate, test, configuration, allowlist or pinned dependency tuple without updated matching evidence, or a required subject removed from the list or unavailable on disk
- **WHEN** the stateless governance test runs
- **THEN** it fails, including when the allowlist bytes otherwise remain unchanged.

#### Scenario: Missing or non-approving review fails
- **GIVEN** matching current subject hashes but a missing or unresolved report, an uncommitted report, a non-APPROVE verdict, or report hashes that differ from the evidence
- **WHEN** the stateless governance test runs
- **THEN** it fails; an evidence entry alone is insufficient.

### Requirement: Existing controls remain until the build gate is proven

The repository SHALL retain rules/security/no-set-html-directive.yml and tests/lint-set-html-safejsonld.test.mts, enabled and unchanged, until the replacement has passed adversarial security review with verdict APPROVE and the full round-5 baseline matrix plus every bypass recorded in the round-6 PR 11 investigation. The matrix SHALL cover small and 300-paragraph padded fixtures, genuine direct/const/safe-conditional/safe-or-null inputs, unsafe direct/conditional/concatenated/mixed output, and local lookalike, callback-shadowed sanitizer, rebound, wrong-module, unresolved and shadowed-safe-const uses; repeat the callback shadow in a real production-shaped component. The bypass controls SHALL include each raw sink and spread form named above, computed dynamic imports/properties, imported JS/TS wrappers in an actual build, charset.js competing with extensionless charset.ts, a plugin substituting code under a canonical ID, export-star proxy with a canonical side-effect import, stateful resolver perturbation from a nested resolve, parser errors, and unmatched or ambiguous source maps. Source-mapping controls SHALL include ASCII, astral-prefix and two-on-one-line sinks; binding controls SHALL include valid unrelated shadowing and parenthesized direct calls. For existing JSON-LD set:html uses, the candidate SHALL NOT broaden the prior source grammar and SHALL reject the dedicated grammar-negative forms above; the separately approved Markdown contract is unaffected. Unsupported or ambiguous transformations including erased TypeScript syntax SHALL fail. The actual candidate build gate SHALL reject unsafe controls and accept genuine controls; baseline false positives SHALL be recorded accurately.

After proof, the repository SHALL enable the new build and CI gate and retire the old YAML rule and source test atomically in the same implementation commit. It SHALL reconcile the live site-content FAQ pipeline contract to name the dedicated pipeline while preserving Markdown authoring and the raw-HTML prohibition, as well as the other active contracts and guidance enumerated in design.md D5; preserve task IDs/states and historical evidence; and validate affected changes. If proof or post-cutover checks fail, the replacement SHALL NOT land and both old controls SHALL remain enabled; no intermediate unprotected state is permitted.

#### Scenario: Incomplete replacement cannot land
- **GIVEN** a candidate that misses any baseline or bypass negative, fails a genuine positive, or has missing environment completion, unreconciled graph entries, unsupported syntax or ambiguous source mappings
- **WHEN** the implementation is evaluated
- **THEN** the gate fails and the original YAML and source test remain enabled unchanged.

#### Scenario: Proven replacement cuts over atomically
- **GIVEN** the complete matrix, real-build gate and stateless governance pass with a committed adversarial review verdict exactly APPROVE
- **WHEN** the implementation is committed
- **THEN** the build and CI enforce the new gate as the old YAML and source test retire together, and active guidance and security contracts describe the resulting enforcement.
