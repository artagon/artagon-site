# Contributing to Artagon Web

Thanks for contributing to the Artagon marketing site and docs shell.

## OpenSpec Workflow Overview

This repository uses OpenSpec for spec-driven development:
- Specs define what to build (GitHub Issues labeled `spec`).
- Proposals describe how to implement specs (PR comments, discussions, or separate PRs).
- Implementations are the code changes (PRs linked to the spec issue).

Authoritative workflow guidance lives in `openspec/AGENTS.md`, `openspec/project.md`, and `openspec/contributing.md`.

## How to Write a Good Specification

1. Use the spec issue template at `.github/ISSUE_TEMPLATE/spec.yml`.
2. Clearly state the problem in Summary and Motivation.
3. Provide a detailed design with concrete behavior.
4. Define acceptance criteria as testable checkboxes.
5. List explicit out-of-scope items and open questions.

## How to Submit a Proposal

1. Use the proposal template at `.github/ISSUE_TEMPLATE/proposal.yml`.
2. Reference the spec issue in the proposal title and body.
3. Compare alternatives and document trade-offs.
4. Include a phased implementation plan and risks.

## How to Implement Against a Spec

1. Create a branch following `feature/site(<spec#>)-<feature-short-name>`.
2. Use `openspec list` to identify the active change.
3. Read `openspec/changes/<change-id>/proposal.md`, `tasks.md`, and `specs/` deltas.
4. Keep changes scoped to the spec and update tasks as you complete items.
5. Add tests that validate the acceptance criteria.

## Review Process and Approval Requirements

- PRs must reference the parent spec issue.
- Reviewers validate acceptance criteria coverage and scope alignment.
- Implementation PRs without a spec reference should be labeled `needs-spec`.
- Breaking changes must be explicitly called out and matched to the spec.

## Examples

- Well-written specs: see active spec issues labeled `spec` and changes under `openspec/changes/`.
- Well-written implementations: look for PRs that link the spec, update tasks, and include tests.

Example spec (summary format):
- Title: `Spec: Add Tenant Audit Logs`
- Summary: `Provide a new audit log feed for tenant administrators.`
- Acceptance criteria: checklist with testable outcomes.

Example implementation (summary format):
- PR title: `feat(audit): add tenant audit log feed`
- PR body: links to the spec issue and `openspec/changes/<change-id>/`.
