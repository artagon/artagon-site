## ADDED Requirements

### Requirement: Icon checksum verification reports use the configured report directory

build.config.json SHALL define reports.iconChecksums as .build/reports/icon-checksums. build.config.ts SHALL expose it as BUILD.reports.iconChecksums and require/validate the leaf with the existing typed path validation. The icon generator SHALL obtain this destination from that source of truth rather than deriving it from its public-image OUT directory or duplicating the path in the generator.

Checksum report files SHALL remain verification outputs, excluded from the clean deployed public tree. Generated icon/image files SHALL retain their existing output contract. Both existing SHA-256 encodings, hexadecimal and base64, SHALL remain available and verifiable from the source image bytes. Missing or invalid configuration and digest failures SHALL fail the operation without falling back to a public checksum directory.

#### Scenario: Checksums are generated outside public assets
- **GIVEN** valid icon outputs and the required BUILD report leaf
- **WHEN** checksum generation completes
- **THEN** the hex and base64 report for each selected PNG, SVG or ICO is written under BUILD.reports.iconChecksums, matches that file's bytes, and no checksum report is emitted into public/icons/checksums.

#### Scenario: Image output overrides do not relocate reports into public output
- **GIVEN** a supported override of the generator's image OUT directory
- **WHEN** the generator produces verification digests
- **THEN** image output follows its existing override contract while checksum reports still use the configured report destination.

#### Scenario: Missing or unsafe report configuration fails closed
- **GIVEN** reports.iconChecksums is absent, non-string or rejected by the path validator
- **WHEN** the generator resolves its report destination
- **THEN** it exits unsuccessfully before creating report files and does not substitute a public-path default.

#### Scenario: Generated configuration follows the new source hash
- **GIVEN** the report leaf has been added to build.config.json
- **WHEN** the sync generator and its check-only drift gate run
- **THEN** typed/config tests accept the required leaf and the committed generated configuration matches the new source hash.

#### Scenario: Clean deployment excludes retired verification URLs
- **GIVEN** tracked public checksum reports have been removed with the documented tooling-path migration
- **WHEN** the site is built from a clean checkout
- **THEN** no old checksum report is included in the deployment payload and the contracted public image files remain.

