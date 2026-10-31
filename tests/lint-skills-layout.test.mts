// USMR 14.84 (site-y0k) — project skills layout gate.
//
// `.agents/skills/` holds the only real copy of every project skill.
// Codex and Gemini CLI read it directly; Claude Code reads only
// `.claude/skills/`, so that directory holds one relative link per
// skill. The gate rejects the drift this change removed: duplicate
// `.codex/skills/` and `.gemini/skills/` trees, Gemini `/opsx`
// commands (they keep OpenSpec treating Gemini as configured, so
// `openspec update` recreates `.gemini/skills/`), converted
// `source-command-*` copies, and links into repos outside this one.
//
// The forbidden directories are checked against git, not the disk:
// OpenSpec 1.6 still writes Codex copies to `.codex/skills/` on every
// `openspec update`. Codex reads only `.agents/skills/`, so `.gitignore`
// keeps those regenerated copies out of the repo.

import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Owner decisions 2026-10-26: design and UX skills stay in the repo, and
// every mandated search tool has a project skill (USMR 14.86).
const REQUIRED_SKILLS = [
  "design-md",
  "playwright-cli",
  "ripwire",
  "tgrep",
  "ripgrep",
  "ast-grep",
  "ast-grep-mcp",
];

const FORBIDDEN_DIRS: ReadonlyArray<{ dir: string; reason: string }> = [
  { dir: ".codex/skills", reason: "Codex reads .agents/skills" },
  {
    dir: ".gemini/skills",
    reason: "Gemini CLI reads the .agents/skills alias",
  },
  {
    dir: ".gemini/commands",
    reason: "Gemini commands make openspec update recreate .gemini/skills",
  },
  { dir: ".agent/skills", reason: "Antigravity reads .agents/skills" },
  {
    dir: ".github/skills",
    reason: "Copilot reads .claude/skills and .agents/skills",
  },
];

function linksInside(dir: string, label: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${label}/${entry.name}`;
    if (entry.isSymbolicLink()) found.push(path);
    else if (entry.isDirectory()) {
      found.push(...linksInside(join(dir, entry.name), path));
    }
  }
  return found;
}

function git(args: string[]): string {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", env }).trim();
}

function trackedUnder(dir: string): boolean {
  return git(["ls-files", "--", dir]) !== "";
}

function layoutProblems(
  root: string,
  present: (dir: string) => boolean = (dir) => existsSync(join(root, dir)),
): string[] {
  const problems: string[] = [];
  for (const { dir, reason } of FORBIDDEN_DIRS) {
    if (present(dir)) {
      problems.push(`${dir} must not exist; ${reason}`);
    }
  }

  const agentsDir = join(root, ".agents", "skills");
  const skills = new Set<string>();
  for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
    const path = `.agents/skills/${entry.name}`;
    // Hidden entries such as .DS_Store are not skills.
    if (entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("source-command-")) {
      problems.push(`${path} is a converted command copy; delete it`);
    } else if (entry.isSymbolicLink()) {
      problems.push(`${path} must be a real directory, not a link`);
    } else if (entry.isDirectory()) {
      if (existsSync(join(agentsDir, entry.name, "SKILL.md"))) {
        skills.add(entry.name);
      } else {
        problems.push(`${path} has no SKILL.md`);
      }
      for (const link of linksInside(join(agentsDir, entry.name), path)) {
        problems.push(`${link} is a link; .agents/skills holds real files`);
      }
    }
  }

  const claudeDir = join(root, ".claude", "skills");
  const linked = new Set<string>();
  const claudeEntries = existsSync(claudeDir)
    ? readdirSync(claudeDir, { withFileTypes: true })
    : [];
  for (const entry of claudeEntries) {
    const path = `.claude/skills/${entry.name}`;
    if (entry.name.startsWith(".")) continue;
    if (!entry.isSymbolicLink()) {
      problems.push(`${path} must be a link into .agents/skills, not a copy`);
      continue;
    }
    const target = readlinkSync(join(claudeDir, entry.name));
    const expected = `../../.agents/skills/${entry.name}`;
    if (target !== expected) {
      problems.push(`${path} links to ${target}; expected ${expected}`);
    } else if (!skills.has(entry.name)) {
      problems.push(`${path} links to a skill missing from .agents/skills`);
    } else {
      linked.add(entry.name);
    }
  }
  for (const name of skills) {
    if (!linked.has(name)) {
      problems.push(`.claude/skills/${name} link is missing`);
    }
  }
  return problems;
}

function writeSkill(root: string, name: string): void {
  const dir = join(root, ".agents", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n---\n`, "utf8");
}

