// USMR 14.85 (site-dfn) — the search-tool mandate is enforced, not just
// documented.
//
// - `.claude/settings.json` denies the search commands AGENTS.md forbids,
//   pre-approves the read-only forms of the mandated tools, and keeps the
//   flags that run a command or write files behind a prompt.
// - `.codex/rules/search.rules` forbids the same commands in Codex.
// - The husky post-checkout/post-merge/post-rewrite hooks rebuild the tgrep
//   index in the background through `scripts/tgrep-refresh.sh`.
// - USMR 14.86 (site-of0): the search-tool skills in `.agents/skills/` show
//   only commands these rules treat the way the skill says, and cite only
//   repo paths that exist.
//
// The Claude matcher below follows the documented rule grammar (`*` matches
// any text; a trailing ` *` that is the only wildcard also matches the bare
// command) and proves itself on the documentation's own examples first.
// This models simple literal commands, not the client's shell parser or modes.

import { describe, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

type Settings = {
  enabledMcpjsonServers?: string[];
  permissions?: { allow?: string[]; ask?: string[]; deny?: string[] };
};
type Decision = "deny" | "ask" | "allow" | "default";

const settings = JSON.parse(
  readFileSync(join(ROOT, ".claude", "settings.json"), "utf8"),
) as Settings;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bashRuleMatches(rule: string, command: string): boolean {
  const inner = rule.match(/^Bash\((.*)\)$/s)?.[1];
  if (inner === undefined) return false;
  const body = inner.endsWith(":*") ? `${inner.slice(0, -2)} *` : inner;
  const pattern = body.split("*").map(escapeRegExp).join(".*");
  if (new RegExp(`^${pattern}$`, "s").test(command)) return true;
  const onlyTrailing =
    body.endsWith(" *") && body.indexOf("*") === body.length - 1;
  return onlyTrailing && command === body.slice(0, -2);
}

function decide(
  command: string,
  rules: Settings["permissions"] = settings.permissions,
): Decision {
  const any = (list: string[] | undefined) =>
    (list ?? []).some((rule) => bashRuleMatches(rule, command));
  if (any(rules?.deny)) return "deny";
  if (any(rules?.ask)) return "ask";
  if (any(rules?.allow)) return "allow";
  return "default";
}

const BLOCKED = [
  "grep -rn safeJsonLd src",
  "egrep -n safeJsonLd src",
  "fgrep -n safeJsonLd src",
  "rg -n safeJsonLd src",
  "find src -name Header.astro",
  "git grep -n safeJsonLd",
  "rtk grep safeJsonLd src",
  "rtk git grep -n safeJsonLd",
];

const PRE_APPROVED = [
  "rtk rg -n safeJsonLd src",
  "rtk rg --files -g '*.astro' src",
  "rtk tgrep safeJsonLd .",
  "rtk tgrep status .",
  "rtk ripwire . --uses=safeJsonLd --legend=compact",
  "rtk ast-grep run --lang html --globs '**/*.astro' --pattern '<Header />' src",
  "rtk ast-grep scan",
  "rtk ast-grep scan --inline-rules '{id: x, language: typescript, rule: {pattern: foo}}' src",
  "rtk ast-grep run --lang typescript --pattern 'oldCall($$$A)' --rewrite 'newCall($$$A)' src",
];

const STILL_PROMPTS = [
  "rtk rg --pre ./decode.sh token src",
  "rtk rg -n --pre=./decode.sh token src",
  "rtk rg --hostname-bin=/bin/date --hyperlink-format=file://{host}{path} -H token src",
  "rtk rg --search-zip token .",
  "rtk rg -z token .",
  "rtk rg -n -z token .",
  "rtk tgrep serve .",
  // USMR 14.92 (site-5to): subcommands remain gated after global options.
  "rtk tgrep serve",
  "rtk tgrep --hidden serve .",
  "rtk tgrep --hidden serve",
  "rtk tgrep index .",
  "rtk tgrep index --force /tmp/elsewhere",
  "rtk tgrep --hidden index .",
  "rtk tgrep --hidden index",
  "rtk tgrep --index-path /tmp/elsewhere token .",
  "rtk ast-grep run --lang ts -p 'a($X)' -r 'b($X)' -U src",
  "rtk ast-grep run -p 'foo()' -r 'bar()' -l ts -iU src",
  "rtk ast-grep run --lang ts -p 'a' -i src",
  "rtk ast-grep scan --update-all",
  "rtk ast-grep run --lang ts -p 'a' --interactive src",
  "rtk ast-grep scan --custom-languages=trust",
  "rtk ast-grep scan -c /tmp/other-sgconfig.yml",
  "rtk ast-grep scan -c/tmp/other-sgconfig.yml",
  "rtk ast-grep scan --config /tmp/other-sgconfig.yml",
  "rtk ast-grep scan --config=/tmp/other-sgconfig.yml",
  "rtk ast-grep run --lang ts -p foo -c /tmp/other-sgconfig.yml",
  "rtk ast-grep run -p 'foo()' -r 'bar()' -l ts -Ui src",
  "rtk ripwire . --run-trace='npm test'",
  "rtk ripwire . --note-add='safeJsonLd: escapes JSON-LD'",
  "rtk ripwire . --index-out=.ripwire_index",
  "rtk ripwire . --export=cc.json:metrics.json",
  "rtk ripwire . --pin-census=census.tsv",
  "rtk ripwire . --listen=127.0.0.1:9000",
  "rtk ripwire . --mcp --allow-remote-edits",
  "rtk ripwire . --mcp",
  "rtk ripwire . --for=task --mcp",
  "rtk ripwire . --quality-delta",
  "rtk ripwire . --quality-delta=HEAD",
  "rtk ripwire . --replace-symbol-body=safeJsonLd --edit-payload=-",
  "rtk ripwire . --insert-after-symbol=safeJsonLd --edit-payload=-",
  "rtk ripwire . --edit-plan=plan.json",
  "rtk ripwire . --quality-baseline",
  "rtk ripwire . --quality-ack=accepted",
  "rtk ripwire . --arch=layers.txt --baseline",
  "rtk ripwire . --html=graph.html",
  "rtk ripwire . --cache=/tmp/ripwire",
];

// Prefix rules cannot search arbitrary later argv positions or match a flag's
// variable =value suffix. Mirror only the literal prefixes Codex can express.
const CODEX_PROMPTS = [
  "rtk tgrep index .",
  "rtk tgrep serve .",
  "rtk tgrep --hidden index .",
  "rtk tgrep --hidden serve .",
  "rtk ast-grep scan -c /tmp/other-sgconfig.yml",
  "rtk ast-grep run --config /tmp/other-sgconfig.yml",
  "rtk ripwire . --mcp",
  "rtk ripwire . --quality-delta",
];

describe("Claude Code permissions (USMR 14.85)", () => {
  test("the matcher reproduces the documented examples", () => {
    const docs = {
      allow: ["Bash(npm run *)", "Bash(ls *)", "Bash(git log * main)"],
    };
    expect(decide("npm run build", docs)).toBe("allow");
    expect(decide("npm run", docs)).toBe("allow");
    expect(decide("npm install", docs)).toBe("default");
    expect(decide("lsof", docs)).toBe("default");
    expect(decide("git log --oneline main", docs)).toBe("allow");
    expect(decide("git log main", docs)).toBe("default");
  });

  test("deny precedes ask, and ask precedes even an exact allow", () => {
    const command = "rtk tgrep index .";
    const overlapping = {
      allow: [`Bash(${command})`],
      ask: ["Bash(rtk tgrep index *)"],
      deny: ["Bash(rtk tgrep *)"],
    };
    expect(decide(command, overlapping)).toBe("deny");
    expect(decide(command, { ...overlapping, deny: [] })).toBe("ask");
  });

  test("removes pre-approval for an immediate extra ripwire root", () => {
    expect(decide("rtk ripwire . /tmp/other-repo --for=task")).toBe("default");
    expect(decide("rtk ripwire .")).toBe("allow");
  });

  test("documents why whole-text globs do not normalize short flags", () => {
    const narrow = { ask: ["Bash(rtk rg * -z*)"] };
    expect(decide("rtk rg -n -z token .", narrow)).toBe("ask");
    expect(decide("rtk rg -nz token .", narrow)).toBe("default");
    // Broadening '*' across the cluster also matches unrelated argument text.
    const broad = { ask: ["Bash(rtk rg *-*z*)"] };
    expect(decide("rtk rg -n zebra .", broad)).toBe("ask");
    expect(decide("rtk rg -n zebra .")).toBe("allow");
  });

  test("does not mistake a flag-prefixed allow for complete root validation", () => {
    expect(decide("rtk ripwire . --for=task /tmp/other-repo")).toBe("allow");
    // Full argv/path validation needs the proposed hook, not another allow glob.
    expect(
      readFileSync(join(ROOT, "docs/agents/code-intelligence.md"), "utf8"),
    ).toContain("argument-aware hook");
  });

  test.each(BLOCKED)("denies %s", (command) => {
    expect(decide(command)).toBe("deny");
  });

  test.each(PRE_APPROVED)("pre-approves %s", (command) => {
    expect(decide(command)).toBe("allow");
  });

  test.each(STILL_PROMPTS)("keeps a prompt for %s", (command) => {
    expect(decide(command)).toBe("ask");
  });

  test("does not pre-approve a ripwire clone of a remote repo", () => {
    expect(decide("rtk ripwire https://github.com/example/repo --for=x")).toBe(
      "default",
    );
  });

  test("denies the built-in Grep tool and pre-approves the ast-grep MCP read tools", () => {
    expect(settings.permissions?.deny).toContain("Grep");
    for (const tool of [
      "dump_syntax_tree",
      "find_code",
      "find_code_by_rule",
      "test_match_code_rule",
    ]) {
      expect(settings.permissions?.allow).toContain(`mcp__ast-grep__${tool}`);
    }
    const mcp = JSON.parse(readFileSync(join(ROOT, ".mcp.json"), "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(mcp.mcpServers)).toContain("ast-grep");
    expect(settings.enabledMcpjsonServers).toContain("ast-grep");
  });
});

const RULES_PATH = join(ROOT, ".codex", "rules", "search.rules");

type PrefixRule = { pattern: Array<string | string[]>; decision: string };

function parsePrefixRules(source: string): PrefixRule[] {
  const rules: PrefixRule[] = [];
  for (const block of source.split("prefix_rule(").slice(1)) {
    const pattern = block.match(/pattern\s*=\s*(\[[^\n]*\]),/)?.[1];
    const decision = block.match(/decision\s*=\s*"([a-z]+)"/)?.[1];
    if (!pattern || !decision)
      throw new Error(`unparsed rule: ${block.slice(0, 80)}`);
    rules.push({
      pattern: JSON.parse(pattern) as PrefixRule["pattern"],
      decision,
    });
  }
  return rules;
}

function codexDecision(rules: PrefixRule[], command: string): string {
  const argv = command.split(/\s+/);
  const matched = rules.filter((rule) =>
    rule.pattern.every((part, index) =>
      Array.isArray(part)
        ? part.includes(argv[index] ?? "")
        : part === argv[index],
    ),
  );
  for (const level of ["forbidden", "prompt", "allow"]) {
    if (matched.some((rule) => rule.decision === level)) return level;
  }
  return "none";
}

// Skip, rather than fail, where codex or its execpolicy subcommand is absent.
const hasCodex =
  spawnSync("codex", ["execpolicy", "check", "--help"], { encoding: "utf8" })
    .status === 0;

describe("Codex rules (USMR 14.85)", () => {
  const rules = parsePrefixRules(readFileSync(RULES_PATH, "utf8"));

  test("rules only forbid or prompt; none grants unsandboxed approval", () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(
      rules.every((rule) => ["forbidden", "prompt"].includes(rule.decision)),
    ).toBe(true);
  });

  test.each(BLOCKED)("forbids %s", (command) => {
    expect(codexDecision(rules, command)).toBe("forbidden");
  });

  test.each(PRE_APPROVED)("leaves %s to the sandbox", (command) => {
    expect(codexDecision(rules, command)).toBe("none");
  });

  test.each(CODEX_PROMPTS)(
    "prompts for the representable prefix %s",
    (command) => {
      expect(codexDecision(rules, command)).toBe("prompt");
    },
  );

  test.skipIf(!hasCodex)(
    "codex execpolicy agrees with the static reading",
    () => {
      for (const command of [...BLOCKED, ...PRE_APPROVED, ...CODEX_PROMPTS]) {
        const out = execFileSync(
          "codex",
          [
            "execpolicy",
            "check",
            "--rules",
            RULES_PATH,
            "--",
            ...command.split(/\s+/),
          ],
          { encoding: "utf8" },
        );
        const decision =
          (JSON.parse(out) as { decision?: string }).decision ?? "none";
        expect(decision, command).toBe(codexDecision(rules, command));
      }
    },
  );
});

const SEARCH_SKILLS = [
  "ripwire",
  "tgrep",
  "ripgrep",
  "ast-grep",
  "ast-grep-mcp",
];
// ast-grep-mcp shows MCP tool calls, not shell commands.
const CLI_SKILLS = SEARCH_SKILLS.filter((name) => name !== "ast-grep-mcp");

type SkillCommand = { skill: string; command: string; asks: boolean };

function readSkill(name: string): string {
  return readFileSync(
    join(ROOT, ".agents", "skills", name, "SKILL.md"),
    "utf8",
  );
}

const SHELL_FENCE = /^```(?:bash|sh|shell)\n([\s\S]*?)^```$/gm;
const ANY_FENCE = /^```[\s\S]*?^```$/gm;
// An inline `rtk rg|tgrep|ripwire|ast-grep …` span in the prose. Inline
// commands must be pre-approved; a prompting one belongs in a fence with an
// `# asks first` comment.
const INLINE_COMMAND = /`(rtk (?:rg|tgrep|ripwire|ast-grep)\b[^`]*)`/g;

function prose(name: string): string {
  return readSkill(name).replace(ANY_FENCE, "");
}

function fenceCommands(name: string): SkillCommand[] {
  const found: SkillCommand[] = [];
  for (const [, body = ""] of readSkill(name).matchAll(SHELL_FENCE)) {
    for (const line of body.split("\n")) {
      if (line.trim() === "") continue;
      // A comment starts at two spaces and `# `, so a `#` in a pattern stays.
      const [command = "", comment = ""] = line.split(/ {2}# /, 2);
      found.push({
        skill: name,
        command: command.trim(),
        asks: comment.startsWith("asks first"),
      });
    }
  }
  return found;
}

