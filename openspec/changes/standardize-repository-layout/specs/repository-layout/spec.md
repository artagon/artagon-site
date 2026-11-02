## ADDED Requirements

### Requirement: Application and discovery ownership

The repository SHALL retain a single Astro application under src/, authored collections under src/content/ with src/content.config.ts as their sibling configuration, stable static assets under public/, repository tools under scripts/, and human documentation under docs/. Root-discovered package, Astro, TypeScript, test, linter, build, deployment and agent entry files SHALL remain at their existing discovery paths during this cleanup. Source imports, content IDs, route URLs and test discovery SHALL remain compatible.

#### Scenario: Existing commands retain discovery
- **GIVEN** a clean checkout after a layout PR
- **WHEN** the documented build, check and three test-runner commands run from the repository root
- **THEN** they discover the existing application/configuration and the same intended test families without requiring a new config flag or relocated test root.

#### Scenario: Page and asset URLs remain stable
- **GIVEN** an existing content entry, route or contracted image
- **WHEN** the site is built after an authoring/document move
- **THEN** its content ID and served URL are unchanged, except for the explicitly retired logo-guide and checksum-report URLs.

### Requirement: OG authoring inputs have a tooling owner

The two OG authoring SVGs SHALL reside at scripts/templates/og/og-template.svg and scripts/templates/og/og-template-image.svg. The documented generator SHALL resolve both inputs from its supported repository-root invocation while preserving template bytes, argument behavior and output defaults. It SHALL select the image template only when both the image template and logo exist as files; otherwise it SHALL retain the text-template fallback. A missing unselected image template SHALL NOT itself cause failure when a valid text fallback is available. An unavailable selected template SHALL cause a nonzero exit before conversion. Future imported diagrams SHALL be documented under src/assets/diagrams/ without creating placeholder files or implementing a renderer.

#### Scenario: Both OG modes find their relocated inputs
- **GIVEN** the two templates have moved, a valid logo is available and the generator's existing prerequisites are installed
- **WHEN** one invocation uses that logo and another supplies an absent logo
- **THEN** the first demonstrably consumes the relocated image template, the second consumes the relocated text template, and both preserve the output argument/defaults.

#### Scenario: Missing image template retains text fallback
- **GIVEN** the image template is absent, the logo and relocated text template exist, and the converter is available
- **WHEN** the generator runs
- **THEN** it succeeds through the text template rather than rejecting the missing unselected image template.

#### Scenario: Missing selected text template fails
- **GIVEN** an absent logo or image template selects fallback and the relocated text template is unavailable
- **WHEN** the generator runs
- **THEN** it exits nonzero before invoking the converter; conversely, a valid image-template/logo pair does not require the unused text template.

### Requirement: Human guides and historical audits stay outside public assets

The HSTS note SHALL reside at docs/guides/cloudflare-hsts.md, the historical site audit at docs/archive/2025-11-12-site-audit.md, and the logo guide at docs/guides/logo-assets.md. The migration SHALL preserve their substantive content, the audit's historical date/findings, and the logo guide's 15-PNG contract. Current references SHALL follow the new paths. The active branding change's named path contract SHALL be amended before the logo guide moves.

#### Scenario: Readers follow relocated documentation
- **GIVEN** the documentation moves are complete
- **WHEN** readers follow the README, project guide, glossary and live task citations
- **THEN** they reach the retained documents at their new locations and the historical audit remains identified as a historical snapshot.

#### Scenario: Logo documentation leaves the public payload
- **GIVEN** the branding contract amendment and migration notice are present
- **WHEN** a clean site build completes
- **THEN** the old public logo README is absent, its replacement guide is available in source documentation, and all 15 contracted PNG outputs remain available at their existing image URLs.

### Requirement: Local scratch and cache are not tracked source