function linkSkill(root: string, name: string, target?: string): void {
  symlinkSync(
    target ?? `../../.agents/skills/${name}`,
    join(root, ".claude", "skills", name),
  );
}

function withFixture(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "skills-layout-"));
  try {
    mkdirSync(join(root, ".claude", "skills"), { recursive: true });
    writeSkill(root, "design-md");
    linkSkill(root, "design-md");
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("project skills layout (USMR 14.84)", () => {
  test("the repo keeps one real copy per skill and one Claude link each", () => {
    expect(layoutProblems(ROOT, trackedUnder)).toEqual([]);
  });

  test("git ignores the Codex copies that openspec update regenerates", () => {
    const copy = ".codex/skills/openspec-propose/SKILL.md";
    // check-ignore exits 1, and git() throws, when the path is not ignored.
    expect(git(["check-ignore", "--no-index", copy])).toBe(copy);
  });

  test("design, UX, and search-tool skills stay available to every client", () => {
    for (const name of REQUIRED_SKILLS) {
      expect(
        existsSync(join(ROOT, ".agents", "skills", name, "SKILL.md")),
      ).toBe(true);
      const link = join(ROOT, ".claude", "skills", name);
      expect(lstatSync(link).isSymbolicLink(), `${name} link`).toBe(true);
      expect(existsSync(join(link, "SKILL.md")), `${name} link resolves`).toBe(
        true,
      );
    }
  });

  test("a clean fixture passes", () => {
    withFixture((root) => expect(layoutProblems(root)).toEqual([]));
  });

  test.each<[string, (root: string) => void, string]>([
    [
      "a Codex copy",
      (root) =>
        mkdirSync(join(root, ".codex", "skills", "x"), { recursive: true }),
      ".codex/skills must not exist",
    ],
    [
      "a Gemini skills copy",
      (root) => mkdirSync(join(root, ".gemini", "skills"), { recursive: true }),
      ".gemini/skills must not exist",
    ],
    [
      "Gemini /opsx commands",
      (root) =>
        mkdirSync(join(root, ".gemini", "commands", "opsx"), {
          recursive: true,
        }),
      ".gemini/commands must not exist",
    ],
    [
      "a converted command copy",
      (root) => writeSkill(root, "source-command-opsx-apply"),
      "source-command-opsx-apply is a converted command copy",
    ],
    [
      "a real directory in .claude/skills",
      (root) => mkdirSync(join(root, ".claude", "skills", "copied")),
      ".claude/skills/copied must be a link",
    ],
    [
      "a link into a sibling repo",
      (root) =>
        linkSkill(
          root,
          "py-security",
          "../../../other-skills/skills/py-security",
        ),
      "links to ../../../other-skills/skills/py-security",
    ],
    [
      "a dead link",
      (root) => linkSkill(root, "ink"),
      ".claude/skills/ink links to a skill missing",
    ],
    [
      "a skill without a Claude link",
      (root) => writeSkill(root, "tdd"),
      ".claude/skills/tdd link is missing",
    ],
    [
      "a link inside .agents/skills",
      (root) =>
        symlinkSync(
          "../../../outside",
          join(root, ".agents", "skills", "design-md", "extra"),
        ),
      ".agents/skills/design-md/extra is a link",
    ],
    [
      "an Antigravity legacy copy",
      (root) => mkdirSync(join(root, ".agent", "skills"), { recursive: true }),
      ".agent/skills must not exist",
    ],
    [
      "a Copilot copy",
      (root) => mkdirSync(join(root, ".github", "skills"), { recursive: true }),
      ".github/skills must not exist",
    ],
  ])("rejects %s", (_label, mutate, expected) => {
    withFixture((root) => {
      mutate(root);
      // Exactly one problem: each control fails only for its own reason.
      expect(layoutProblems(root)).toEqual([expect.stringContaining(expected)]);
    });
  });

  test("ignores hidden entries such as .DS_Store", () => {
    withFixture((root) => {
      writeFileSync(join(root, ".claude", "skills", ".DS_Store"), "", "utf8");
      writeFileSync(join(root, ".agents", "skills", ".DS_Store"), "", "utf8");
      expect(layoutProblems(root)).toEqual([]);
    });
  });
});
