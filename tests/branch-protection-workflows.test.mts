// USMR 14.82 (site-pep): execute workflow scripts offline; never run browsers or real GitHub writes.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { parse } from "yaml";

type Step = {
  name: string;
  run?: string;
  if?: string;
  env?: Record<string, string>;
  with?: { script?: string };
};
type Job = {
  name?: string;
  permissions?: Record<string, string>;
  steps: Step[];
};
type Workflow = { jobs: Record<string, Job> };
const workflowDir = new URL("../.github/workflows/", import.meta.url);
function workflow(file: string): Workflow {
  return parse(readFileSync(new URL(file, workflowDir), "utf8"));
}
function step(job: Job, name: string): Step {
  const result = job.steps.find((item) => item.name === name);
  if (!result) throw new Error(`Missing step: ${name}`);
  return result;
}

const update = workflow("playwright.yml").jobs["update-snapshots"]!;
const publication = step(update, "Commit updated snapshots");
const compliance = workflow("pr-spec-compliance.yml").jobs["spec-compliance"]!;
const enforcement = step(compliance, "Comment and enforce spec compliance")
  .with!.script!;
const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

// Stub the external commands, then run the actual workflow shell with Actions' fail-fast options.
function publish(script: string, diffExit = 1, pushExit = 0, prExit = 0) {
  const dir = mkdtempSync(join(tmpdir(), "site-snapshot-pr-"));
  fixtures.push(dir);
  const log = join(dir, "commands.jsonl");
  for (const command of ["git", "gh"]) {
    writeFileSync(
      join(dir, command),
      `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.COMMAND_LOG, JSON.stringify({ command: '${command}', args }) + '\\n');
if ('${command}' === 'git' && args[0] === 'diff') process.exit(Number(process.env.DIFF_EXIT));
if ('${command}' === 'git' && args[0] === 'push') process.exit(Number(process.env.PUSH_EXIT));
if ('${command}' === 'gh') process.exit(Number(process.env.PR_EXIT));
`,
      { mode: 0o755 },
    );
  }
  const result = spawnSync("bash", ["-e", "-o", "pipefail"], {
    input: script,
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      COMMAND_LOG: log,
      DIFF_EXIT: String(diffExit),
      PUSH_EXIT: String(pushExit),
      PR_EXIT: String(prExit),
      SNAPSHOT_BRANCH: "ci/update-snapshots-12345",
      GH_REPO: "fixture/site",
      GH_TOKEN: "offline-fixture",
      RUNNER_TEMP: dir,
    },
  });
  const calls = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { command: string; args: string[] });
  return { result, calls, dir };
}
type Publication = ReturnType<typeof publish>;
function assertBranchPush({ result, calls }: Publication) {
  expect(result.status, result.stderr).toBe(0);
  const gitCalls = calls
    .filter(({ command }) => command === "git")
    .map(({ args }) => args);
  expect(gitCalls.filter(([command]) => command === "push")).toEqual([
    ["push", "--set-upstream", "origin", "ci/update-snapshots-12345"],
  ]);
  expect(gitCalls).toContainEqual([
    "switch",
    "--create",
    "ci/update-snapshots-12345",
  ]);
  expect(gitCalls.filter(([command]) => command === "commit")).toHaveLength(1);
}
function assertPullRequest({ result, calls, dir }: Publication) {
  expect(result.status, result.stderr).toBe(0);
  const prCalls = calls.filter(({ command }) => command === "gh");
  expect(prCalls).toHaveLength(1);
  const args = prCalls[0]!.args;
  expect(args.slice(0, 2)).toEqual(["pr", "create"]);
  for (const [flag, value] of [
    ["--base", "main"],
    ["--head", "ci/update-snapshots-12345"],
    ["--repo", "fixture/site"],
  ]) {
    expect(args[args.indexOf(flag!) + 1]).toBe(value);
  }
  const bodyPath = args[args.indexOf("--body-file") + 1]!;
  expect(bodyPath.startsWith(dir)).toBe(true);
  const body = readFileSync(bodyPath, "utf8");
  expect(body).toMatch(/Approve workflows to run|close and reopen/i);
  expect(body).toContain(
    "https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs",
  );
  expect(body).toMatch(/GITHUB_TOKEN/);
  expect(body).toMatch(/CI/);
  expect(body).toMatch(/merge/i);
  // The spec-compliance workflow recognizes this PR as a fix.
  expect(body).toContain("- [x] Fix");
}
function assertNoPublication({ result, calls }: Publication) {
  expect(result.status).toBe(0);
  expect(
    calls.filter(
      ({ command, args }) =>
        command === "gh" || ["push", "commit", "switch"].includes(args[0]!),
    ),
  ).toEqual([]);
}
const oldPublication = `git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add -- 'tests/*-snapshots/*-chromium-linux.png'
git diff --staged --quiet || git commit -m "chore(ci): update Linux visual regression snapshots"
git push
`;

