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

### Requirement: Spec and Proposal Issue Templates

The repository SHALL provide issue templates at `.github/ISSUE_TEMPLATE/spec.yml` and `.github/ISSUE_TEMPLATE/proposal.yml` that capture summary, motivation, detailed design, acceptance criteria, scope, and implementation planning details.

#### Scenario: Author creates a spec issue
- **WHEN** a maintainer opens a new issue using the spec template
- **THEN** the issue form prompts for summary, motivation, detailed design, acceptance criteria, and scope boundaries.

### Requirement: Spec-Aware Pull Request Template

The repository SHALL provide a pull request template at `.github/PULL_REQUEST_TEMPLATE.md` that includes spec or proposal references, a spec compliance checklist, testing checklist, and breaking change declaration.

#### Scenario: Contributor opens a pull request
- **WHEN** a contributor opens a pull request
- **THEN** the template prompts them to link the related spec or proposal and confirm compliance and testing.

### Requirement: Spec Compliance Automation

The repository SHALL include `scripts/validate-spec-reference.js` and `.github/workflows/spec-compliance.yml` to validate spec references on pull requests, extract acceptance criteria, label PRs by type, post a summary comment for reviewers, and fail implementation PRs that omit a spec reference.

#### Scenario: Implementation PR missing spec reference
- **WHEN** an implementation pull request is opened without a spec issue reference
- **THEN** the spec compliance workflow fails and reports the missing reference.

### Requirement: Spec Review Reminders and Labels

The repository SHALL include `.github/workflows/spec-review-reminder.yml` and `.github/labels.yml` to label spec/proposal/implementation work and to create follow-up reminders when specs are approved or merged.

#### Scenario: Spec is approved
- **WHEN** a spec issue is marked approved or merged
- **THEN** a tracking reminder is created and the relevant labels are applied.

### Requirement: OpenSpec Contribution Guide

The repository SHALL include an OpenSpec workflow section in `docs/CONTRIBUTING.md` explaining how to write specifications, submit proposals, implement changes, and pass review.

#### Scenario: Contributor needs workflow guidance
- **WHEN** a contributor reads `docs/CONTRIBUTING.md`
- **THEN** they can follow the documented steps for spec-driven development.

