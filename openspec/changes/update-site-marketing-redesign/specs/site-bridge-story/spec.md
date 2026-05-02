## ADDED Requirements

### Requirement: Canonical Bridge Sentence

`src/content/pages/platform.mdx` frontmatter MUST declare `bridge.sentence` (the canonical one-line statement of how Artagon bridges machine and human identity) and `bridge.variants` (an allow-list of approved paraphrases). The canonical sentence MUST appear exactly once in the rendered `/platform` HTML and MUST NOT appear verbatim on any other route.

#### Scenario: Canonical sentence appears once on /platform

- **WHEN** `/platform` is rendered and parsed
- **THEN** the canonical sentence appears exactly once in the visible body.

#### Scenario: Verbatim copy elsewhere caught by lint

- **WHEN** a contributor copies the canonical sentence into `home.mdx`
- **THEN** `scripts/lint-bridge.mjs` exits non-zero citing the duplicate.

#### Scenario: Approved variant passes

- **WHEN** an editor uses one of the strings listed in `bridge.variants[]` on the home route
- **THEN** the lint passes (variants are whitelisted paraphrases).

### Requirement: Bridge Flow SVG

`BridgeFlow.astro` SHALL render the bridge concept as an inline SVG with `role="img"`, accessible `<title>`, and `<desc>`. The diagram MUST NOT convey state by color alone; semantic markers (labels, shapes) MUST also distinguish the machine and human halves. The diagram MUST render correctly under `forced-colors: active`.

#### Scenario: Screen reader announces flow

- **WHEN** a screen reader user encounters the bridge diagram
- **THEN** the SR announces the `<title>` followed by the `<desc>` text describing the flow.

#### Scenario: Forced-colors mode is legible

- **WHEN** the user has `forced-colors: active` enabled
- **THEN** the diagram's lines and labels remain visible against the system canvas color.

### Requirement: Hero CTA on Home

The home hero MUST include a CTA labeled "How the bridge works" linking to `/platform#bridge`. The fragment is the in-document anchor that scrolls users to the bridge section; the redirect-target rule (`/bridge` → `/platform`) deliberately omits the fragment to preserve PageRank signal.

#### Scenario: CTA navigates to anchor

- **WHEN** a user clicks the hero CTA
- **THEN** the browser navigates to `/platform`, scrolls to the `#bridge` section, and focus moves to the section heading.

### Requirement: Legacy /bridge Redirect (no fragment)

The site MUST 301-redirect `/bridge` and case-insensitive variants (`/Bridge`, `/BRIDGE`, `/bridge/`, `/bridge.html`) to `/platform` (no fragment). Google does not pass link equity through anchor fragments in 301 Location headers; in-document scrolling is preserved via the home hero CTA's `href="/platform#bridge"`. Redirect destinations MUST be same-origin (begin with `/`); `scripts/validate-indexation.mjs` MUST fail the build if any destination in `public/_redirects` contains `://` or starts with `//`.

#### Scenario: Redirect status is 301 with bare path

- **WHEN** a Playwright test issues `await fetch('/bridge', { redirect: 'manual' })`
- **THEN** the response status is 301 and the `Location` header is `/platform` (NOT `/platform#bridge`).

#### Scenario: Trailing slash redirects

- **WHEN** a user visits `/bridge/`
- **THEN** the response is 301 to `/platform` (no fragment).

#### Scenario: External redirect destination rejected

- **WHEN** a contributor adds `https://attacker.example/path` as a destination in `public/_redirects`
- **THEN** `scripts/validate-indexation.mjs` exits non-zero rejecting the absolute or protocol-relative target.