describe("snapshot PR publication", () => {
  test("allows pushes only in the publication step and rejects main targets in every step", () => {
    const check = (job: Job) => {
      const commit = step(job, "Commit updated snapshots");
      for (const item of job.steps) {
        const pushLines = (item.run ?? "")
          .split(/\r?\n/)
          .filter((line) => /\bgit\s+push\b/.test(line));
        if (pushLines.length === 0) continue;
        expect(item).toBe(commit);
        for (const line of pushLines) expect(line).not.toMatch(/\bmain\b/);
      }
    };
    check(update);
    const extraPush = structuredClone(update);
    extraPush.steps.push({
      name: "Unexpected main push",
      run: "git push origin HEAD:main",
    });
    expect(() => check(extraPush)).toThrow();
    const mainInPublication = structuredClone(update);
    step(mainInPublication, "Commit updated snapshots").run +=
      "\ngit push origin HEAD:main";
    expect(() => check(mainInPublication)).toThrow();
  });

  test("pushes only the run-specific branch; rejects the old direct push", () => {
    assertBranchPush(publish(publication.run!));
    expect(() => assertBranchPush(publish(oldPublication))).toThrow();
  });

  test("opens a main PR with CI instructions; rejects the old workflow without a PR", () => {
    assertPullRequest(publish(publication.run!));
    expect(() => assertPullRequest(publish(oldPublication))).toThrow();
  });

  test("does nothing when snapshots are unchanged; rejects the old unconditional push", () => {
    assertNoPublication(publish(publication.run!, 0));
    expect(() => assertNoPublication(publish(oldPublication, 0))).toThrow();
  });

  test("grants exactly contents and pull-requests write; rejects the old permission set", () => {
    const check = (job: Job) =>
      expect(job.permissions).toEqual({
        contents: "write",
        "pull-requests": "write",
      });
    check(update);
    expect(() =>
      check({ ...update, permissions: { contents: "write" } }),
    ).toThrow();
  });

  test("passes expressions through env and provides the job token; rejects raw shell interpolation", () => {
    const check = (job: Job) => {
      const commit = step(job, "Commit updated snapshots");
      expect(commit.env?.SNAPSHOT_BRANCH).toBe(
        "ci/update-snapshots-${{ github.run_id }}",
      );
      expect(commit.env?.GH_TOKEN).toBe("${{ github.token }}");
      expect(commit.env?.GH_REPO).toBe("${{ github.repository }}");
      for (const item of job.steps) expect(item.run ?? "").not.toContain("${{");
    };
    check(update);
    expect(() =>
      check({
        ...update,
        steps: update.steps.map((item) =>
          item === publication
            ? { ...item, run: oldPublication + 'echo "${{ github.run_id }}"' }
            : item,
        ),
      }),
    ).toThrow();
  });

  test.each([
    [128, 0, 0],
    [1, 42, 0],
    [1, 0, 43],
  ])(
    "surfaces diff=%s push=%s PR=%s failures",
    (diffExit, pushExit, prExit) => {
      const { result, calls } = publish(
        publication.run!,
        diffExit,
        pushExit,
        prExit,
      );
      expect(result.status).toBe(
        diffExit === 128 ? diffExit : pushExit || prExit,
      );
      if (diffExit === 128 || pushExit)
        expect(calls.some(({ command }) => command === "gh")).toBe(false);
    },
  );
});

describe("unambiguous required check names", () => {
  const agents = workflow("agents-check.yml");
  const design = workflow("design-md-lint.yml");
  function assertNames(a: Workflow, d: Workflow) {
    expect(a.jobs.check!.name).toBe("agents-check");
    expect(d.jobs.check!.name).toBe("design-md-lint");
    const names = readdirSync(workflowDir)
      .filter((file) => /\.ya?ml$/.test(file))
      .flatMap((file) => {
        const parsed =
          file === "agents-check.yml"
            ? a
            : file === "design-md-lint.yml"
              ? d
              : workflow(file);
        return Object.entries(parsed.jobs).map(([id, job]) => job.name ?? id);
      });
    for (const name of ["agents-check", "design-md-lint"])
      expect(names.filter((item) => item === name)).toHaveLength(1);
  }
  test("names both checks uniquely across workflows and rejects each old unnamed job", () => {
    assertNames(agents, design);
    for (const file of ["agents", "design"]) {
      const a = structuredClone(agents);
      const d = structuredClone(design);
      delete (file === "agents" ? a : d).jobs.check!.name;
      expect(() => assertNames(a, d)).toThrow();
    }
    const duplicate = structuredClone(design);
    duplicate.jobs.check!.name = "agents-check";
    expect(() => assertNames(agents, duplicate)).toThrow();
  });
});

