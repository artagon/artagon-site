## ADDED Requirements

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
