---
name: ripgrep
description: >-
  Live text search in artagon-site with `rtk rg`, the only form of ripgrep
  allowed here. Use for one-off searches, files edited this session, config,
  prose, Astro frontmatter, MDX, CSS custom properties and class strings, and
  for listing files instead of find. Covers what replaces each blocked search
  command, the flags that prompt, exit codes, and the machine-dependent
  defaults that change results.
---

# ripgrep (`rtk rg`) in artagon-site

`rtk rg` reads the files on disk now, so it is the ground truth for text. Bare `rg`, `grep`, `egrep`, `fgrep`, `find`, `git grep`, `rtk grep`, and Claude Code's Grep tool are blocked in this repo (USMR 14.85). `docs/agents/code-intelligence.md` has the full routing.

## When to use it

- One-off searches, and every file you edited this session (the tgrep index has not seen it).
- Anything that is not TypeScript structure: config, Markdown, `.astro` frontmatter, `.mdx`, CSS, workflow YAML.
- The text lane of an "unused", "no callers", or "safe to rename" claim.

Pick another tool when the question is about structure: ast-grep for code shape, ripwire for callers in `.ts`, and tgrep for many sweeps over an unchanged tree.

## Commands

```bash
rtk rg -n '<regex>' <path>
rtk rg -n -F 'var(--accent)' src public  # literal text, no regex escaping
rtk rg -n -e '--nd-bg' public/assets/theme.css  # a pattern that starts with a dash
rtk rg -n -w 'Card' src  # whole word
rtk rg -n -g '*.astro' -g '*.mdx' 'safeJsonLd\(' src  # Astro and MDX callers ripwire cannot see
rtk rg -n -t ts -t js 'createHash' src scripts tests  # by type; ts is .ts .mts .cts .tsx, js adds .js .mjs .cjs .jsx
rtk rg -l '<regex>' <path>  # file names only
rtk rg -c '<regex>' <path>  # count per file
rtk rg --files -g '<glob>' <path>  # list files; replaces find
rtk rg -n --max-columns 240 --max-columns-preview '<regex>' <path>  # long or minified lines
rtk rg --no-config -n --hidden -g '!.git/' -s '<regex>' .  # whole-repo evidence that no ripgrep config can change
```

ripgrep 15 has no `astro` type. Use `-g '*.astro'`. The `md` type includes `.mdx`.

## Defaults that change results

- A ripgrep config file (`RIPGREP_CONFIG_PATH`) can add flags. On this machine it adds `--hidden`, `--smart-case`, and exclude globs; CI and other machines may have none or different ones. `--no-config` ignores it, so pass that, plus the flags you need, when the result is evidence.
- Without `--hidden`, rg skips dot directories: `.github/`, `.claude/`, `.agents/`, `.codex/`, `.husky/`, `.beads/`. Name the directory (`rtk rg -n 'x' .github`) or pass `--hidden -g '!.git/'`.
- Under smart case, an all-lowercase pattern matches any case. Pass `-s` when case matters and `-i` when it does not.
- `.gitignore` applies, so `node_modules/`, `.build/`, and `.tgrep/` are skipped. Name one to search it (`rtk rg -n 'x' .build/dist`), or pass `--no-ignore`.
- tgrep reads no config file. Use the same flags in both lanes before you compare their counts.

## Reading results

- Exit `0` means a match, `1` no match, `2` an error. Do not hide stderr, and do not pipe into `grep`, `sed`, `awk`, or `head`: a pipe also hides the exit code. Use `-m`, `-l`, `-c`, or a narrower path instead.
- rtk condenses long output and can fold matches (`+N hidden`). Narrow the search instead of widening it. When you need the exact bytes, rerun once as `rtk proxy rg …` (it prompts) and say why. `--json` gives machine-readable output.

## Flags that prompt

`--pre` and `--hostname-bin` run a program, and `-z` / `--search-zip` starts decompressors. Claude Code asks before each one (`.claude/settings.json`), so use them only for a reason the user accepts. The `-z` prompt fires only when `-z` is written on its own: never fold it into a cluster such as `-nz`.

```bash
rtk rg --pre ./decode.sh '<regex>' <path>  # asks first
rtk rg -z '<regex>' <path>  # asks first
```

## Blocked commands

| Blocked                                                 | Use instead                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `grep -rn`, `egrep`, `fgrep`, bare `rg`, the Grep tool  | `rtk rg -n '<regex>' <path>`                                                              |
| `find . -name '<glob>'`                                 | `rtk rg --files -g '<glob>' <path>`                                                       |
| `git grep`, `rtk git grep`, `rtk grep`                  | `rtk rg -n '<regex>'`; for tracked files only, `rtk git ls-files`, then `rtk rg` on those |
| A text search for callers of a `.ts` symbol, used alone | The ripwire skill, plus `rtk rg` over `.astro` and `.mdx`                                 |

## Evidence

- `rtk rg` is one lane. "Unused" or "dead" also needs ast-grep or Serena. Search code, config, tests, and docs, including `.astro`, `.mdx`, and the dot directories.
- Tag each claim `SUPPORTED`, `PARTIAL`, or `UNAVAILABLE`, and name the tool.
- Never put a secret in a pattern, and do not paste matched lines from files that hold secrets.