session.txt and .lycheecache SHALL NOT be tracked. The repository SHALL ignore /session.txt and the existing Lychee cache path. This cleanup SHALL NOT relocate Lychee's runtime cache or remove tracked generated configuration, lockfiles, the design-spec mirror, screenshot baselines, or evaluation evidence.

#### Scenario: Recreated local artifacts do not dirty source
- **GIVEN** the scratch/cache cleanup has landed
- **WHEN** the local session file or Lychee cache is recreated
- **THEN** ignore rules cover it and neither file appears as tracked source.

### Requirement: Dependency declarations match direct tooling imports

Direct YAML imports in the repository's tests SHALL be backed by a declared development dependency. Removing the obsolete direct Sharp pin and inactive rimraf/glob overrides SHALL preserve clean-install test execution and Astro's image-processing service. Future tools that directly import Sharp SHALL declare their own compatible dependency rather than relying on this removed root pin.

#### Scenario: Clean install preserves test and image behavior
- **GIVEN** the approved dependency cleanup and regenerated lockfile
- **WHEN** a clean installation runs the YAML-consuming tests and an actual Astro image transformation
- **THEN** direct imports resolve and the image transformation succeeds through Astro's compatible dependency.

### Requirement: Hero workflow identifies the editorial source

The hero-edit workflow and its manifest entry SHALL identify src/content/pages/home.mdx as the editorial hero source and distinguish that content from the rendering/template responsibility of src/pages/index.astro.

#### Scenario: An editor follows the hero workflow
- **GIVEN** an editorial hero-copy change
- **WHEN** the workflow or manifest is consulted
- **THEN** it directs the edit to the content consumed by the home page rather than instructing the editor to replace the page template.

### Requirement: Favicon helper consumes existing size inputs

The documented favicon helper SHALL consume public/icons/icon-16.png, public/icons/icon-32.png and public/icons/icon-48.png and produce a valid multiresolution ICO. Its optional first argument SHALL remain an existing output directory, defaulting to public; the destination SHALL be favicon.ico inside that directory. It SHALL NOT reinterpret the argument as a file path or add automatic directory creation in this cleanup. A missing prerequisite/input or unusable output directory SHALL cause a nonzero failure.

#### Scenario: Explicit output directory receives the ICO
- **GIVEN** public/icons/icon-16.png, icon-32.png and icon-48.png and the documented conversion tool
- **WHEN** the helper is invoked with an existing custom output directory as argument 1
- **THEN** favicon.ico inside that directory is a valid ICO containing the three intended dimensions and the argument is not treated as an output filename.

#### Scenario: Default favicon destination stays compatible
- **GIVEN** the three source PNGs, conversion tool and existing public directory
- **WHEN** the helper is invoked with no arguments
- **THEN** public/favicon.ico is a valid ICO containing the 16, 32 and 48 pixel images.

### Requirement: Static server examples return real not-found responses

The retained Caddy and nginx examples SHALL serve known generated routes/assets successfully and return HTTP 404 with the site's intended error document for an unknown path. Their deployment instructions SHALL distinguish the repository's configured build output from the external server document root.

#### Scenario: A missing static route is not a successful homepage
- **GIVEN** either documented server example serving a copied build
- **WHEN** a client requests a known route, a known asset and a nonexistent route
- **THEN** the known resources succeed and the nonexistent route returns status 404 with the error document, not a status-200 homepage fallback.

### Requirement: Moves update current references atomically

Each layout move SHALL update its enumerated code, configuration, tests, docs and active-change references in the same PR. Historical quotations SHALL remain identifiable as historical evidence. The move SHALL NOT rename unrelated npm scripts, test globs, workflow jobs, public image URLs or tool-discovery paths.

#### Scenario: A move passes its complete reference map
- **GIVEN** a proposed move and the reference map in the change design
- **WHEN** the candidate is reviewed and validated
- **THEN** all current references resolve, retained historical references are labeled appropriately, and the affected command or reader is exercised at the target path.

