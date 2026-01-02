# configure-copilot-environment Specification

## Purpose
TBD - created by archiving change add-copilot-integration. Update Purpose after archive.
## Requirements
### Requirement: Copilot setup workflow file
The repository SHALL include a GitHub Copilot coding agent setup workflow at `.github/workflows/copilot-setup-steps.yml` on the default branch.

#### Scenario: Workflow is available
- **WHEN** Copilot agents need to prepare the repository environment
- **THEN** the `copilot-setup-steps` workflow is available on the default branch.

### Requirement: Copilot setup job naming
The workflow SHALL define a single job named `copilot-setup-steps`.

#### Scenario: Job is discoverable
- **WHEN** the workflow is parsed for Copilot agent setup
- **THEN** the `copilot-setup-steps` job is the only job defined.

### Requirement: Copilot job steps
The `copilot-setup-steps` job SHALL check out the repository, install the latest LTS Node.js version, and run `npm ci` to prepare dependencies.

#### Scenario: Dependencies are available
- **WHEN** the workflow runs for Copilot agent setup
- **THEN** the repository is available, the latest LTS Node.js version is installed, and `npm ci` completes successfully.

### Requirement: Workflow validation triggers
The workflow SHALL include `workflow_dispatch` plus push and pull_request triggers scoped to changes in `.github/workflows/copilot-setup-steps.yml`.

#### Scenario: Workflow is testable
- **WHEN** maintainers need to validate the setup workflow
- **THEN** it can be run manually or on changes to the workflow file.

### Requirement: Copilot context file
The repository SHALL include a Copilot context file at `COPILOT.md` in the repository root.

#### Scenario: Context file is available
- **WHEN** Copilot agents request repository guidance
- **THEN** `COPILOT.md` is available at the repository root.

### Requirement: Copilot/OpenSpec cross-link
`COPILOT.md` SHALL reference `openspec/AGENTS.md`, and `openspec/AGENTS.md` SHALL reference `COPILOT.md`.

#### Scenario: Cross-links are present
- **WHEN** a reader opens either document
- **THEN** the other document is referenced.

### Requirement: Copilot Instruction Files

The repository SHALL include `.github/copilot-instructions.md` and `.github/copilot-review-instructions.md` describing the OpenSpec workflow, spec locations (issues labeled `spec` and the `openspec/changes/` directory), and review expectations for spec compliance, including a structured review format and compliance rating guidance. These files MUST reference `openspec/AGENTS.md` for workflow details.

#### Scenario: Copilot loads project instructions
- **WHEN** Copilot agents request repository guidance
- **THEN** the instruction files are available and describe how to evaluate implementations against OpenSpec requirements and rate compliance.

### Requirement: Copilot OpenSpec Review Context

`COPILOT.md` SHALL instruct agents to read `openspec/project.md` and `openspec/contributing.md`, and to identify the active OpenSpec change via `openspec list` before reviewing current branch changes. `COPILOT.md` MUST link to `.github/copilot-instructions.md`, `.github/copilot-review-instructions.md`, and `openspec/AGENTS.md`.

#### Scenario: Copilot reviews an active change
- **WHEN** a Copilot agent is asked to review current branch changes for an OpenSpec change
- **THEN** the agent can identify the active change and evaluate the branch against its proposal and spec deltas in `openspec/changes/<change-id>/specs/`.

### Requirement: Copilot Context References OpenSpec Workflow

Copilot context files (`COPILOT.md`, `.github/copilot-instructions.md`, `.github/copilot-review-instructions.md`) MUST reference the OpenSpec workflow and point to the authoritative OpenSpec files under `openspec/`.

#### Scenario: Copilot follows OpenSpec references
- **WHEN** a Copilot agent reads the context files
- **THEN** the files link to `openspec/AGENTS.md` and direct the agent to the OpenSpec workflow sources.