function skillCommands(name: string): SkillCommand[] {
  const inline = [...prose(name).matchAll(INLINE_COMMAND)].map(
    ([, command = ""]) => ({ skill: name, command, asks: false }),
  );
  return [...fenceCommands(name), ...inline];
}

const PATH_ROOTS =
  "(?:\\.agents|\\.claude|\\.codex|docs|openspec|public|rules|scripts|src|tests)";
// A backticked repo path in the prose. Globs, placeholders, and FILE:NAME
// selectors are not paths.
const CITED_PATH = new RegExp(
  `\`(${PATH_ROOTS}/[^\`\\s*<>:]+|[\\w.-]+\\.(?:json|ya?ml|md))\``,
  "g",
);
// A repo path argument inside a command, bare or after `=` or a quote.
const COMMAND_PATH = new RegExp(
  `(?<=^|[\\s='"])(${PATH_ROOTS}/[^\\s'"*<>:,]+)`,
  "g",
);

function citedPaths(name: string): string[] {
  const inProse = [...prose(name).matchAll(CITED_PATH)];
  const inCommands = skillCommands(name).flatMap(({ command }) => [
    ...command.matchAll(COMMAND_PATH),
  ]);
  return [...inProse, ...inCommands].map(([, path = ""]) => path);
}

// Concrete pre-approved examples run with the real tool: a permission label
// says nothing about whether a command works. Skipped: placeholders, the
// verbs whose exit code depends on the working tree or the machine, and the
// index build, which writes .tgrep/.
const PLACEHOLDER = /<[a-z-]+>|\bSYM\b|=A,B\b|\boldCall\b/;
const NOT_RUN = /--quality-delta|--doctor|\btgrep index\b/;
// Agents run these through rtk on their own PATH, which reaches the global
// tools. npx puts the pinned ast-grep 0.42.1 first, and it parses Astro
// self-closing tags differently, so drop node_modules/.bin from PATH.
const SMOKE_ENV = {
  ...process.env,
  PATH: (process.env.PATH ?? "")
    .split(":")
    .filter((dir) => !/\/node_modules\/\.bin$/.test(dir))
    .join(":"),
};
const installed = new Map<string, boolean>();

