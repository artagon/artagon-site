## 1. Implementation

- [ ] 1.1 Add `.github/workflows/copilot-setup-steps.yml` with a single `copilot-setup-steps` job that checks out the repo, installs Node 20.x, and runs `npm ci`.
- [ ] 1.2 Add `workflow_dispatch` and path-filtered push/pull_request triggers for `.github/workflows/copilot-setup-steps.yml`.
- [ ] 1.3 Document the Copilot setup workflow location and purpose in `README.md`.
- [ ] 1.4 Validate with `openspec validate add-copilot-integration --strict`.
