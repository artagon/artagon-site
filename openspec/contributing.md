# Contributing to Artagon Web

Thanks for helping improve the Artagon marketing site and docs shell. This guide covers local setup, conventions, and the checks used in CI.

## Prerequisites

- Node 20+ and npm (CI uses Node 20 and 22)
- Git

## Quick Start

```bash
npm install
npm run dev
```

## Local Checks

```bash
# Build the static site (runs SRI and CSP postbuild)
npm run build

# Preview the production build
npm run preview

# Format files
npm run format
```

Optional CI parity checks:

```bash
# Lighthouse CI
npx -y @lhci/cli@0.14.x autorun --config=lighthouserc.json

# Link checks (if lychee is available locally)
lychee --config lychee.toml './**/*.md' './public/**/*.html' './src/**/*.astro'
```

## Project Conventions

- Pages live in `src/pages/` and should use `src/layouts/BaseLayout.astro`.
- Set `title` and `description` props on each page; provide `path`, `image`, or `robots` when needed.
- Use `src/components/Header.astro` and `src/components/Footer.astro` for standard navigation and footer links.
- Put structured lists in `src/data/` (for example FAQ and roadmap content).
- Store static assets in `public/` (icons, manifests, images).
- If you add a new top level route, update the primary nav in `src/components/Header.astro`.

## Security and SEO Notes

- Inline scripts are hashed into the CSP during `npm run build`. If you add or change inline scripts, always run a build to verify CSP output.
- If you add third party scripts or styles, update the allowlist logic in `scripts/csp.mjs`.
- `scripts/sri.mjs` adds integrity attributes to local JS and CSS. Avoid CDN minification that would change file contents.
- New pages should include accurate meta descriptions and canonical paths via `BaseLayout` props.

## Search (DocSearch)

- The `/search` page expects Algolia DocSearch settings in `public/docsearch.json`.
- Leave the values empty when DocSearch is not configured.

## Assets and Media

- Use `scripts/make-og-from-template.sh` to generate OG images from the SVG template.
- Use `scripts/make-favicon.sh` or `scripts/svg-to-pngs.sh` for icon updates.
- Keep filenames and sizes consistent with existing assets in `public/assets`.

## Pull Requests

- Follow the checklist in `.github/pull_request_template.md`.
- Review `.agents/policies/guardrails.md` and `.agents/policies/release-checklist.md` when applicable.
- Keep PRs focused and include screenshots for UI changes.

## Branch Naming Strategy

For OpenSpec changes, branch names MUST follow:

```
feature/site(<spec#>)-<feature-short-name>
```

`<spec#>` is the GitHub issue number created for the OpenSpec change.

Example:
```bash
feature/site(42)-quality-checks-workflow
```

For non-OpenSpec work, follow the conventional commits pattern:

```
<type>/<scope>-<description>
```

**Types:**
- `feat/` - New feature or capability
- `fix/` - Bug fix
- `docs/` - Documentation only
- `style/` - Formatting, missing semicolons, etc (no code change)
- `refactor/` - Code restructuring without changing behavior
- `perf/` - Performance improvements
- `test/` - Adding or updating tests
- `chore/` - Build process, tooling, dependencies
- `archive/` - OpenSpec archiving operations

**Scope** (optional but recommended):
- Component or area affected: `faq`, `roadmap`, `auth`, `build`, `openspec`
- For OpenSpec changes, use the change-id as scope when applicable

**Examples (non-OpenSpec):**
```bash
feat/faq-search-functionality
fix/roadmap-mobile-layout
docs/openspec-archiving-guide
refactor/header-navigation
chore/lighthouse-ci-setup
archive/add-two-factor-auth
```

**Reference format in commit messages:**

```bash
# Reference both spec and change
feat(auth): add two-factor authentication

Implements openspec/changes/add-two-factor-auth/
Affects: specs/auth/spec.md

Closes #42

# Reference spec only for fixes
fix(faq): correct schema markup

Updates specs/faq/spec.md
Fixes #55
```

## AI Agent Workflow (OpenSpec)

When an AI agent works from an OpenSpec item, it must:

1. **Identify the change-id and affected spec(s)**
   ```bash
   # List active changes to find the change-id
   openspec list

   # View change details to see affected specs
   openspec show <change-id>
   ```

2. **Create a GitHub issue** - Include either a link to the spec or a copy of the spec as the issue description
   ```bash
   # Example issue title: "Add Two-Factor Authentication [add-two-factor-auth]"
   # Include in body: Link to openspec/changes/add-two-factor-auth/
   ```

