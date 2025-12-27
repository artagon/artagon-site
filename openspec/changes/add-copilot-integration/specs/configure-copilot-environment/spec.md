## ADDED Requirements

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
The `copilot-setup-steps` job SHALL check out the repository, install Node 20.x, and run `npm ci` to prepare dependencies.

#### Scenario: Dependencies are available
- **WHEN** the workflow runs for Copilot agent setup
- **THEN** the repository is available, Node 20.x is installed, and `npm ci` completes successfully.

### Requirement: Workflow validation triggers
The workflow SHALL include `workflow_dispatch` plus push and pull_request triggers scoped to changes in `.github/workflows/copilot-setup-steps.yml`.

#### Scenario: Workflow is testable
- **WHEN** maintainers need to validate the setup workflow
- **THEN** it can be run manually or on changes to the workflow file.
