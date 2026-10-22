// USMR 14.38/14.40/14.51/14.52/14.67: exercise workflow logic without network or browsers.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { BUILD } from "../build.config.ts";

type Step = {
  id?: string;
  name: string;
  run?: string;
  if?: string;
  uses?: string;
  "timeout-minutes"?: number;
  with?: Record<string, unknown>;
};
type Job = {
  env?: Record<string, string>;
  if?: string;
  permissions?: Record<string, string>;
  steps: Step[];
};
type Workflow = {
  jobs: Record<string, Job>;
  permissions?: Record<string, string>;
};
function workflow(name: string): Workflow {
  return parse(
    readFileSync(
      new URL(`../.github/workflows/${name}.yml`, import.meta.url),
      "utf8",
    ),
  );
}
function step(name: string, job: Job): Step {
  const found = job.steps.find((item) => item.name === name);
  if (!found) throw new Error(`Missing workflow step: ${name}`);
  return found;
}

const playwright = workflow("playwright");
const deploy = workflow("deploy");
const drift = workflow("design-md-drift");
const specCompliance = workflow("pr-spec-compliance");
const actionlintWorkflow = workflow("actionlint");
const fixtures: string[] = [];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "site-ci-"));
  fixtures.push(dir);
  for (const command of ["gh", "curl"]) {
    writeFileSync(
      join(dir, command),
      '#!/bin/sh\nif [ -n "${REQUESTS:-}" ]; then printf "%s\\n" "$@" >> "$REQUESTS"; fi\nprintf "%s" "$MOCK_RESPONSE"\nprintf "%s" "${MOCK_STDERR:-}" >&2\nexit "${MOCK_EXIT:-0}"\n',
      { mode: 0o755 },
    );
  }
  return dir;
}
function runShell(
  script: string,
  dir: string,
  env: Record<string, string> = {},
) {
  return spawnSync("bash", ["-e", "-o", "pipefail"], {
    input: script,
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_ENV: join(dir, "env"),
      GITHUB_STEP_SUMMARY: join(dir, "summary"),
      MOCK_RESPONSE: "",
      MOCK_STDERR: "",
      ...env,
    },
  });
}

function workflowJqGateFor(jqAvailable: boolean, isCI: boolean) {
  if (jqAvailable) return { kind: "run" as const };
  if (isCI) {
    return {
      kind: "fail" as const,
      message:
        "CI requires jq for workflow jq cases; install jq before running Vitest.",
    };
  }
  return {
    kind: "skip" as const,
    message:
      "SKIP locally: jq is unavailable, so workflow jq cases are skipped. Install jq to run them.",
  };
}

function requireWorkflowJq(jqAvailable: boolean, isCI: boolean) {
  const gate = workflowJqGateFor(jqAvailable, isCI);
  if (gate.kind === "fail") throw new Error(gate.message);
  return gate;
}

const jqAvailable =
  spawnSync("jq", ["--version"], { stdio: "ignore" }).status === 0;
const workflowJqGate = requireWorkflowJq(jqAvailable, Boolean(process.env.CI));
const workflowJqTest = workflowJqGate.kind === "skip" ? test.skip : test;
const workflowJqResponseTitle =
  workflowJqGate.kind === "skip"
    ? "response=%s curl-exit=%s (skipped locally: jq unavailable)"
    : "response=%s curl-exit=%s";