3. **Create a branch** following the naming strategy:
   ```bash
   # Required for OpenSpec changes
   git checkout -b feature/site(42)-two-factor-auth

   # For bug fixes to existing specs
   git checkout -b fix/faq-correct-schema

   # For archiving (always use change-id)
   git checkout -b archive/add-two-factor-auth
   ```

4. **Update agent context** - Summarize all branch changes in the agent context document

5. **Follow conventional commits** - Structure commit messages with references:
   ```bash
   # Pattern: <type>(<spec-id>): <description>
   git commit -m "feat(auth): add two-factor authentication

   Implements openspec/changes/add-two-factor-auth/
   Affects: specs/auth/spec.md

   - Add OTP generation and validation
   - Update login flow to require 2FA
   - Add user settings for 2FA management

   Closes #42"
   ```

6. **Link everything together**:
   - Branch name follows: `feature/site(42)-two-factor-auth`
   - Commit scope matches spec-id: `feat(auth):`
   - Commit body references: `openspec/changes/add-two-factor-auth/`
   - Commit closes issue: `Closes #42`
   - PR title format: `feat(auth): Add Two-Factor Authentication`

## Archiving Changes and Closing Issues

After a change is deployed to production, follow these steps to properly archive and close:

### 1. Archive the OpenSpec Change

```bash
# Archive the change (this moves it to archive/ with timestamp)
openspec archive <change-id> --yes

# If the change only affected tooling/docs (no spec updates needed)
openspec archive <change-id> --skip-specs --yes

# Validate the archive was successful
openspec validate --strict
```

**Important:**
- Always pass the exact `change-id` explicitly (don't rely on defaults)
- Use `--yes` flag for non-interactive automation
- Run validation after archiving to ensure specs remain consistent
- The archived change will be moved to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`

### 2. Update Specifications (if applicable)

If the change introduced new capabilities or modified existing ones:
- The archive process should have updated `openspec/specs/` with the delta changes
- Verify the specs reflect the current deployed state
- If using `--skip-specs`, manually update specs or document why they weren't changed

### 3. Close Related GitHub Issues

When closing issues after deployment:
- Reference the merged PR number
- Confirm the change is live in production
- Include link to archived change if applicable

Example:
```
Resolved in #123. Change archived to openspec/changes/archive/2025-12-26-add-feature-name/.
Deployed to production and verified.
```

### 4. Create Separate Archive PR

Per OpenSpec best practices:
- Create a **separate PR** for the archive operation
- Do not mix archiving with implementation work
- This keeps the git history clean and makes rollbacks easier

Example workflow:
```bash
# After feature PR is merged and deployed
git checkout main
git pull origin main

# Create archive branch
git checkout -b archive/add-feature-name

# Archive the change
openspec archive add-feature-name --yes
openspec validate --strict

# Commit and push
git add openspec/
git commit -m "Archive add-feature-name change after deployment"
git push origin archive/add-feature-name

# Create PR, merge, then close related issues
```

### When NOT to Archive

Do not archive changes that:
- Are still in development or testing
- Have not been deployed to production
- Encountered blockers or were abandoned (document in proposal.md instead)
- Are bug fixes that don't have OpenSpec changes (just close the issue)

## OpenSpec Commands Reference

Quick reference for common OpenSpec operations:

```bash
# List all active changes
openspec list

# List all specifications (capabilities)
openspec list --specs

# Show details of a change or spec
openspec show <change-id>
openspec show <spec-id> --type spec

# Validate a specific change with comprehensive checks
openspec validate <change-id> --strict

# Validate all specs and changes
openspec validate --strict

# Archive a change after deployment
openspec archive <change-id> --yes

# Archive without updating specs (tooling/docs only)
openspec archive <change-id> --skip-specs --yes

# Show change details with deltas only (debugging)
openspec show <change-id> --json --deltas-only

# Show specific requirement from a spec
openspec show <spec-id> --json -r 1
```

## AI Agent Workflow Examples

### Example 1: Implementing and Closing a Feature

Complete workflow from implementation through archiving:

```bash
# Step 1: Agent reads the change proposal
openspec show add-two-factor-auth

# Step 2: Implement all tasks from tasks.md
# (Agent completes implementation, creates PR, gets approval, merges)

# Step 3: Verify deployment to production
# (Confirm feature is live on artagon.com)

# Step 4: Create archive branch
git checkout main
git pull origin main
git checkout -b archive/add-two-factor-auth

# Step 5: Archive the change
openspec archive add-two-factor-auth --yes

# Step 6: Validate everything still passes
openspec validate --strict

# Step 7: Commit and push
git add openspec/
git commit -m "Archive add-two-factor-auth after production deployment

- Moved change to archive/2025-12-26-add-two-factor-auth/
- Updated specs/auth/spec.md with new requirements
- Validated all specs pass strict checks"

git push origin archive/add-two-factor-auth

# Step 8: Create PR for archive
gh pr create --title "Archive add-two-factor-auth" --body "$(cat <<'EOF'
## Summary

Archive the add-two-factor-auth change after successful production deployment.

## Changes

- Moved openspec/changes/add-two-factor-auth/ → archive/2025-12-26-add-two-factor-auth/
- Updated openspec/specs/auth/spec.md with two-factor authentication requirements
- Validated with `openspec validate --strict`

## Verification

- [x] Feature deployed to production
- [x] Archive validation passes
- [x] Specs reflect current deployed state

Related: Closes #42
EOF
)"

