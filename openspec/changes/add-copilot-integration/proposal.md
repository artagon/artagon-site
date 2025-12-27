## Why

Enable GitHub Copilot coding agent to prepare the repository environment using the supported Copilot setup workflow.

Reference: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment

## What Changes

- Add a Copilot agent environment setup workflow at `.github/workflows/copilot-setup-steps.yml` with a single `copilot-setup-steps` job that checks out the repo, installs the latest LTS Node.js version, and runs `npm ci`.
- Add validation triggers (`workflow_dispatch`, plus push/pull_request paths for the workflow file) so the setup workflow can be tested.
- Define OpenSpec requirements for configuring Copilot agent setup in a new capability spec.
- Document the Copilot setup workflow location and purpose in `README.md`.

## Impact

- Affected specs: `specs/configure-copilot-environment/spec.md`
- Affected code: `.github/workflows/copilot-setup-steps.yml`