if (workflowJqGate.kind === "skip") {
  console.warn(`[skip] ${workflowJqGate.message}`);
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of fixtures.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("browser CI routing", () => {
  test("comparison is read-only; only trusted dispatch can update snapshots", () => {
    const compare = playwright.jobs["visual-regression"]!;
    expect(compare.permissions?.contents).toBe("read");
    expect(compare.if).toContain("!= 'workflow_dispatch'");
    expect(step("Checkout code", compare).with?.["persist-credentials"]).toBe(
      false,
    );
    const update = playwright.jobs["update-snapshots"]!;
    expect(update.if).toContain("== 'workflow_dispatch'");
    expect(update.if).toContain("refs/heads/main");
    expect(update.permissions?.contents).toBe("write");
    expect(
      step("Run visual regression tests (compare-only)", compare).run?.match(
        /--project=\S+/g,
      ),
    ).toEqual(["--project=chromium"]);
    expect(
      step("Run visual regression tests (update snapshots)", update).run?.match(
        /--project=\S+/g,
      ),
    ).toEqual(["--project=chromium"]);
  });

  test("the dedicated a11y job selects the axe and a11y files", () => {
    const command = step(
      "Run accessibility tests",
      playwright.jobs.accessibility!,
    ).run!;
    expect(command).toContain(
      "tests/home-axe.spec.ts tests/styling-a11y.spec.ts",
    );
    expect(command).not.toContain("--grep");
  });

  test("installs jq on shard 1 before the Vitest suites", () => {
    const job = playwright.jobs.test!;
    const stepNames = job.steps.map(({ name }) => name);
    const installJqIndex = stepNames.indexOf(
      "Install jq for Vitest (shard 1 only)",
    );
    const vitestIndex = stepNames.indexOf("Run vitest suites (shard 1 only)");
    const installJq = step("Install jq for Vitest (shard 1 only)", job);

    expect(installJq.if).toBe("matrix.shard == 1");
    expect(installJq.run).toContain("apt-get update");
    expect(installJq.run).toContain(
      "apt-get install -y --no-install-recommends jq",
    );
    expect(installJq["timeout-minutes"]).toBe(3);
    expect(installJqIndex).toBeGreaterThanOrEqual(0);
    expect(vitestIndex).toBeGreaterThan(installJqIndex);
  });

  test("blob upload/download and merged HTML output agree with BUILD", () => {
    expect(step("Upload test results", playwright.jobs.test!).with?.path).toBe(
      `${BUILD.reports.playwright.blob}/`,
    );
    expect(
      step("Download all reports", playwright.jobs["merge-reports"]!).with
        ?.path,
    ).toBe(`${BUILD.reports.playwright.blob}/`);
    expect(
      step("Upload merged report", playwright.jobs["merge-reports"]!).with
        ?.path,
    ).toBe(`${BUILD.reports.playwright.html}/`);
    const merge = step("Merge reports", playwright.jobs["merge-reports"]!);
    expect(merge.run).toContain("PLAYWRIGHT_HTML_OUTPUT_DIR");
    expect(merge.run).toContain("BUILD.reports.playwright.html");
    expect(merge.run).toContain("--no-install playwright merge-reports");
  });
});

describe("spec compliance validation path", () => {
  test("publishes the runner temp path before both workflow consumers", () => {
    const job = specCompliance.jobs["spec-compliance"]!;
    expect(job.env?.SPEC_VALIDATION_PATH).toBeUndefined();
    const stepNames = job.steps.map(({ name }) => name);
    const pathSetupIndex = stepNames.indexOf("Set spec validation output path");
    expect(pathSetupIndex).toBeGreaterThanOrEqual(0);
    expect(pathSetupIndex).toBeLessThan(
      stepNames.indexOf("Validate spec reference"),
    );
    expect(pathSetupIndex).toBeLessThan(
      stepNames.indexOf("Comment and enforce spec compliance"),
    );
    const pathSetup = step("Set spec validation output path", job).run!;
    expect(pathSetup).toContain("SPEC_VALIDATION_PATH=%s/spec-validation.json");
    expect(pathSetup).toContain('"$RUNNER_TEMP"');
    expect(pathSetup).toContain('"$GITHUB_ENV"');
    expect(step("Validate spec reference", job).run).toContain(
      '"$SPEC_VALIDATION_PATH"',
    );
    expect(
      String(step("Comment and enforce spec compliance", job).with?.script),
    ).toContain("process.env.SPEC_VALIDATION_PATH");
  });
});

describe("actionlint CI lane", () => {
  const job = actionlintWorkflow.jobs.actionlint!;

  test("uses read-only permissions and pins every action by full SHA", () => {
    expect(actionlintWorkflow.permissions).toEqual({ contents: "read" });
    expect(job.permissions).toEqual({ contents: "read" });
    expect(step("Checkout", job).with?.["persist-credentials"]).toBe(false);
    const actionRefs = job.steps
      .filter(({ uses }) => uses !== undefined)
      .map(({ uses }) => uses!);
    expect(actionRefs).toHaveLength(1);
    expect(actionRefs[0]).toMatch(/^actions\/checkout@[0-9a-f]{40}$/);
  });

  test("checks ShellCheck and verifies the pinned release before extraction", () => {
    expect(step("Verify ShellCheck", job).run).toContain("shellcheck --version");
    expect(job.env?.ACTIONLINT_VERSION).toBe("1.7.12");
    expect(step("Download actionlint archive", job).run).toContain(
      "releases/download/v${ACTIONLINT_VERSION}/",
    );

    const stepNames = job.steps.map(({ name }) => name);
    const checksumIndex = stepNames.indexOf(
      "Verify actionlint archive checksum",
    );
    const extractIndex = stepNames.indexOf("Extract actionlint");
    expect(checksumIndex).toBeGreaterThanOrEqual(0);
    expect(extractIndex).toBeGreaterThan(checksumIndex);
    expect(step("Verify actionlint archive checksum", job).run).toContain(
      "sha256sum --check",
    );
    expect(step("Verify actionlint archive checksum", job).run).toContain(
      "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8",
    );
    expect(step("Extract actionlint", job).run).toContain("tar -xzf");
    expect(step("Lint workflows", job).run).toBe(
      "actionlint -no-color .github/workflows/*.yml",
    );
  });
});

describe("cache purge manifest", () => {
  test("includes non-content-hashed public assets and excludes _astro bundles and directories", () => {
    const dir = fixture();
    for (const path of ["html/assets", "html/_astro", "html/empty-dir"]) {
      mkdirSync(join(dir, path), { recursive: true });
    }
    for (const path of [
      "index.html",
      "assets/theme.css",
      "assets/logo.svg",
      "sri-manifest.json",
      "_astro/page.hash.css",
    ]) {
      writeFileSync(join(dir, "html", path), "fixture");
    }
    writeFileSync(
      join(dir, "build.config.ts"),
      'export const BUILD = { dist: "html", reports: { cloudflarePurge: "manifest" } };',
    );
    const script = step(
      "Prepare cache purge URLs",
      deploy.jobs.build!,
    ).run!.match(/<<'NODE'\n([\s\S]*?)\nNODE/)![1]!;
    const result = spawnSync(process.execPath, ["--input-type=module"], {
      input: script,
      cwd: dir,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(
      JSON.parse(readFileSync(join(dir, "manifest", "urls.json"), "utf8")),
    ).toEqual([
      "https://artagon.com/",
      "https://artagon.com/assets/logo.svg",
      "https://artagon.com/assets/theme.css",
      "https://artagon.com/index.html",
      "https://artagon.com/sri-manifest.json",
    ]);
  });

  test.each([true, false])(
    "build workflow handles emitted HTML=%s",
    (hasHtml) => {
      const dir = fixture();
      mkdirSync(join(dir, "html", "vision"), { recursive: true });
      writeFileSync(join(dir, "html", "asset.css"), "fixture");
      if (hasHtml) {
        writeFileSync(join(dir, "html", "index.html"), "fixture");
        writeFileSync(join(dir, "html", "vision", "index.html"), "fixture");
      }
      writeFileSync(
        join(dir, "build.config.ts"),
        'export const BUILD = { dist: "html", reports: { cloudflarePurge: "manifest" } };',
      );
      const script = step(
        "Prepare cache purge URLs",
        deploy.jobs.build!,
      ).run!.match(/<<'NODE'\n([\s\S]*?)\nNODE/)![1]!;
      const result = spawnSync(process.execPath, ["--input-type=module"], {
        input: script,
        cwd: dir,
        encoding: "utf8",
      });
      if (!hasHtml) {
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("No HTML URLs found");
        return;
      }
      expect(result.status, result.stderr).toBe(0);
      expect(
        JSON.parse(readFileSync(join(dir, "manifest", "urls.json"), "utf8")),
      ).toEqual([
        "https://artagon.com/",
        "https://artagon.com/asset.css",
        "https://artagon.com/index.html",
        "https://artagon.com/vision",
        "https://artagon.com/vision/",
        "https://artagon.com/vision/index.html",
      ]);
    },
  );
});

describe("purge workflow response handling (stubbed curl, no network)", () => {
  const script = step("Purge Cloudflare cache", deploy.jobs.deploy!).run!;

  test("missing credentials emit a workflow warning and summary", () => {
    const dir = fixture();
    const result = runShell(script, dir, {
      CLOUDFLARE_CACHE_PURGE_TOKEN: "",
      CLOUDFLARE_DNS_ZONE_ID: "",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("::warning::");
    expect(readFileSync(join(dir, "summary"), "utf8")).toContain(
      "purge skipped",
    );
  });

  test("fails clearly when CI has no jq (negative control)", () => {
    expect(() => requireWorkflowJq(false, true)).toThrow(
      /^CI requires jq for workflow jq cases/,
    );
  });

  test("annotates a local skip when jq is unavailable", () => {
    const missingJq = workflowJqGateFor(false, false);
    expect(missingJq.kind).toBe("skip");
    if (missingJq.kind === "skip") {
      expect(missingJq.message).toMatch(
        /^SKIP locally: jq is unavailable, so workflow jq cases are skipped/,
      );
    }
  });

  workflowJqTest.each([
    ['{"success": true}', "0", true],
    ['{"success":true}', "0", true],
    ['{"success":false}', "0", false],
    ["invalid-json", "0", false],
    ['{"success":true}', "22", false],
  ])(workflowJqResponseTitle, (response, status, succeeds) => {
    const dir = fixture();
    mkdirSync(join(dir, "purge-urls"));
    writeFileSync(
      join(dir, "purge-urls", "urls.json"),
      JSON.stringify(["https://artagon.com/"]),
    );
    const result = runShell(script, dir, {
      CLOUDFLARE_CACHE_PURGE_TOKEN: "fixture",
      CLOUDFLARE_DNS_ZONE_ID: "fixture",
      MOCK_RESPONSE: String(response),
      MOCK_EXIT: String(status),
      REQUESTS: join(dir, "requests"),
    });
    expect(result.status === 0, result.stderr).toBe(succeeds);
    const request = readFileSync(join(dir, "requests"), "utf8");
    expect(request).toContain('"files":["https://artagon.com/"]');
    expect(request).not.toContain("purge_everything");
  });
});

describe("design drift detection (stubbed GitHub API, no network)", () => {
  test("design drift gate rejects an unlisted CSS token (negative control)", () => {
    const dir = fixture();
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, "public", "assets"), { recursive: true });
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(
      join(dir, "scripts", "check-design-drift.mjs"),
      readFileSync(
        new URL("../scripts/check-design-drift.mjs", import.meta.url),
        "utf8",
      ),
    );
    writeFileSync(
      join(dir, "DESIGN.md"),
      "---\ncolors:\n  bg: '#000000'\ntypography:\nspacing:\nrounded:\n---\n",
    );
    writeFileSync(
      join(dir, "public", "assets", "theme.css"),
      ":root { --unlisted-fixture-token: 1px; }\n",
    );
    writeFileSync(
      join(dir, "docs", "design-md.md"),
      "## 6 · Allow-list for `check:design-drift`\n\n## 7 · Other\n",
    );

    const result = spawnSync(
      "node",
      [join(dir, "scripts", "check-design-drift.mjs")],
      { cwd: dir, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--unlisted-fixture-token");
  });

  test("pre-commit checks design drift when any input is staged", () => {
    const hook = readFileSync(
      new URL("../.husky/pre-commit", import.meta.url),
      "utf8",
    );
    expect(hook).toContain(
      "grep -Eq '^(DESIGN[.]md|public/assets/theme[.]css|docs/design-md[.]md)$'",
    );
    expect(hook).toContain(
      "DESIGN.md/theme.css/docs/design-md.md staged — running check:design-drift",
    );
    expect(hook).toContain("npm run check:design-drift");
  });

  test("fixture checks require a successful install before reporting drift", () => {
    const job = drift.jobs["drift-check"]!;
    expect(step("Install dependencies", job).id).toBe("install");
    const fixtures = job.steps.find((item) =>
      item.name.includes("Run design.md fixture"),
    )!;
    expect(fixtures.if).toBe(
      "${{ !cancelled() && steps.install.outcome == 'success' }}",
    );
  });
  const health = drift.jobs["drift-check"]!.steps.find((item) =>
    item.name.includes("Check upstream"),
  )!.run!;
  const runUpstreamCase = (
    state: string,
    exit: string,
    drifted: boolean,
    stderr: string,
  ) => {
    const dir = fixture();
    const result = runShell(health, dir, {
      MOCK_RESPONSE: JSON.stringify({
        archived: state === "archived",
        pushed_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      }),
      MOCK_EXIT: exit,
      MOCK_STDERR: stderr,
    });
    expect(result.status === 0, result.stderr).toBe(!drifted);
    if (exit !== "0" && !drifted) {
      expect(result.stdout).toContain("::warning::");
      expect(readFileSync(join(dir, "summary"), "utf8")).toContain(
        "unavailable",
      );
      expect(existsSync(join(dir, "env"))).toBe(false);
    }
    if (drifted)
      expect(readFileSync(join(dir, "env"), "utf8")).toContain(
        "UPSTREAM_DRIFTED=true",
      );
    if (state === "healthy")
      expect(result.stdout).not.toContain("Repository is archived");
  };

  workflowJqTest.each([
    ["healthy", "0", false, ""],
    ["archived", "0", true, ""],
  ])("upstream %s", runUpstreamCase);

  test.each([
    ["unavailable", "1", false, "transport error"],
    ["missing", "1", true, "gh: Not Found (HTTP 404)"],
    ["gone", "1", true, "gh: Gone (HTTP 410)"],
    ["server error", "1", false, "gh: Internal Server Error (HTTP 500)"],
    ["service unavailable", "1", false, "gh: Service Unavailable (HTTP 503)"],
    ["rate limited 403", "1", false, "gh: API rate limit exceeded (HTTP 403)"],
    ["rate limited 429", "1", false, "gh: Too Many Requests (HTTP 429)"],
  ])("upstream %s", runUpstreamCase);

  test.each([true, false])("existing drift issue=%s", async (exists) => {
    const issueStep = step(
      "Open tracking issue on drift",
      drift.jobs["drift-check"]!,
    );
    expect(issueStep.if).toContain("env.DRIFT_FINDINGS != ''");
    vi.stubEnv("DRIFT_FINDINGS", "fixture drift");
    const create = vi.fn(async () => ({ data: { number: 1 } }));
    const github = {
      paginate: vi.fn(async () =>
        exists ? [{ title: "[Design.md] Spec drift detected" }] : [],
      ),
      rest: { issues: { listForRepo: vi.fn(), create } },
    };
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    await new AsyncFunction(
      "github",
      "context",
      "core",
      String(issueStep.with?.script),
    )(
      github,
      { repo: { owner: "fixture", repo: "fixture" } },
      { info: vi.fn() },
    );
    expect(create).toHaveBeenCalledTimes(exists ? 0 : 1);
  });
});