# Step 9: After archive PR merges, close the related issue
# Use GitHub UI or gh CLI:
gh issue close 42 --comment "Resolved in #123. Change archived to openspec/changes/archive/2025-12-26-add-two-factor-auth/. Deployed to production and verified."
```

### Example 2: Tooling/Documentation Change

For changes that don't affect capability specs:

```bash
# Implementation complete and deployed
git checkout -b archive/update-build-scripts

# Archive without spec updates
openspec archive update-build-scripts --skip-specs --yes
openspec validate --strict

git add openspec/
git commit -m "Archive update-build-scripts after deployment"
git push origin archive/update-build-scripts

# Create and merge PR, then close issue
gh issue close 89 --comment "Resolved in #90. Tooling change archived (no spec updates needed)."
```

### Example 3: Bug Fix Without OpenSpec Change

For simple bug fixes that don't require proposals:

```bash
# No OpenSpec change exists, just fix the bug directly
git checkout -b fix/correct-typo-in-faq

# Make fix, commit, push, create PR
git add src/data/faq.ts
git commit -m "Fix typo in FAQ section"
git push origin fix/correct-typo-in-faq

gh pr create --title "Fix typo in FAQ" --body "Corrects spelling error in FAQ answer."

# After merge, close issue directly (no archiving needed)
gh issue close 55 --comment "Fixed in #56. No OpenSpec change required for this typo fix."
```

### Example 4: AI Agent Discovery Workflow

When an AI agent needs to understand what to archive:

```bash
# Step 1: List all active changes
openspec list
# Output: add-two-factor-auth, update-roadmap-page

# Step 2: Check which are deployed
# (Agent checks production site or asks user)

# Step 3: Show change details to verify what was implemented
openspec show add-two-factor-auth

# Step 4: Review tasks to confirm all completed
cat openspec/changes/add-two-factor-auth/tasks.md

# Step 5: Verify all tasks marked [x] before archiving
# If any tasks are [ ] incomplete, DO NOT archive yet

# Step 6: Only archive if:
# - All tasks checked [x]
# - Feature deployed to production
# - User confirms or deployment verified

# Step 7: Proceed with archive workflow (see Example 1)
```

### Example 5: Multi-Capability Change

For changes affecting multiple specs:

```bash
# Review what specs will be updated
openspec show add-2fa-notify --json --deltas-only
# Shows deltas for: specs/auth/spec.md, specs/notifications/spec.md

# Archive (updates both specs automatically)
openspec archive add-2fa-notify --yes

# Verify both specs updated
openspec show auth --type spec
openspec show notifications --type spec

# Commit reflects multi-spec update
git commit -m "Archive add-2fa-notify after deployment

- Updated specs/auth/spec.md with 2FA requirements
- Updated specs/notifications/spec.md with OTP notification
- Validated all specs pass"
```

## AI Agent Best Practices for Archiving

When working as an AI agent:

1. **Always verify deployment first** - Don't archive until confirmed in production
2. **Check tasks.md completion** - All items must be `[x]` checked before archiving
3. **Use --strict validation** - Run `openspec validate --strict` before and after archiving
4. **Create separate archive PR** - Never mix implementation and archiving in same PR
5. **Include context in commits** - Explain what specs were updated and why
6. **Reference related issues** - Use "Closes #N" in PR body to auto-close issues
7. **Verify spec updates** - After archiving, confirm specs reflect deployed reality
8. **Document skip-specs usage** - If using `--skip-specs`, explain why in commit message
