#!/usr/bin/env sh
# USMR 14.85 (site-dfn): rebuild the tgrep index (.tgrep/, gitignored) after a
# checkout, merge, or rebase so `rtk tgrep` never searches a stale snapshot.
# The husky post-checkout, post-merge, and post-rewrite hooks call this.
#
# It returns at once and never fails the git command that ran it: the index
# builds in the background, and a missing tgrep or SKIP_TGREP_INDEX=1 makes
# it a no-op. A request that arrives while a build runs asks that build to
# run once more (a rebase fires post-checkout, then post-rewrite), so the
# last change is always indexed. A lock older than ten minutes is treated
# as stale (a killed build).

[ "${SKIP_TGREP_INDEX:-0}" = "1" ] && exit 0
command -v tgrep >/dev/null 2>&1 || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
# Per-worktree path inside the git dir, so worktrees never share a lock.
lock=$(git rev-parse --git-path tgrep-refresh.lock 2>/dev/null) || exit 0

if ! mkdir "$lock" 2>/dev/null; then
  started=$(cat "$lock/started" 2>/dev/null)
  case "$started" in *[!0-9]*) started=0 ;; esac
  # An empty started file means the lock was created a moment ago.
  if [ -z "$started" ] || [ $(($(date +%s) - started)) -lt 600 ]; then
    touch "$lock/again" 2>/dev/null && exit 0
    # The build released the lock in between: start a new one.
    mkdir "$lock" 2>/dev/null || exit 0
  else
    rm -rf "$lock"
    mkdir "$lock" 2>/dev/null || exit 0
  fi
fi
date +%s >"$lock/started"

(
  while :; do
    rm -f "$lock/again"
    tgrep index . >/dev/null 2>&1
    # Release by rename: a rerun request either lands before the rename and
    # is seen below, or fails to land and its caller starts its own build.
    done_dir="$lock.done.$$"
    mv "$lock" "$done_dir" 2>/dev/null || break
    if [ -e "$done_dir/again" ] && mkdir "$lock" 2>/dev/null; then
      date +%s >"$lock/started"
      rm -rf "$done_dir"
      continue
    fi
    rm -rf "$done_dir"
    break
  done
) </dev/null >/dev/null 2>&1 &
exit 0
