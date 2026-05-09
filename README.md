# Artagon Web

> **The Unified Identity Platform**: Trusted Identity for Machines and Humans — Verified, Private, Attested

[![Deploy](https://github.com/artagon/artagon-site/actions/workflows/deploy.yml/badge.svg)](https://github.com/artagon/artagon-site/actions/workflows/deploy.yml)
[![Link Check](https://github.com/artagon/artagon-site/actions/workflows/link-check.yml/badge.svg)](https://github.com/artagon/artagon-site/actions/workflows/link-check.yml)
[![Lighthouse CI](https://github.com/artagon/artagon-site/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/artagon/artagon-site/actions/workflows/lighthouse.yml)

Static marketing website for the Artagon Identity Platform, built with Astro and deployed to GitHub Pages at [artagon.com](https://artagon.com).

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Configuration](#configuration)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Security & Performance](#security--performance)
- [Scripts & Utilities](#scripts--utilities)
- [CI/CD Pipeline](#cicd-pipeline)
- [OpenSpec Workflow](#openspec-workflow)
- [Contributing](#contributing)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Format code
npm run format
```

## Project Structure

```
artagon-site/
├── .agents/                 # AI agent configuration and policies
├── .github/workflows/       # GitHub Actions CI/CD pipelines
├── openspec/               # OpenSpec spec-driven development
│   ├── changes/            # Proposed changes and features
│   ├── specs/              # Current capability specifications
│   ├── project.md          # Project conventions
│   ├── contributing.md     # Contribution guidelines
│   └── AGENTS.md          # AI agent instructions
├── public/                 # Static assets (copied as-is to .build/dist/)
│   ├── .well-known/        # Well-known URIs
│   ├── assets/             # Images, logos, OG images
│   │   └── logos/          # Logo variants and documentation
│   ├── icons/              # Favicons and app icons
│   ├── docsearch.json      # Algolia DocSearch config
│   ├── robots.txt          # Search engine directives
│   └── sitemap.xml         # Generated sitemap
├── scripts/                # Build and asset generation scripts
│   ├── csp.mjs             # Content Security Policy injection
│   ├── lhci-serve.mjs      # LHCI local server with ready signal
│   ├── sri.mjs             # Subresource Integrity injection
│   ├── make-og-from-template.sh  # OG image generation
│   ├── make-favicon.sh     # Favicon generation
│   └── icons/              # Icon generation utilities
├── src/
│   ├── components/         # Reusable Astro components
│   │   ├── Header.astro    # Main navigation
│   │   ├── Footer.astro    # Site footer
│   │   ├── SeoTags.astro   # SEO meta tags
│   │   ├── FaqSearch.astro # FAQ search functionality
│   │   └── ...
│   ├── data/               # Structured data
│   │   ├── faq.ts          # FAQ content with schema
│   │   └── roadmap.ts      # Roadmap phases and timeline
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout template
│   └── pages/              # File-based routing
│       ├── index.astro     # Homepage
│       ├── platform/       # Platform features
│       ├── roadmap/        # Product roadmap
│       ├── faq/            # FAQ page
│       ├── vision/         # Vision and strategy
│       ├── docs/           # Docs shell
│       ├── console/        # Console shell
│       ├── search/         # Search interface
│       └── ...
├── astro.config.ts         # Astro configuration (TypeScript)
├── lighthouserc.json       # Lighthouse CI thresholds
├── lychee.toml             # Link checker configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Technology Stack

### Core Framework

- **[Astro](https://astro.build/)** v6.2.1 - Static site generator with zero JS by default (per `package.json` `"astro": "6.2.1"`)
- **Static Output** - Pure HTML/CSS/JS, no server required
- **File-based Routing** - Pages in `src/pages/` map to routes

### Integrations

- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** - Automatic sitemap.xml generation
  - Filters out `/_drafts/` pages
  - Canonical domain: `https://artagon.com`

### Build Tools

- **Node.js** 22+ (per `.nvmrc` 22.12 and `package.json` engines.node `>=22.0.0`; CI workflows pinned to 22 per pt193)
- **npm** - Package manager
- **Prettier** 3.8.3 - Code formatting (per `package.json` `"prettier": "3.8.3"`)

### Security & Performance

- **Subresource Integrity (SRI)** - Cryptographic hash validation for JS/CSS
- **Content Security Policy (CSP)** - Script execution controls via meta tags
- **Lighthouse CI** - Automated performance and accessibility audits
- **Lychee** - Link checking and validation

## Configuration

### Astro Configuration

**File:** `astro.config.mjs`

```javascript
export default defineConfig({
  site: "https://artagon.com", // Canonical domain
  output: "static", // Static site generation
  trailingSlash: "never", // Clean URLs without trailing slashes
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/_drafts/"),
      customPages: [],
    }),
  ],
});
```

### Lighthouse CI Configuration

**File:** `lighthouserc.json`

Performance thresholds enforced in CI:

- **Performance**: ≥90% (warning)
- **Accessibility**: ≥95% (error)
- **Best Practices**: ≥90% (error)
- **SEO**: ≥95% (error)

Runs 2 times per URL and uploads to temporary public storage.

Local usage:

```bash
npm run build
npx -y @lhci/cli@0.14.x autorun --config=lighthouserc.json
```

The LHCI config starts `scripts/lhci-serve.mjs`, which prints `READY` once the
static server responds. Override the port with `LHCI_PORT` if needed.

### Link Checker Configuration

**File:** `lychee.toml`

```toml
verbose = "info"
accept = ["200..299", "403"]
exclude_path = ["dist", "node_modules"]
exclude = [
  "http://localhost.*",
  "https://twitter.com/.*",  # Often blocks bots
  "mailto:.*"
]
retry_wait_time = 2
max_retries = 2
timeout = 20
```

### Package.json Scripts

```json
{
  "dev": "astro dev", // Start dev server
  "build": "astro build", // Build + run postbuild scripts
  "preview": "astro preview", // Preview production build
  "format": "prettier --write .", // Format all files
  "postbuild": "node scripts/sri.mjs && node scripts/csp.mjs"
}
```

**Postbuild Pipeline:**

1. `astro build` - Compiles to `.build/dist/` (per `build.config.json` SSoT)
2. `scripts/sri.mjs` - Injects SRI hashes and crossorigin attributes
3. `scripts/csp.mjs` - Generates CSP meta tags with inline script hashes

## Development

### Local Development Server

```bash
npm run dev
```

- Runs on `http://localhost:4321`
- Hot module reloading enabled
- File watching for instant updates

### Environment Variables

Create `.env` file for local configuration (gitignored):

```bash
# Currently no environment variables required
# Add as needed for local development
```

### Adding New Pages

1. Create `.astro` file in `src/pages/`
2. Use `BaseLayout` wrapper:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout
  title="Page Title"
  description="SEO description (150-160 chars)"
  path="/page-path"
>
  <!-- Page content -->
</BaseLayout>
```

3. Update navigation in `src/components/Header.astro` if adding top-level route

### Component Development

**Location:** `src/components/`

All components are Astro components (`.astro` files) with:

- Zero JavaScript by default (ships pure HTML/CSS)
- Optional client-side JS via `<script>` tags
- TypeScript support in frontmatter

**Key Components:**

- `Header.astro` - Main navigation with theme toggle
- `Footer.astro` - Site footer with links
- `SeoTags.astro` - Meta tags, Open Graph, JSON-LD schema
- `FaqSearch.astro` - Client-side FAQ search
- `RoadmapPhaseCard.astro` - Roadmap timeline cards

### Structured Data

**Location:** `src/data/`

TypeScript files exporting structured content:

**`faq.ts`** - FAQ with JSON-LD schema:

```typescript
export const faqData = {
  title: "Frequently Asked Questions",
  items: [
    {
      question: "What is Artagon?",
      answer: "...",
    },
  ],
};
```

**`roadmap.ts`** - Product roadmap phases:

```typescript
export const roadmapPhases = [
  {
    phase: "Foundation",
    quarter: "Q1 2024",
    status: "in-progress",
    items: [...],
  },
];
```

## Build & Deployment

### Production Build

```bash
npm run build
```

**Build Process:**

1. **Prebuild:** `npm run sync:build-config` regenerates `lighthouserc.json` and `lychee.toml` from `build.config.json`
2. Astro compiles pages, components, and assets to `.build/dist/`
3. Sitemap generated at `.build/dist/sitemap.xml`
4. **Postbuild:** SRI script adds integrity hashes to `<script>` and `<link>` tags
5. **Postbuild:** CSP script injects Content Security Policy meta tag

**Output:** `.build/dist/` directory with static HTML/CSS/JS

All runtime artifacts live under `.build/{cache,reports,dist}/` — see [`docs/build-artifacts.md`](./docs/build-artifacts.md) for the full SSoT contract, generated-file list, and "add a tool" contributor checklist.

### Clean

```bash
npm run clean          # remove .build/ entirely
npm run clean:cache    # remove .build/cache/ only (keep reports + dist)
npm run clean:reports  # remove .build/reports/ only
```

All clean scripts are lock-aware (refuse to delete while a test run holds `.build/.run.lock`).

### Preview Build Locally

```bash
npm run preview
```

Serves `.build/dist/` on `http://localhost:4321` to test production build.

### GitHub Pages Deployment

**Automatic deployment on push to `main` branch.**

**Workflow:** `.github/workflows/deploy.yml`

```yaml
1. Checkout code
2. Setup Node.js 22
3. npm install
4. npm run build
5. Upload `.build/dist/` artifact
6. Deploy to GitHub Pages
```

**Required Pages setting:** set **Source** to **GitHub Actions** so deployments run from `.github/workflows/deploy.yml` (branch-based Jekyll builds are not supported).

**Configuration:**

- **Custom domain:** `artagon.com` (set in repo settings)
- **CNAME:** `artagon.com` (in `public/CNAME`)
- **HTTPS:** Enforced via GitHub Pages settings
- **Permissions:** `contents: read, pages: write, id-token: write`

### Release Bundles

Tagged releases (e.g., `v0.1.0`) automatically:

1. Build the site
2. Create GitHub release
3. Attach `dist.zip` to release

**Workflow:** `.github/workflows/release.yml`

## Design contract

openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change.

- **[`DESIGN.md`](./DESIGN.md)** — canonical visual identity contract: color tokens (OKLCH prose + sRGB hex frontmatter), typography, spacing, rounded scale, and component visual contracts.
- **[`docs/design-md.md`](./docs/design-md.md)** — authoring and maintenance guide: precedence chain, how to add a token, how to bump the upstream `@google/design.md` version, OKLCH↔hex hybrid policy, upstream attribution, and the `check:design-drift` allow-list.

The `npm run lint:design` gate runs in `postbuild` and on every PR that touches `DESIGN.md`. See `docs/design-md.md` for full details.

## Security & Performance

### Subresource Integrity (SRI)

**Script:** `scripts/sri.mjs`

Automatically adds cryptographic hashes to local JS/CSS resources:

```html
<!-- Before -->
<script src="/assets/app.js"></script>

<!-- After -->
<script
  src="/assets/app.js"
  integrity="sha256-..."
  crossorigin="anonymous"
></script>
```

**Important:** Disable CDN minification to avoid SRI mismatches.

### Content Security Policy (CSP)

**Script:** `scripts/csp.mjs`

Generates strict CSP as `<meta>` tag with:

- `default-src 'self'` - Only same-origin resources
- `script-src 'self' 'sha256-...'` - Inline scripts hashed
- `style-src 'self' 'unsafe-inline'` - Styles allowed (Astro scoped styles)
- `img-src 'self' data:` - Images from same origin + data URIs
- `object-src 'none'` - No plugins
- `base-uri 'none'` - Prevent base tag injection
- `frame-ancestors 'none'` - Prevent clickjacking

All inline `<script>` tags are hashed and added to CSP automatically.

### Performance Optimizations

- **Zero JS by default** - Astro ships pure HTML/CSS
- **Scoped CSS** - Component styles are scoped and bundled
- **Asset optimization** - Images and icons optimized for web
- **Static generation** - No server-side rendering overhead
- **Lighthouse scores** - Enforced ≥90% performance in CI

### Security Headers

**Recommended headers** (configure at CDN/hosting level):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Scripts & Utilities

All scripts located in `scripts/` directory.

### Asset Generation Scripts

#### OG Image Generation

```bash
./scripts/make-og-from-template.sh \
  "Artagon — Identity that can prove it" \
  "Passkeys • VCs • Attestation • Policy" \
  public/assets/og-image.png \
  --logo public/assets/logo-lockup.png
```

Creates Open Graph images from SVG templates.

#### Favicon Generation

```bash
./scripts/make-favicon.sh
```

Generates multi-size favicons from source SVG.

#### Icon Generation

```bash
./scripts/icons/make-icons.sh
```

Creates app icons, touch icons, and PWA assets.

**Documentation:**

- `scripts/icons/README.md` - Icon generation overview
- `scripts/icons/VERIFICATION.md` - Icon verification checklist

#### SVG to PNG Conversion

```bash
./scripts/svg-to-pngs.sh input.svg output-dir/
```

Batch converts SVG to multiple PNG sizes.

#### Logo Conversion

```bash
./scripts/convert-logos.sh
```

Generates logo variants from source files.

**Documentation:**

- `public/assets/logos/README.md` - Logo usage guidelines and variant inventory

### Build Scripts

#### SRI Injection

**File:** `scripts/sri.mjs`

- Scans all HTML files in `.build/dist/`
- Computes SHA-256 hashes for local JS/CSS
- Adds `integrity` and `crossorigin` attributes
- Updates HTML in-place

#### CSP Injection

**File:** `scripts/csp.mjs`

- Extracts inline script content from all HTML files
- Computes SHA-256 hashes
- Builds CSP policy with script hashes
- Injects `<meta http-equiv="Content-Security-Policy">` tag

## CI/CD Pipeline

### GitHub Actions Workflows

**Location:** `.github/workflows/`

#### Deploy (`deploy.yml`)

**Trigger:** Push to `main` or manual dispatch

**Jobs:**

1. **Build** - Install deps, build site, upload artifact
2. **Deploy** - Deploy to GitHub Pages

**Node version:** 22

#### Lighthouse CI (`lighthouse.yml`)

**Trigger:** Push to `main`

**Process:**

1. Build site
2. Start HTTP server on port 8081
3. Run Lighthouse audits (2 runs)
4. Assert score thresholds
5. Upload results to temporary storage

**Thresholds:**

- Performance: ≥90% (warn)
- Accessibility: ≥95% (error)
- Best Practices: ≥90% (error)
- SEO: ≥95% (error)

#### Link Check (`link-check.yml`)

**Trigger:** Scheduled (weekly) or manual

**Process:**

1. Build site
2. Run `lychee` link checker on:
   - Markdown files (`**/*.md`)
   - HTML files (`public/**/*.html`)
   - Astro components (`src/**/*.astro`)

**Configuration:** `lychee.toml`

#### Agents Check (`agents-check.yml`)

**Trigger:** Push

Validates AI agent configuration in `.agents/` directory.

#### Copilot Setup Steps (`copilot-setup-steps.yml`)

**Trigger:** Manual dispatch or changes to the workflow file

Prepares the repository for GitHub Copilot coding agent sessions. The workflow must define a single `copilot-setup-steps` job that checks out the repo, installs the latest LTS Node.js version, and runs `npm ci`.

#### Release (`release.yml`)

**Trigger:** Push tag matching `v*.*.*`

**Process:**

1. Build site
2. Create zip of `.build/dist/`
3. Create GitHub release
4. Attach `dist.zip` as release asset

## OpenSpec Workflow

This project uses **OpenSpec** for spec-driven development.

### Key Concepts

- **Specs** (`openspec/specs/`) - Current truth, what IS built
- **Changes** (`openspec/changes/`) - Proposals, what SHOULD change
- **Archive** (`openspec/changes/archive/`) - Completed changes

### Common Commands

```bash
# List active changes
openspec list

# List all specifications
openspec list --specs

# Show change or spec details
openspec show <change-id>
openspec show <spec-id> --type spec

# Validate changes
openspec validate <change-id> --strict

# Archive after deployment
openspec archive <change-id> --yes
```

### Workflow

1. **Create Proposal** - New feature or breaking change
   - `openspec/changes/<change-id>/proposal.md`
   - `openspec/changes/<change-id>/tasks.md`
   - `openspec/changes/<change-id>/specs/<spec-id>/spec.md`

2. **Create Issue** - Link or copy the spec into the issue description

3. **Implement** - Follow tasks.md checklist
   - Branch: `feature/site(<spec#>)-<feature-short-name>` (`spec#` is the GitHub issue number)
   - Commits: `feat(<spec-id>): description`
   - Update agent context docs with a summary of branch changes

4. **Archive** - After deployment to production
   - Branch: `archive/<change-id>`
   - Command: `openspec archive <change-id> --yes`
   - Creates: `openspec/changes/archive/YYYY-MM-DD-<change-id>/`

### Documentation

- **`AGENTS.md`** - Canonical project + OpenSpec agent guide (CLAUDE.md / GEMINI.md symlink to it)
- **`openspec/project.md`** - Project context and conventions
- **`openspec/contributing.md`** - Contribution guidelines with examples

## Contributing

See **[openspec/contributing.md](./openspec/contributing.md)** for:

- Branch naming conventions (conventional commits)
- OpenSpec workflow examples
- AI agent best practices
- Archiving and closing issues
- Code formatting and linting

### Quick Contribution Guide

1. **Check existing work:**

   ```bash
   openspec list          # Active changes
   openspec list --specs  # Existing capabilities
   ```

2. **Create issue and include spec content:**

   ```bash
   # Issue description must link to or include the OpenSpec change
   gh issue create --title "Spec: <change-id>" --body "..."
   ```

3. **Create feature branch** (spec# = GitHub issue number):

   ```bash
   git checkout -b feature/site(<spec#>)-<feature-short-name>
   ```

4. **Make changes, commit:**

   ```bash
   git commit -m "feat(<spec-id>): description

   Implements openspec/changes/<change-id>/
   Affects: specs/<spec-id>/spec.md

   Closes #<spec#>"
   ```

5. **Run local checks:**

   ```bash
   npm run format
   npm run build
   npm run preview
   ```

6. **Create PR:**

   ```bash
   gh pr create --title "feat(<spec-id>): Title" --body "..."
   ```

7. **After deployment, archive:**
   ```bash
   git checkout -b archive/<change-id>
   openspec archive <change-id> --yes
   openspec validate --strict
   # Commit, PR, merge
   ```

### Code Style

- **Formatting:** Prettier (run `npm run format`)
- **Commits:** Conventional commits format
- **Components:** Astro components with TypeScript frontmatter
- **CSS:** Scoped component styles, CSS custom properties

### Pull Request Checklist

- [ ] Branch follows naming convention (`feature/site(spec#)-...` for OpenSpec changes; `feat/`, `fix/`, etc. otherwise)
- [ ] Commits reference OpenSpec changes and issues
- [ ] Local build succeeds (`npm run build`)
- [ ] Code formatted (`npm run format`)
- [ ] SEO tags updated for new pages
- [ ] Navigation updated if adding routes
- [ ] Screenshots included for UI changes
- [ ] OpenSpec tasks marked complete `[x]`

## Agents & AI Assistance

**Location:** `.agents/` and OpenSpec instructions

### Agent Configuration

- **`.agents/policies/guardrails.md`** - Development guardrails and constraints
- **`.agents/policies/release-checklist.md`** - Pre-release validation steps
- **`AGENTS.md`** - Main OpenSpec + project agent instructions (single source of truth at the repo root)
- **`CLAUDE.md`** → **`AGENTS.md`** (symlink)
- **`GEMINI.md`** → **`AGENTS.md`** (symlink)

### Agent Workflow

AI agents should:

1. Read `AGENTS.md` for OpenSpec workflow + project conventions
2. Read `openspec/project.md` for project context
3. Read `openspec/contributing.md` for contribution guidelines
4. Use OpenSpec commands to understand existing work
5. Follow OpenSpec branch naming (`feature/site(spec#)-...`) for spec work; conventional naming for other changes
6. Update agent context docs with a summary of branch changes
7. Create proposals for new features/breaking changes
8. Track tasks with TODO lists
9. Archive changes after deployment

## Additional Documentation

- **`docs/SITE_AUDIT.md`** - Site structure and content audit
- **`public/assets/logos/README.md`** - Logo file reference and variants
- **`scripts/icons/README.md`** - Icon generation guide
- **`scripts/icons/VERIFICATION.md`** - Icon verification checklist

## License

Private repository - All rights reserved.

## Support

For issues or questions:

- Open an issue on GitHub
- Review existing OpenSpec changes and specs
- Check `.agents/policies/` for guardrails and checklists