async function enforce(
  script: string,
  author: string,
  body = "",
  validSpec = false,
) {
  const writes = {
    addLabels: vi.fn(),
    removeLabel: vi.fn(),
    updateComment: vi.fn(),
    createComment: vi.fn(),
  };
  const listComments = vi.fn().mockResolvedValue({ data: [] });
  const summary = { addRaw: vi.fn().mockReturnThis(), write: vi.fn() };
  const setFailed = vi.fn();
  const fs = {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(
      JSON.stringify({
        missingSpecReference: !validSpec,
        acceptanceCriteria: [],
        errors: [],
      }),
    ),
  };
  await runInNewContext(`(async () => {\n${script}\n})()`, {
    context: {
      actor: "dependabot[bot]",
      payload: {
        pull_request: {
          number: 1,
          user: { login: author },
          body,
          title: "dependabot[bot]",
          labels: [{ name: "dependabot[bot]" }],
        },
      },
      repo: { owner: "fixture", repo: "site" },
    },
    github: { rest: { issues: { ...writes, listComments } } },
    core: { summary, setFailed },
    require: () => fs,
    process: { env: { SPEC_VALIDATION_PATH: "validation.json" } },
  });
  return { writes, listComments, summary, setFailed, fs };
}
function assertExempt(result: Awaited<ReturnType<typeof enforce>>) {
  for (const write of Object.values(result.writes))
    expect(write).not.toHaveBeenCalled();
  expect(result.listComments).not.toHaveBeenCalled();
  expect(result.setFailed).not.toHaveBeenCalled();
  expect(result.fs.readFileSync).not.toHaveBeenCalled();
  expect(result.summary.addRaw).toHaveBeenCalledWith(
    expect.stringContaining("Dependabot"),
  );
  expect(result.summary.write).toHaveBeenCalledOnce();
}

describe("Dependabot author exemption", () => {
  // Removing only the guard recreates the old enforcement behavior for the negative controls.
  function withoutExemption(script: string) {
    return script.replace(
      /\s*\/\/ USMR 14\.82[^\n]*\n\s*if \(context\.payload\.pull_request\.user\.login === 'dependabot\[bot\]'\) \{[\s\S]*?\n\s*\}/,
      "",
    );
  }
  test("uses the exact PR-author login and returns before API writes; rejects the old script", async () => {
    const checkAuthor = (script: string) =>
      expect(script).toContain(
        "context.payload.pull_request.user.login === 'dependabot[bot]'",
      );
    checkAuthor(enforcement);
    assertExempt(await enforce(enforcement, "dependabot[bot]"));
    const oldScript = withoutExemption(enforcement);
    expect(oldScript).not.toBe(enforcement);
    expect(() => checkAuthor(oldScript)).toThrow();
    const oldResult = await enforce(oldScript, "dependabot[bot]");
    expect(oldResult.writes.addLabels).toHaveBeenCalled();
    expect(oldResult.writes.createComment).toHaveBeenCalled();
    expect(oldResult.setFailed).toHaveBeenCalled();
    expect(() => assertExempt(oldResult)).toThrow();
  });

  test("skips the validator for that same author; rejects the old unconditional step", () => {
    const validation = step(compliance, "Validate spec reference");
    const check = (item: Step) =>
      expect(item.if).toBe(
        "github.event.pull_request.user.login != 'dependabot[bot]'",
      );
    check(validation);
    const oldValidation = { ...validation };
    delete oldValidation.if;
    expect(() => check(oldValidation)).toThrow();
  });

  test.each([
    "maintainer",
    "Dependabot[bot]",
    "dependabot",
    "dependabot[bot]-spoof",
  ])(
    "still enforces implementation rules for %s despite spoofed actor/title/labels",
    async (author) => {
      const result = await enforce(enforcement, author);
      expect(result.writes.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ["implementation", "needs-spec"] }),
      );
      expect(result.writes.createComment).toHaveBeenCalledOnce();
      expect(result.setFailed).toHaveBeenCalledWith(
        "Implementation PRs must reference a spec issue.",
      );
      expect(result.summary.write).not.toHaveBeenCalled();
    },
  );

  test.each([
    ["- [x] Fix", false],
    ["- [x] Implementation", true],
  ] as const)(
    "preserves successful human PR behavior: %s",
    async (body, validSpec) => {
      const result = await enforce(enforcement, "maintainer", body, validSpec);
      expect(result.setFailed).not.toHaveBeenCalled();
      expect(result.writes.createComment).toHaveBeenCalledOnce();
    },
  );
});