function hasTool(tool: string): boolean {
  if (!installed.has(tool)) {
    const probe = spawnSync(tool, ["--version"], { env: SMOKE_ENV });
    installed.set(tool, probe.status === 0);
  }
  return installed.get(tool) === true;
}

// The commands a skill labels wrongly: shown as pre-approved but prompting
// or blocked, marked `# asks first` but not prompting, or blocked by Codex.
function mislabeled(commands: SkillCommand[], rules: PrefixRule[]): string[] {
  return commands.flatMap(({ skill, command, asks }) => {
    const claude = decide(command);
    const codex = codexDecision(rules, command);
    return claude === (asks ? "ask" : "allow") &&
      (asks ? ["none", "prompt"].includes(codex) : codex === "none")
      ? []
      : [`${skill}: ${command} -> Claude ${claude}, Codex ${codex}`];
  });
}

describe("search-tool skills (USMR 14.86)", () => {
  const rules = parsePrefixRules(readFileSync(RULES_PATH, "utf8"));

  test.each(SEARCH_SKILLS)("%s names itself after its directory", (name) => {
    const source = readSkill(name);
    expect(source.match(/^---\nname: (\S+)\n/)?.[1]).toBe(name);
    const description = (
      source.match(/^description: >-\n((?: {2}.+\n)+)/m)?.[1] ?? ""
    )
      .replace(/\s+/g, " ")
      .trim();
    expect(description.length).toBeGreaterThan(100);
    // The Agent Skills limit; Codex rejects a longer description.
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  test.each(CLI_SKILLS)(
    "%s shows pre-approved commands and the ones that ask",
    (name) => {
      const commands = skillCommands(name);
      expect(commands.filter((c) => !c.asks).length).toBeGreaterThan(2);
      expect(commands.filter((c) => c.asks).length).toBeGreaterThan(0);
    },
  );

  test("every command is treated the way its skill says", () => {
    expect(mislabeled(CLI_SKILLS.flatMap(skillCommands), rules)).toEqual([]);
  });

  test.each<[string, SkillCommand]>([
    [
      "a prompting flag shown as pre-approved",
      { skill: "x", command: "rtk ast-grep scan --update-all", asks: false },
    ],
    [
      "a pre-approved command marked as asking",
      { skill: "x", command: "rtk tgrep status .", asks: true },
    ],
    [
      "a blocked command",
      { skill: "x", command: "grep -rn safeJsonLd src", asks: false },
    ],
    [
      "a command outside the mandated tools",
      { skill: "x", command: "rtk proxy rg -n safeJsonLd src", asks: false },
    ],
  ])("flags %s", (_label, command) => {
    expect(mislabeled([command], rules)).toHaveLength(1);
  });

  test.each(SEARCH_SKILLS)("%s cites only repo paths that exist", (name) => {
    const cited = citedPaths(name);
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((path) => !existsSync(join(ROOT, path)))).toEqual([]);
  });

  test("finds paths inside commands and inline commands in prose", () => {
    expect(citedPaths("ripwire")).toContain("src/lib/charset.ts");
    expect(citedPaths("ripgrep")).toContain("public/assets/theme.css");
    expect(skillCommands("tgrep").map((c) => c.command)).toContain(
      "rtk tgrep status .",
    );
    expect(
      skillCommands("ripwire").some(
        (c) => c.command === "rtk ripwire . --uses=safeJsonLd",
      ),
    ).toBe(true);
  });

  const smoke = CLI_SKILLS.flatMap(fenceCommands).filter(
    ({ command, asks }) =>
      !asks && !PLACEHOLDER.test(command) && !NOT_RUN.test(command),
  );

  test("has concrete examples to run", () => {
    expect(smoke.length).toBeGreaterThan(15);
  });

  for (const { skill, command } of smoke) {
    const shell = command.replace(/^rtk /, "");
    const tool = shell.split(" ")[0] ?? "";
    test.skipIf(!hasTool(tool))(
      `${skill} example runs: ${command}`,
      () => {
        const result = spawnSync("sh", ["-c", shell], {
          cwd: ROOT,
          encoding: "utf8",
          env: SMOKE_ENV,
        });
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout.length, "no output").toBeGreaterThan(0);
      },
      60000,
    );
  }

  test("ast-grep-mcp covers every pre-approved ast-grep MCP tool", () => {
    const prefix = "mcp__ast-grep__";
    const tools = (settings.permissions?.allow ?? [])
      .filter((rule) => rule.startsWith(prefix))
      .map((rule) => rule.slice(prefix.length));
    expect(tools).toHaveLength(4);
    const skill = readSkill("ast-grep-mcp");
    for (const tool of tools) expect(skill).toContain(`\`${tool}\``);
  });
});

