# openspec-workflow Specification

## Purpose
TBD - created by archiving change update-site-quality-checks. Update Purpose after archive.
## Requirements
### Requirement: OpenSpec Issue Creation

The workflow SHALL create a GitHub issue for each OpenSpec change and include a link to or a copy of the relevant spec content in the issue description.

#### Scenario: Issue captures OpenSpec change details

- **WHEN** an OpenSpec change moves from proposal to implementation
- **THEN** a GitHub issue exists that links to or includes the spec content for the change

### Requirement: OpenSpec Branch Naming

Implementation branches for OpenSpec changes SHALL follow the pattern `feature/site(spec#)-feature-short-name`, where `spec#` is the GitHub issue number for the change.

#### Scenario: Branch name encodes the issue number

- **WHEN** a feature branch is created for an OpenSpec change
- **THEN** the branch name matches `feature/site(spec#)-feature-short-name` and includes the issue number

### Requirement: Agent Context Updates

Agent context documentation SHALL include a summary of all changes made in the current branch, recorded in `.agents/context/glossary.md`.

#### Scenario: Context summary includes branch changes

- **WHEN** preparing the OpenSpec change for review
- **THEN** the agent context document lists the modified, added, and removed artifacts in the branch

