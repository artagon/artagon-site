## ADDED Requirements

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
