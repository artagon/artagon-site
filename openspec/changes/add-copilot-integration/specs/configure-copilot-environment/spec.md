## ADDED Requirements

### Requirement: Copilot setup workflow
The repository SHALL include a GitHub Copilot coding agent setup workflow at `.github/workflows/copilot-setup-steps.yml` on the default branch.

#### Scenario: Workflow is available
- **WHEN** Copilot agents need to prepare the repository environment
- **THEN** the `copilot-setup-steps` workflow is available on the default branch.

### Requirement: Copilot job steps
The `copilot-setup-steps` job SHALL install Node 20 and run `npm ci` to prepare dependencies.

#### Scenario: Dependencies are available
- **WHEN** the workflow runs for Copilot agent setup
- **THEN** Node 20 is installed and `npm ci` completes successfully.