const SCRIPT = join(ROOT, "scripts", "tgrep-refresh.sh");
const SYSTEM_PATH = "/usr/bin:/bin";

type Sandbox = { repo: string; bin: string; log: string };

function withRepo(run: (box: Sandbox) => Promise<void> | void) {
  return async () => {
    const base = realpathSync(mkdtempSync(join(tmpdir(), "tgrep-refresh-")));
    const box = {
      repo: join(base, "repo"),
      bin: join(base, "bin"),
      log: join(base, "calls.log"),
    };
    try {
      mkdirSync(join(box.repo, "scripts"), { recursive: true });
      mkdirSync(join(box.repo, "sub"));
      mkdirSync(box.bin);
      copyFileSync(SCRIPT, join(box.repo, "scripts", "tgrep-refresh.sh"));
      execFileSync("git", ["init", "-q", box.repo], { env: gitEnv(base) });
      const fake = join(box.bin, "tgrep");
      writeFileSync(
        fake,
        '#!/bin/sh\nsleep "${FAKE_TGREP_SLEEP:-0}"\nprintf \'%s|%s\\n\' "$PWD" "$*" >> "$FAKE_TGREP_LOG"\n',
        "utf8",
      );
      chmodSync(fake, 0o755);
      await run(box);
    } finally {
      // Let a background build finish before the directory goes away.
      await waitFor(
        () => !existsSync(join(box.repo, ".git", "tgrep-refresh.lock")),
        6000,
      );
      rmSync(base, { recursive: true, force: true });
    }
  };
}

