## 1. Implementation

- [x] 1.1 Add `.github/workflows/copilot-setup-steps.yml` with a single `copilot-setup-steps` job that checks out the repo, installs the latest LTS Node.js version, and runs `npm ci`.
- [x] 1.2 Add `workflow_dispatch` and path-filtered push/pull_request triggers for `.github/workflows/copilot-setup-steps.yml`.
- [x] 1.3 Document the Copilot setup workflow location and purpose in `README.md`.
- [x] 1.4 Validate with `openspec validate add-copilot-integration --strict`.
