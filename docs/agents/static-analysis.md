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
`.github/workflows/actionlint.yml` runs actionlint 1.7.12 with ShellCheck on pull requests and pushes to `main` that change `.github/workflows/**`.

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

The 2026-10-20 review found gaps under epic `site-2m1`. Repairs
were checked with the installed, pinned ast-grep 0.42.1 using unsafe
positives and safe negatives; the earlier review used 0.50. Remaining limits:

- `no-console-log-sensitive` checks every direct argument to `console.log`,
  including single arguments and sensitive expressions after a label
  (`site-2m1.68`). It does not resolve aliases or perform dataflow analysis;
  static string/template labels are excluded; template substitutions are checked.
  Other console methods, including `console.error` and `console.warn`, are not
  covered (`site-2m1.68`).
- `no-inner-html` covers dot and literal computed properties with plain or
  compound assignment. `no-weak-hash` covers case-insensitive weak algorithm
  string literals and trailing options; `no-jwt-decode-unverified` covers
  trailing decode options (`site-2m1.69`). Dynamic property/algorithm names
  and aliased APIs remain outside these syntax-based checks.
  Backtick literals in computed keys (``el[`innerHTML`] = x``) and algorithm
  arguments (``crypto.createHash(`md5`)``) are also missed (`site-2m1.69`).
- `no-set-html-directive` is documentation only. Enforcement lives in
  `tests/lint-set-html-safejsonld.test.mts`: direct sanitizer results and
  conditionals whose output branches are sanitized or null are accepted;
  concatenation, comma expressions, and raw branches are rejected
  (`site-2m1.66`). The scanner remains conservative and file-local; it is
  not an Astro parser or a general taint analyzer.
- `no-raw-color-style-object-ts` and `no-raw-color-style-object-tsx` check
  literal hex and color-function values under CSS property keys in object
  pairs, including React `style={{...}}` (`site-2m1.48`, rule portion).
  They do not resolve dynamic styles, aliases, or named CSS colors. Hyphenated
  keys other than `*-color` and `border-*`, including `"box-shadow"`,
  `"text-shadow"`, and `"background-image"`, and the `filter` value
  `"drop-shadow(... #fff)"` are not matched (`site-2m1.48`). A live alias
  example is `ACCENT_SWATCH` in `src/scripts/tweaks-state.ts`, consumed through
  `style={{ background: ACCENT_SWATCH[a] }}` in `src/components/TweaksPanel.tsx`;
  the referenced literal swatches are outside these checks (`site-2m1.48`).
  The coverage-gate test side of `site-2m1.48` is tracked separately.
- `no-hardcoded-secrets` covers specific assignment and token formats, not every secret shape.
