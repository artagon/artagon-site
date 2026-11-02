## ADDED Requirements

### Requirement: Active checklist evidence extraction preserves task identity and state

Extracting historical prose from an active change's tasks.md SHALL preserve the complete ordered sequence of checkbox occurrences, including repeated IDs, each ID's state, nesting/parent context and actionable acceptance meaning. The checklist SHALL remain at its active tasks.md path and link to the retained evidence. The extraction SHALL NOT renumber, deduplicate, complete, reopen or reorder tasks, create an archive marker/directory, or imply that the active change has shipped.

For update-site-marketing-redesign, extracted historical prose SHALL be retained under openspec/changes/update-site-marketing-redesign/evidence/implementation-history.md, preserving its content except for explicitly recorded relative-link repairs. The historical-version exception SHALL move from the live tasks.md to only that evidence file; the live checklist SHALL no longer be exempt. Generated link-check configuration SHALL follow only the affected evidence path; the extraction SHALL NOT broadly disable checks.

Relative file references in moved prose, including backticked verbatim references, SHALL resolve to the same original targets from the new evidence directory. Existing sibling proposal.md/design.md/tasks.md references SHALL be rebased to ../proposal.md/../design.md/../tasks.md as applicable rather than excluded from checking. Lychee include_verbatim SHALL remain true. Current history pointers in openspec/project.md, the relocated docs/archive/2025-11-12-site-audit.md banner and docs/guides/new-design-conversion.md SHALL distinguish the live checklist from retained pt-log history and reach the cited evidence entries.

Before extraction, the migration SHALL establish that live tasks.md contains zero occurrences of new-design/extracted/DESIGN.md; a match SHALL block the move until corrected in that live file. It SHALL repeat the check afterward. scripts/verify-design-prerequisites.mjs SHALL retain its tasks-only scope; evidence/implementation-history.md is a historical authoring record and is not scanned by that gate. A passing verifier SHALL NOT be presented as validation of historical evidence contents.

#### Scenario: Duplicate IDs and states survive extraction
- **GIVEN** the current implementation head's ordered checkbox occurrences, including duplicate IDs and mixed states
- **WHEN** historical prose is extracted
- **THEN** a before/after occurrence comparison preserves every ID, state, order and parent context, and each retained historical narrative remains reachable through a stable evidence link.

#### Scenario: Extraction does not archive the redesign
- **GIVEN** update-site-marketing-redesign is active before the extraction
- **WHEN** its narrative is moved to the evidence subdirectory
- **THEN** scripts/lib/openspec-archive.mjs still reports it unarchived and the active tasks.md path still exists.

#### Scenario: Prerequisite and documentation consumers remain effective
- **GIVEN** the extraction candidate and the existing prerequisite fixtures
- **WHEN** scripts/verify-design-prerequisites.mjs, scripts/verify-prerequisites.mjs, their test suites, the scoped-package-version gate and generated-link-config checks run
- **THEN** the active-task and archive checks retain their prior semantics, the new historical evidence path is handled narrowly, and current actionable references still resolve.

#### Scenario: Moved verbatim sibling references preserve their targets
- **GIVEN** a migration fixture whose parent has proposal.md, design.md and tasks.md while its evidence directory has none of those files
- **WHEN** the configured Lychee gate with include_verbatim=true checks bare sibling references in the extracted evidence and then their ../-rebased forms
- **THEN** the unrepaired references fail, the repaired references pass and resolve to the original parent files, and no sibling-file or evidence-directory exclusion hides the failure.

#### Scenario: Existing history readers reach retained entries
- **GIVEN** the project guide's pt-counter/archive-sweep pointers, the historical audit's pt236 locator and the conversion guide's checklist/history paragraph
- **WHEN** extraction updates those reader documents in the same PR
- **THEN** their history links reach the corresponding retained narrative anchors, tasks.md remains the live checklist authority and the audit's historical findings/date remain unchanged.

#### Scenario: Extraction cannot hide a failing live prerequisite
- **GIVEN** a live tasks.md containing the stale design-path literal before extraction
- **WHEN** the migration precondition runs
- **THEN** extraction fails before moving that text, even though the production prerequisite scanner intentionally excludes the future historical evidence file.

#### Scenario: A state-changing extraction fails review
- **GIVEN** a candidate that deletes a repeated checkbox, flips its state, changes its ID or creates an archive-shaped directory
- **WHEN** the preservation and active-state checks run
- **THEN** the extraction is rejected even if the file is shorter and OpenSpec syntax validation passes.

#### Scenario: Live task version claims remain checked
- **GIVEN** the narrative extraction and replacement of the old live-checklist exception
- **WHEN** a stale scoped-package pin is placed in the live checklist and a separate historical quotation is retained in the evidence file
- **THEN** the version gate rejects the stale live claim while exempting only the historical quotation.