function gitEnv(
  home: string,
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  return { HOME: home, PATH: SYSTEM_PATH, ...extra };
}

function runIn(
  box: Sandbox,
  file: string,
  args: string[],
  extra: Record<string, string> = {},
) {
  return spawnSync("sh", [file, ...args], {
    cwd: join(box.repo, "sub"),
    encoding: "utf8",
    env: gitEnv(box.repo, {
      PATH: `${box.bin}:${SYSTEM_PATH}`,
      FAKE_TGREP_LOG: box.log,
      ...extra,
    }),
  });
}

async function waitFor(check: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return check();
}

const calls = (box: Sandbox) =>
  existsSync(box.log) ? readFileSync(box.log, "utf8") : "";

describe("tgrep index refresh (USMR 14.85)", () => {
  test(
    "indexes the repo root in the background and releases the lock",
    withRepo(async (box) => {
      const result = runIn(
        box,
        join(box.repo, "scripts", "tgrep-refresh.sh"),
        [],
        {
          FAKE_TGREP_SLEEP: "5",
        },
      );
      expect(result.status).toBe(0);
      // The fake tgrep logs only after its sleep, so an empty log and a held
      // lock prove the script returned while the build was still running.
      // A wall-clock bound flaked under a loaded full-suite run.
      expect(calls(box)).toBe("");
      expect(existsSync(join(box.repo, ".git", "tgrep-refresh.lock"))).toBe(
        true,
      );
      expect(await waitFor(() => calls(box) !== "", 10000)).toBe(true);
      expect(calls(box)).toBe(`${box.repo}|index .\n`);
      expect(
        await waitFor(
          () => !existsSync(join(box.repo, ".git", "tgrep-refresh.lock")),
          3000,
        ),
      ).toBe(true);
    }),
    20000,
  );

  test(
    "does nothing when SKIP_TGREP_INDEX=1",
    withRepo(async (box) => {
      const result = runIn(
        box,
        join(box.repo, "scripts", "tgrep-refresh.sh"),
        [],
        {
          SKIP_TGREP_INDEX: "1",
        },
      );
      expect(result.status).toBe(0);
      expect(await waitFor(() => calls(box) !== "", 800)).toBe(false);
    }),
  );

  test(
    "stops before touching git when tgrep is not installed",
    withRepo((box) => {
      // A logging git, and no tgrep anywhere on PATH.
      const gitBin = join(box.repo, "..", "git-bin");
      const gitLog = join(box.repo, "..", "git.log");
      mkdirSync(gitBin);
      writeFileSync(
        join(gitBin, "git"),
        `#!/bin/sh\necho "$*" >> "${gitLog}"\nexit 1\n`,
        "utf8",
      );
      chmodSync(join(gitBin, "git"), 0o755);
      const result = spawnSync(
        "sh",
        [join(box.repo, "scripts", "tgrep-refresh.sh")],
        {
          cwd: box.repo,
          encoding: "utf8",
          env: gitEnv(box.repo, { PATH: `${gitBin}:${SYSTEM_PATH}` }),
        },
      );
      expect(result.status).toBe(0);
      expect(existsSync(gitLog)).toBe(false);
    }),
  );

  test(
    "runs once more when a request arrives during a build",
    withRepo(async (box) => {
      const script = join(box.repo, "scripts", "tgrep-refresh.sh");
      expect(runIn(box, script, [], { FAKE_TGREP_SLEEP: "1" }).status).toBe(0);
      // The first build is still sleeping: this request must not be lost.
      expect(runIn(box, script, [], { FAKE_TGREP_SLEEP: "1" }).status).toBe(0);
      expect(
        await waitFor(() => calls(box).split("\n").length === 3, 8000),
        calls(box),
      ).toBe(true);
      expect(
        await waitFor(
          () => !existsSync(join(box.repo, ".git", "tgrep-refresh.lock")),
          3000,
        ),
      ).toBe(true);
      expect(calls(box)).toBe(`${box.repo}|index .\n${box.repo}|index .\n`);
    }),
    20000,
  );

  test(
    "skips while a fresh lock is held, and replaces a stale one",
    withRepo(async (box) => {
      const lock = join(box.repo, ".git", "tgrep-refresh.lock");
      mkdirSync(lock);
      writeFileSync(
        join(lock, "started"),
        `${Math.floor(Date.now() / 1000)}\n`,
        "utf8",
      );
      const script = join(box.repo, "scripts", "tgrep-refresh.sh");
      expect(runIn(box, script, []).status).toBe(0);
      expect(await waitFor(() => calls(box) !== "", 800)).toBe(false);
      // The request is left for the build that holds the lock.
      expect(existsSync(join(lock, "again"))).toBe(true);

      writeFileSync(join(lock, "started"), "0\n", "utf8");
      expect(runIn(box, script, []).status).toBe(0);
      expect(await waitFor(() => calls(box) !== "", 3000)).toBe(true);
    }),
    15000,
  );

  test(
    "post-checkout refreshes on branch checkouts only; post-merge and post-rewrite always",
    withRepo(async (box) => {
      const hook = (name: string) => join(ROOT, ".husky", name);
      // husky 9 runs each hook as `sh -e .husky/<name> "$@"`.
      const inRepo = (name: string, args: string[]) =>
        spawnSync("sh", ["-e", hook(name), ...args], {
          cwd: box.repo,
          encoding: "utf8",
          env: gitEnv(box.repo, {
            PATH: `${box.bin}:${SYSTEM_PATH}`,
            FAKE_TGREP_LOG: box.log,
          }),
        });

      expect(inRepo("post-checkout", ["a", "b", "0"]).status).toBe(0);
      expect(await waitFor(() => calls(box) !== "", 800)).toBe(false);

      for (const [name, args] of [
        ["post-checkout", ["a", "b", "1"]],
        ["post-merge", ["0"]],
        ["post-rewrite", ["rebase"]],
      ] as const) {
        const before = calls(box).split("\n").length;
        expect(inRepo(name, [...args]).status, name).toBe(0);
        expect(
          await waitFor(() => calls(box).split("\n").length > before, 3000),
          name,
        ).toBe(true);
        await waitFor(
          () => !existsSync(join(box.repo, ".git", "tgrep-refresh.lock")),
          3000,
        );
      }

      // A checkout without scripts/ (for example a sparse one) must not
      // fail the git command.
      rmSync(join(box.repo, "scripts"), { recursive: true, force: true });
      for (const [name, args] of [
        ["post-checkout", ["a", "b", "1"]],
        ["post-merge", ["0"]],
        ["post-rewrite", ["rebase"]],
      ] as const) {
        expect(inRepo(name, [...args]).status, name).toBe(0);
      }
    }),
    20000,
  );
});
