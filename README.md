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

The four `@astrojs/*` integrations declared in `package.json` (versions accurate as of `package.json` lines 80-83):

- **[@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/)** 5.0.4 - MDX content rendering for `src/content/pages/*.mdx` content collections + `/writing/[slug]` long-form posts
- **[@astrojs/react](https://docs.astro.build/en/guides/integrations-guide/react/)** 5.0.4 - React island runtime for interactive components (`TrustChainIsland`, `TweaksPanel`); USMR Phase 5.x added the integration
- **[@astrojs/rss](https://docs.astro.build/en/guides/integrations-guide/rss/)** 4.0.18 - RSS 2.0 feed generation for `/writing/feed.xml` (auto-discovery wiring landed in pt197)
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** 3.7.2 - Automatic `sitemap-index.xml` generation
  - Filters out `/_drafts/` pages AND every route in the `NOINDEX_ROUTES` allow-list (`astro.config.ts` per pt146)
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

**File:** `astro.config.ts`

The config is the canonical TypeScript form (the legacy `astro.config.mjs`
form was migrated to `.ts` in early USMR Phase 5.x; the `.ts` extension
lets the config import the typed `BUILD` paths from `build.config.ts`).
For the live source see [`astro.config.ts`](./astro.config.ts) directly —
the snippet below is a representative excerpt:

```typescript
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { BUILD } from "./build.config.ts";

export default defineConfig({
  site: "https://artagon.com", // canonical domain (matches CNAME)
  output: "static",
  trailingSlash: "never",
  outDir: BUILD.dist,
  cacheDir: BUILD.cache.astro,
  integrations: [mdx(), react(), sitemap({ filter: /* noindex routes */ })],
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
npx -y @lhci/cli@0.15.x autorun --config=lighthouserc.json
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

- `Header.astro` - Main navigation (six-link `NAV_LINKS` per pt87 canonical: Platform · Bridge · Use cases · Standards · Roadmap · Blog). The original header theme toggle was removed in pt87 and the standalone `ThemeToggle.astro` was deleted as orphan in pt166; theme switching is now exercised via the dev-only `Tweaks` panel.
- `Footer.astro` - Site footer (4-column flat grid: Platform / Developers / Company / Legal × 5 links each per pt5.5.3 canonical)
- `SeoTags.astro` - Meta tags, Open Graph, Twitter Card, JSON-LD `Organization` + `WebSite` schema, robots prop, canonical URLs
- `FaqSearch.astro` - Client-side FAQ search (renders inside `/faq` route alongside `FaqItem.astro` per-entry markup)
- `RoadmapTimeline.astro` - Roadmap horizontal-timeline cards (consumes the `src/data/roadmap.ts` typed registry)

### Structured Data

**Location:** `src/data/`

TypeScript files exporting structured content. Each module ships an explicit `export type` for the row shape and a `readonly` array constant. The shapes shown below are the live shapes — they may evolve, and the canonical source of truth is the `.ts` file itself.

**`faq.ts`** - FAQ entries (consumed by `/faq` route + `FaqItem.astro` per-entry markup):

```typescript
export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string; // Markdown rendered via the Astro Markdown pipeline
};

export const FAQ_CATEGORIES = [
  "Platform Overview",
  "Authentication & Identity",
  // ...
] as const;

export const FAQS: FaqItem[] = [
  {
    id: "what-is-artagon",
    category: "Platform Overview",
    question: "...",
    answer: "...",
  },
];
```

**`roadmap.ts`** - Product roadmap horizontal-timeline registry (consumed by `RoadmapTimeline.astro` at `/roadmap` per the pt5.7 5-tuple shape that replaced the earlier 5.1c stub):

```typescript
export type RoadmapStatus = "shipping" | "in-build" | "design" | "planned";

export interface RoadmapPhase {
  id: "v1" | "v2" | "v3" | "v4" | "v5"; // anchor id for /roadmap#v3 deep links
  version: "V1" | "V2" | "V3" | "V4" | "V5"; // mono prefix in the card header
  // ... time band, scope items, ...
}
```

## Build & Deployment

### Production Build

```bash
npm run build
```

**Build Process:**

1. **Prebuild:** `npm run sync:build-config` regenerates `lighthouserc.json` and `lychee.toml` from `build.config.json`.
2. Astro compiles pages, components, and assets to `.build/dist/`.
3. Sitemap generated at `.build/dist/sitemap-index.xml` (filtered to indexable routes per the `NOINDEX_ROUTES` allow-list in `astro.config.ts`).
4. **Postbuild:** the 10-step chain runs (per `package.json` `postbuild` script — see "Build Scripts" subsection below for the full ordered list). Highlights: SRI hashes (`sri.mjs`), CSP meta-tag injection (`csp.mjs`), skip-link gate, taglines gate, design.md format gate, font-self-hosting gate, etc.

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
build job:
  1. Checkout code (actions/checkout, SHA-pinned per pt? CODEOWNERS rule)
  2. Setup Node.js 22 (actions/setup-node)
  3. Install deps with `npm ci` (frozen lockfile — NOT `npm install`)
  4. `npm run build` (runs prebuild → astro build → postbuild chain)
  5. Upload `.build/dist/` Pages artifact

deploy job: 6. Deploy to GitHub Pages (actions/deploy-pages)
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

Generates strict CSP as `<meta>` tag with the 9 directives constructed by `buildPolicy()` in `scripts/csp.mjs`:

- `default-src 'self'` - Only same-origin resources
- `script-src 'self' 'sha256-...'` - Inline scripts hashed; orphan-hash detection in `csp.mjs` fails the build if any emitted hash is not present in the final `script-src` directive
- `style-src 'self' 'unsafe-inline'` - Styles allowed (Astro scoped styles)
- `img-src 'self' data:` - Images from same origin + data URIs
- `font-src 'self'` - Fonts from same origin only (no third-party CDNs); the `verify-font-self-hosting.mjs` postbuild gate fails the build if any `dist/**/*.{html,css}` references `fonts.googleapis.com` or similar
- `connect-src 'self'` - XHR / fetch / WebSocket targets locked to same origin
- `object-src 'none'` - No plugins
- `base-uri 'none'` - Prevent base tag injection
- `frame-ancestors 'none'` - Prevent clickjacking

All inline `<script>` tags are hashed and added to `script-src` automatically. DocSearch / Algolia origins are added as `extras` only when DocSearch is enabled.

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

#### Composite App Icons

```bash
./scripts/compose-app-icons.sh source.(svg|png) [out-dir]
```

Generates PWA, iOS (`AppIcon.appiconset`), and Android (`mipmap-*`) app icon sets from a single source image.

#### Quick OG Image

```bash
./scripts/make-og-image.sh "Title text" [out.png]
```

Quick OG image renderer (1200×630, ImageMagick). Distinct from `make-og-from-template.sh` (full SVG-template + logo overlay path).

#### Optimize SVG

```bash
./scripts/optimize-svg.sh input.svg [output.svg]
```

`svgo`-based SVG optimizer (multipass mode). Used before committing new logos / illustrations.

### Build Scripts

The postbuild pipeline (per `package.json` `postbuild` script) runs the following steps in order after `astro build`:

1. `verify:prerequisites` — `scripts/verify-prerequisites.mjs`
   asserts the `refactor-styling-architecture` change is archived
   (or its merge SHA is an ancestor of HEAD) before USMR work
   can land.
2. `verify:design-prerequisites` — `scripts/verify-design-prerequisites.mjs`
   asserts `adopt-design-md-format` archive ordering before
   design-md-format-dependent work can land.
3. `lint:tokens` — `scripts/lint-tokens.mjs` walks `git ls-files`
   for raw color literals outside DESIGN.md frontmatter; fails
   on hex/rgb/hsl/oklch literals not declared as tokens.
4. `verify-font-self-hosting.mjs` — `scripts/verify-font-self-hosting.mjs`
   asserts no third-party font CDN refs leak into `.build/dist/`
   (locks `font-src 'self'`).
5. `sri.mjs` — Scans `.build/dist/*.html`, computes SHA-256 for
   local JS/CSS, adds `integrity` + `crossorigin` attributes,
   writes `.build/dist/sri-manifest.json`.
6. `csp.mjs` — Extracts inline script SHA-256 hashes, builds
   `script-src` directive, injects
   `<meta http-equiv="Content-Security-Policy">` into every
   `.build/dist/*.html`. Includes orphan-hash detection
   (every emitted hash MUST be present in script-src).
7. `lint:skip-link` — `scripts/lint-skip-link.mjs` asserts every
   built page in `.build/dist/` has a skip-link as the first
   focusable element with a valid `href="#<id>"` target.
8. `lint:taglines` — `scripts/lint-taglines.mjs` enforces single
   source for tagline strings via `src/content/taglines.json`.
9. `lint:design` — `design.md lint DESIGN.md` per
   `@google/design.md@0.1.1`.
10. `lint:design-md-uniqueness` — `scripts/verify-design-md-uniqueness.mjs`
    guards against duplicate token names in DESIGN.md
    frontmatter.

The chain is **lock-aware**: `clean.mjs` uses `.build/.run.lock`
to coordinate cleanup across parallel runs (exit code 73 if the
lock is held by another process).

Other build-related scripts not in the postbuild chain:

- `scripts/sync-build-config.mjs` — regenerates JSON/YAML/TOML
  configs (`lighthouserc.json`, `lychee.toml`) from
  `build.config.json` SSoT (run via `prebuild` before
  `astro build`).
- `scripts/lhci-serve.mjs` — Lighthouse CI local server with
  `READY` signal (consumed by `lighthouserc.json`).
- `scripts/check-design-drift.mjs` — design.md drift detection
  (run by `design-md-drift.yml` weekly cron).
- `scripts/check-oklch-hex-parity.mjs` + `scripts/oklch-to-hex.mjs`
  — design.md OKLCH↔hex hybrid policy gates (precondition of
  `lint:design`).
- `scripts/verify-design-md-telemetry.mjs` — telemetry verification
  for design.md adoption metrics.

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

#### Playwright Tests (`playwright.yml`)

**Trigger:** Push to `main` or `feature/*`, pull request to `main`, manual dispatch

**Process:** Runs the Playwright cross-engine test matrix (5 shards × all projects) plus dedicated visual-regression and accessibility jobs (chromium / webkit / Mobile Safari). Uploads per-shard reports as artifacts (14-day retention). See `AGENTS.md` §"Testing" for the full project matrix and shard-distribution contract.

#### Design.md Lint (`design-md-lint.yml`)

**Trigger:** Push to `main` or `feature/*`, pull request to `main`, manual dispatch

**Process:** Runs the design.md linter (`design.md lint DESIGN.md` per `@google/design.md@0.1.1`) plus the project's ast-grep token-citation gates. Fails the build on token drift, retired-alias use, or design.md format violations.

#### Design.md PR Diff (`design-md-pr-diff.yml`)

**Trigger:** Pull request to `main` modifying `DESIGN.md`

**Process:** Posts a PR-scoped comment showing the design.md diff (added/removed/changed tokens, components, color contracts) so reviewers can see visual-identity changes inline.

#### Design.md Drift Monitor (`design-md-drift.yml`)

**Trigger:** Weekly cron (Mondays 06:00 LA time) or manual dispatch

**Process:** Refreshes `openspec/.cache/design-md-spec.md` from `npx @google/design.md spec --format markdown`. Catches upstream spec changes that would invalidate our pinned `@google/design.md@0.1.1` adoption.

#### PR Spec Compliance (`pr-spec-compliance.yml`)

**Trigger:** Pull request

**Process:** Validates every PR references a parent spec issue (label `spec`) AND aligns implementation with the OpenSpec change's acceptance criteria. Tags scope-creep PRs with `needs-spec` / `scope-creep` labels per `.github/labels.yml`.

#### Spec Review Reminder (`spec-review-reminder.yml`)

**Trigger:** GitHub issue labeled `spec` or closed

**Process:** Drives the OpenSpec review cadence — pings reviewers when a spec is opened, closes the loop when a spec is implemented or rejected.

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

Living guides (current state authoritative):

- **`docs/AUTOMATED_TESTING.md`** - Playwright + vitest + node:test runners, project matrix, gating contract; pre-Phase-1 sections retired in pt233/pt235 in favor of pointer-to-`tests/README.md`.
- **`docs/CONTRIBUTING.md`** - OpenSpec workflow + spec/proposal/implementation cadence; complements the canonical `openspec/contributing.md`.
- **`docs/build-artifacts.md`** - SSoT contract for `.build/{cache,reports,dist}/`, generated-file inventory, "add a tool" contributor checklist; governed by `openspec/specs/build-config/spec.md`.
- **`docs/design-md.md`** - design.md authoring guide (token-add procedure, OKLCH↔hex hybrid, upstream version-bump runbook).
- **`docs/decisions/0001-no-tailwind.md`** - Architecture-decision record on the no-Tailwind contract.
- **`docs/guides/styling-guide.md`** - Component-vs-utility decision tree, theme-variable reference, post-archive distilled record from `refactor-styling-architecture`.
- **`docs/guides/new-design-conversion.md`** - Conversion guide from `new-design/extracted/` mocks to live Astro routes; consumed by USMR Phase 5.x work.

Asset / icon references:

- **`public/assets/logos/README.md`** - Logo file reference and variants.
- **`scripts/icons/README.md`** - Icon generation guide.
- **`scripts/icons/VERIFICATION.md`** - Icon verification checklist.

Historical snapshots (read-only):

- **`docs/SITE_AUDIT.md`** - Phase-1-era audit dated 2026-05-04 (marked HISTORICAL SNAPSHOT in pt236; the system has evolved substantially since — see the marker for major drifts).

## License

Private repository - All rights reserved.

## Support

For issues or questions:

- Open an issue on GitHub
- Review existing OpenSpec changes and specs
- Check `.agents/policies/` for guardrails and checklists
