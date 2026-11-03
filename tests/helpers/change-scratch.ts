// LAYOUT-13: only co-located OpenSpec change scratch is local session data.
const CHANGE_SCRATCH_PATH =
  /(^|\/)openspec\/changes\/(archive\/)?[^/]+\/scratch(\/|$)/;

/** Match an OpenSpec change-scratch path relative to the repository root. */
export function isChangeScratch(repoRelativePath: string): boolean {
  return CHANGE_SCRATCH_PATH.test(repoRelativePath.replaceAll("\\", "/"));
}
