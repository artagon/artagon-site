## Why

Enable GitHub Copilot coding agent to prepare the repository environment using the supported Copilot setup workflow.

Reference: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment

## What Changes

- Add a Copilot agent environment setup workflow at `.github/workflows/copilot-setup-steps.yml`.
- Define OpenSpec requirements for configuring Copilot agent setup in a new capability spec.

## Impact

- Affected specs: `specs/configure-copilot-environment/spec.md`
- Affected code: `.github/workflows/copilot-setup-steps.yml`
