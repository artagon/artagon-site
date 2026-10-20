# Static analysis with ast-grep

ast-grep is the project linter; there is no ESLint. The run commands and the "Rules in force" table are in `AGENTS.md`. `tests/lint-sg-rules-doc-sync.test.mts` keeps that table 1:1 with `rules/security/*.yml`.

## Commands

```bash
npm run lint:sg       # scan; non-zero exit on any error-severity finding
npm run lint:sg:fix   # scan and apply available fixes
npm run lint:sg:ci    # CI mode; promotes findings with --error
./node_modules/.bin/sg scan   # direct binary; avoids the npm WouldBlock bug on macOS
```

CI runs `npm run lint:sg:ci` in `.github/workflows/design-md-lint.yml`.

## Configuration

- `sgconfig.yml` at the repo root sets the rule directory (`rules/`) and `languageGlobs`. No rule-test corpus is configured yet.
- `.astro` and `.html` parse as `html`. Only the template is covered; Astro frontmatter (`---` blocks) is invisible to every rule, so keep security-relevant logic in `src/lib/*.ts`.
- `.ts`, `.mts`, `.mjs`, `.js`, and `.cts` parse as `typescript`; `.tsx` and `.jsx` as `tsx`.
- `rules/security/` holds every project rule as one YAML file per rule.

## When to run

- Before committing any `.ts`, `.mjs`, `.js`, or `.astro` change.
- After writing new code. Fix every error-severity finding before calling the task done.
- Never suppress a finding without explicit approval. Add a new security pattern as a YAML rule in `rules/security/`, then add its row to the `AGENTS.md` table in the same change.

## Writing a rule

```yaml
id: my-rule-id # kebab-case, unique, `no-` prefix for security rules
language: typescript # typescript | tsx | html | css | yaml
severity: error # error | warning | info
message: "Description with $META_VAR interpolation"
files:
  - "src/**/*.ts"
ignores:
  - "**/*.test.ts"
rule:
  pattern: dangerousCall($ARG)
```

Before trusting a rule:

1. Inspect the target AST with `dump_syntax_tree` (ast-grep MCP) or `ast-grep run --debug-query`.
2. Prove a known positive and a safe negative with `test_match_code_rule` or `ast-grep scan --rule <file> --stdin`.
3. Re-check with the engine version pinned in `package.json`. The global CLI can be newer and match differently.

## Known coverage gaps

The 2026-10-20 review tested each rule against synthetic positives (beads under epic `site-2m1`):

- `no-console-log-sensitive` misses `console.log(token)` and `console.log('label', secret)` (`site-2m1.68`).
- `no-inner-html` misses `el['innerHTML'] = x` and `el.innerHTML += x`. `no-weak-hash` misses `createHash('MD5')` and `createHash('md5', {})`. `no-jwt-decode-unverified` misses `jwt.decode(token, { complete: true })` (`site-2m1.69`).
- `no-set-html-directive` is documentation only. Enforcement lives in `tests/lint-set-html-safejsonld.test.mts`, which accepts unsafe concatenation or ternaries after a `safeJsonLd` call (`site-2m1.66`).
- `no-hardcoded-secrets` covers specific assignment and token formats, not every secret shape.

These gaps were reproduced on ast-grep 0.50; the pinned engine was not available during the review.
