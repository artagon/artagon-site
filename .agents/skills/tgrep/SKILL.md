---
name: tgrep
description: >-
  Indexed regex search in artagon-site with `rtk tgrep`. Use for repeated regex
  sweeps over a tree that has not changed since the last index build: audits,
  rename boundary checks, many patterns in a row. Covers checking that the index
  is fresh, the husky hooks that rebuild it, searching from the repo root, how
  its defaults differ from rtk rg, and the commands that prompt.
---

# tgrep in artagon-site

tgrep (1.0.8 here) answers from a trigram index in `.tgrep/` at the checkout root, which git ignores, so repeated queries are fast. The index is a snapshot: edits made after the last build are invisible to it.

## When to use it

- Several regex sweeps in a row over a tree you have not changed.
- The text lane of a boundary audit, on a fresh index.

Use `rtk rg` instead for files you edited this session, for one-off searches, and whenever the index is stale or missing.

## Check the index first

```bash
rtk tgrep status .  # file count, "Updated" age, server state
rtk tgrep index .  # rebuild after a large edit
rtk tgrep index --force .  # full rebuild
```

- The husky post-checkout (branch checkouts only), post-merge, and post-rewrite hooks run `scripts/tgrep-refresh.sh`. It rebuilds the index in the background and returns at once; `SKIP_TGREP_INDEX=1` turns it off.
- Global `ignore-scripts` stops `npm ci` from installing the hooks in a new worktree. Run `npx husky` once in that worktree (it sets `core.hooksPath` for that checkout), or rebuild by hand.
- If "Updated" is older than your last checkout, pull, or large edit, rebuild before you trust a result.

## Search

```bash
rtk tgrep -n '<regex>' .  # always search from the root
rtk tgrep -n -g 'src/**' 'safeJsonLd' .  # narrow with a glob, not a subdirectory
rtk tgrep -l -F 'var(--accent)' .  # literal text
rtk tgrep -n --hidden 'prefix_rule' .  # include dot directories
rtk tgrep -c -i '<regex>' .  # case-insensitive count per file
rtk tgrep --stats -l '<regex>' .  # print the query plan and timing
```

- tgrep looks for the index under the path you search. `rtk tgrep 'x' src` looks for `.tgrep/` inside `src`, finds none, warns, and scans every file. Search `.` and narrow with `-g`.
- Most flags match ripgrep: `-F`, `-w`, `-l`, `-c`, `-g`, `-t`, `-A`/`-B`/`-C`, `-U`, `--json`. `-z` is not supported.

## Defaults that differ from `rtk rg`

tgrep reads no config file. It is case-sensitive, and it skips hidden files and directories unless you pass `-i` or `-S` and `--hidden`. `rtk rg` can pick up a ripgrep config that turns on smart case and hidden files (this machine has one). Before you compare the two lanes, give both the same flags.

## Commands that prompt

```bash
rtk tgrep serve .  # asks first: a long-running file watcher
rtk tgrep --index-path <dir> '<regex>' .  # asks first: an index outside the repo
```

## Evidence

- A result from a stale index is `PARTIAL`. When a tgrep result is evidence, state the index age from `rtk tgrep status .`.
- tgrep is one text lane. "Unused" or "dead" also needs ast-grep or Serena.
