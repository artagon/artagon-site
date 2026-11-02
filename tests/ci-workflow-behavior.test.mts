// USMR 14.38/14.40/14.51/14.52/14.67: exercise workflow logic without network or browsers.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  symlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { parse } from "yaml";
import { BUILD } from "../build.config.ts";

type Step = {
  id?: string;
  name: string;
  run?: string;
  if?: string;
  uses?: string;
  env?: Record<string, string>;
  "continue-on-error"?: boolean | string;
  "timeout-minutes"?: number;
  with?: Record<string, unknown>;
};
type Job = {
  container?: { image?: string };
  "continue-on-error"?: boolean | string;
  env?: Record<string, string>;
  if?: string;
  permissions?: Record<string, string>;
  steps: Step[];
  needs?: string[];
  outputs?: Record<string, string>;
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
    expect(compare["continue-on-error"]).toBeUndefined();
    expect(compare.permissions?.contents).toBe("read");
    expect(compare.if).toContain("!= 'workflow_dispatch'");
    expect(step("Checkout code", compare).with?.["persist-credentials"]).toBe(
      false,
    );
    const update = playwright.jobs["update-snapshots"]!;
    expect(update.if).toContain("== 'workflow_dispatch'");
    expect(update.if).toContain("refs/heads/main");
    expect(update.permissions?.contents).toBe("write");
    expect(compare.container?.image).toBeTruthy();
    expect(update.container?.image).toBe(compare.container?.image);
    const comparison = step(
      "Run visual regression tests (compare-only)",
      compare,
    );
    expect(comparison["continue-on-error"]).toBeUndefined();
    expect(comparison.env?.VISUAL_REGRESSION).toBe("1");
    const compareCommand = comparison.run!;
    expect(compareCommand).toContain("--fail-on-flaky-tests");
    expect(comparison.run?.match(/--project=\S+/g)).toEqual([
      "--project=chromium",
    ]);
    const diffUpload = step("Upload visual diffs", compare);
    expect(["failure()", "always()"]).toContain(diffUpload.if);
    const updateCommand = step(
      "Run visual regression tests (update snapshots)",
      update,
    ).run!;
    const compareCommandWithoutFlakyOption = compareCommand.replace(
      " --fail-on-flaky-tests",
      "",
    );
    expect(updateCommand).toBe(
      `${compareCommandWithoutFlakyOption} --update-snapshots`,
    );
    expect(updateCommand).not.toContain("--fail-on-flaky-tests");
    expect(updateCommand.match(/--project=\S+/g)).toEqual([
      "--project=chromium",
    ]);
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

// modernize-build-pipeline 3.3 (site-j2l.4): exercise the producer contract and real CLI.
describe("same-run build artifact routing", () => {
  const producer = playwright.jobs.build!;
  const consumers = ["test", "visual-regression", "accessibility"];

  test("builds once in the read-only pinned container and binds upload outputs", () => {
    expect(producer.permissions).toEqual({ contents: "read" });
    expect(producer.container?.image).toBe(
      playwright.jobs.test!.container?.image,
    );
    expect(step("Setup Node.js", producer).with?.["node-version-file"]).toBe(
      ".nvmrc",
    );
    expect(step("Install dependencies", producer).run).toBe("npm ci");
    expect(step("Build site", producer).run).toBe("npm run build");
    expect(step("Write build provenance", producer)).toMatchObject({
      id: "provenance",
      run: "node scripts/verify-build-provenance.mjs --write",
    });
    const upload = step("Upload built site", producer);
    expect(upload.id).toBe("upload-dist");
    expect(upload.uses).toBe(
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    );
    expect(upload.with).toEqual({
      name: "playwright-dist-${{ github.run_id }}-${{ github.run_attempt }}",
      path: `${BUILD.dist}/\n${BUILD.reports.buildProvenance}/provenance.json\n`,
      "include-hidden-files": true,
      "if-no-files-found": "error",
      "retention-days": 1,
    });
    expect(producer.outputs).toEqual({
      "artifact-id": "${{ steps.upload-dist.outputs.artifact-id }}",
      "producer-run-attempt":
        "${{ steps.provenance.outputs.producer-run-attempt }}",
      "manifest-sha256": "${{ steps.provenance.outputs.manifest-sha256 }}",
    });
    const names = producer.steps.map(({ name }) => name);
    expect(names.indexOf("Build site")).toBeLessThan(
      names.indexOf("Write build provenance"),
    );
    expect(names.indexOf("Write build provenance")).toBeLessThan(
      names.indexOf("Upload built site"),
    );
    expect(
      producer.steps.filter(({ run }) => run === "npm run build"),
    ).toHaveLength(1);
  });

  test.each(consumers)(
    "%s verifies exact producer bytes before any suite",
    (name) => {
      const job = playwright.jobs[name]!;
      expect(job.needs).toEqual(["build"]);
      expect(job.permissions).toEqual({ contents: "read" });
      expect(job.container?.image).toBe(producer.container?.image);
      expect(
        job.steps.some(({ run }) => /npm\s+run\s+build/.test(run ?? "")),
      ).toBe(false);
      const download = step("Download built site", job);
      expect(download.uses).toBe(
        "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
      );
      expect(download.with).toEqual({
        "artifact-ids": "${{ needs.build.outputs.artifact-id }}",
        path: BUILD.root,
      });
      const verify = step("Verify build provenance", job);
      expect(verify.run).toBe(
        "node scripts/verify-build-provenance.mjs --verify",
      );
      expect(verify.env).toEqual({
        EXPECTED_PRODUCER_RUN_ATTEMPT:
          "${{ needs.build.outputs.producer-run-attempt }}",
        EXPECTED_MANIFEST_SHA256: "${{ needs.build.outputs.manifest-sha256 }}",
      });
      expect(verify.if).toBeUndefined();
      expect(verify["continue-on-error"]).toBeUndefined();
      const names = job.steps.map(({ name }) => name);
      const verifyIndex = names.indexOf(verify.name);
      expect(names.indexOf(download.name)).toBeLessThan(verifyIndex);
      for (const [index, item] of job.steps.entries()) {
        if (/npm run test:|npx playwright test/.test(item.run ?? ""))
          expect(index).toBeGreaterThan(verifyIndex);
      }
    },
  );

  test("trusted snapshot updates, deployment and Lighthouse keep independent builds", () => {
    for (const job of [
      playwright.jobs["update-snapshots"]!,
      deploy.jobs.build!,
      workflow("lighthouse").jobs.lhci!,
    ]) {
      expect(step("Build site", job).run).toBe("npm run build");
      expect(job.needs).toBeUndefined();
      expect(job.steps.some(({ name }) => name === "Download built site")).toBe(
        false,
      );
    }
    expect(playwright.jobs["update-snapshots"]!.if).toContain(
      "refs/heads/main",
    );
  });
});

describe("offline report merge after shard failure (modernize-build-pipeline 3.3)", () => {
  test.each(["success", "failure"])(
    "retains reports when test is %s before final enforcement",
    (testResult) => {
      const job = playwright.jobs["merge-reports"]!;
      const needs = {
        build: { result: "success" },
        test: { result: testResult },
      };
      for (const name of [
        "Download all reports",
        "Merge reports",
        "Upload merged report",
      ]) {
        const condition = step(name, job).if!;
        expect(
          runInNewContext(condition.slice(3, -2), {
            needs,
            cancelled: () => false,
          }),
        ).toBe(true);
        expect(
          runInNewContext(condition.slice(3, -2), {
            needs,
            cancelled: () => true,
          }),
        ).toBe(false);
        expect(
          runInNewContext(condition.slice(3, -2), {
            needs: { ...needs, build: { result: "failure" } },
            cancelled: () => false,
          }),
        ).toBe(false);
        expect(
          runInNewContext(condition.slice(3, -2), {
            needs: { ...needs, test: { result: "skipped" } },
            cancelled: () => false,
          }),
        ).toBe(false);
      }
      const dir = fixture();
      copyFileSync(
        new URL("../build.config.ts", import.meta.url),
        join(dir, "build.config.ts"),
      );
      copyFileSync(
        new URL("../build.config.json", import.meta.url),
        join(dir, "build.config.json"),
      );
      mkdirSync(join(dir, BUILD.reports.playwright.blob), { recursive: true });
      writeFileSync(
        join(dir, BUILD.reports.playwright.blob, "fixture.zip"),
        "offline CLI input",
      );
      writeFileSync(
        join(dir, "npx"),
        `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
fs.writeFileSync(process.env.MERGE_CALL, JSON.stringify(process.argv.slice(2)));
fs.mkdirSync(process.env.PLAYWRIGHT_HTML_OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(process.env.PLAYWRIGHT_HTML_OUTPUT_DIR, 'index.html'), 'offline merged report');
`,
        { mode: 0o755 },
      );
      const result = runShell(step("Merge reports", job).run!, dir, {
        MERGE_CALL: join(dir, "merge-call"),
      });
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(readFileSync(join(dir, "merge-call"), "utf8"))).toEqual(
        [
          "--no-install",
          "playwright",
          "merge-reports",
          "--reporter",
          "html",
          BUILD.reports.playwright.blob,
        ],
      );
      expect(
        existsSync(join(dir, BUILD.reports.playwright.html, "index.html")),
      ).toBe(true);
      expect(job.steps.at(-1)?.name).toBe(
        "Enforce upstream build and browser job success",
      );
    },
  );
});

const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
function provenanceFixture() {
  const dir = fixture();
  mkdirSync(join(dir, "scripts"));
  copyFileSync(
    new URL("../scripts/verify-build-provenance.mjs", import.meta.url),
    join(dir, "scripts/verify-build-provenance.mjs"),
  );
  copyFileSync(
    new URL("../build.config.ts", import.meta.url),
    join(dir, "build.config.ts"),
  );
  copyFileSync(
    new URL("../build.config.json", import.meta.url),
    join(dir, "build.config.json"),
  );
  writeFileSync(join(dir, "package-lock.json"), '{"lockfileVersion":3}\n');
  writeFileSync(join(dir, "astro.config.ts"), "export default {};\n");
  for (const leaf of ["assets", ".well-known"])
    mkdirSync(join(dir, BUILD.dist, leaf), { recursive: true });
  writeFileSync(
    join(dir, BUILD.dist, "index.html"),
    "<!doctype html><h1>fixture</h1>\n",
  );
  writeFileSync(
    join(dir, BUILD.dist, "assets/theme.css"),
    "body { display: block }\n",
  );
  writeFileSync(
    join(dir, BUILD.dist, ".well-known/probe.txt"),
    "hidden output\n",
  );
  const env = {
    GITHUB_SHA: "a".repeat(40),
    GITHUB_RUN_ID: "12345",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_OUTPUT: join(dir, "outputs"),
    EXPECTED_PRODUCER_RUN_ATTEMPT: "1",
    EXPECTED_MANIFEST_SHA256: "",
  };
  function run(mode: string, overrides: Record<string, string> = {}) {
    return spawnSync(
      process.execPath,
      ["scripts/verify-build-provenance.mjs", mode],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ...env, ...overrides },
      },
    );
  }
  const result = run("--write");
  expect(result.status, result.stderr).toBe(0);
  const manifestPath = join(
    dir,
    BUILD.reports.buildProvenance,
    "provenance.json",
  );
  env.EXPECTED_MANIFEST_SHA256 = digest(readFileSync(manifestPath));
  function tamperManifest(change: (manifest: Record<string, unknown>) => void) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
    change(manifest);
    writeFileSync(manifestPath, JSON.stringify(manifest));
    // Independently refresh the outer digest so each inner binding is actually exercised.
    env.EXPECTED_MANIFEST_SHA256 = digest(readFileSync(manifestPath));
  }
  return { dir, env, manifestPath, run, tamperManifest };
}

describe("build provenance executable controls", () => {
  test("writes exact metadata, recursive hidden-file hashes and independent job outputs", () => {
    const f = provenanceFixture();
    const manifest = JSON.parse(readFileSync(f.manifestPath, "utf8"));
    expect(manifest).toMatchObject({
      sha: f.env.GITHUB_SHA,
      runId: "12345",
      producerRunAttempt: "1",
      nodeVersion: process.version,
    });
    expect(Object.keys(manifest.inputDigests).sort()).toEqual([
      "astro.config.ts",
      "build.config.json",
      "package-lock.json",
    ]);
    for (const [path, value] of Object.entries(manifest.inputDigests))
      expect(value).toBe(digest(readFileSync(join(f.dir, path))));
    expect(Object.keys(manifest.distFiles).sort()).toEqual([
      ".well-known/probe.txt",
      "assets/theme.css",
      "index.html",
    ]);
    for (const [path, value] of Object.entries(manifest.distFiles))
      expect(value).toBe(digest(readFileSync(join(f.dir, BUILD.dist, path))));
    expect(readFileSync(f.env.GITHUB_OUTPUT, "utf8")).toBe(
      `producer-run-attempt=1\nmanifest-sha256=${f.env.EXPECTED_MANIFEST_SHA256}\n`,
    );
    expect(existsSync(join(f.dir, BUILD.dist, "provenance.json"))).toBe(false);
    expect(f.run("--verify").status).toBe(0);
  });

  test("partial consumer rerun binds to attempt 1 output, despite consumer attempt 2", () => {
    const f = provenanceFixture();
    const result = f.run("--verify", { GITHUB_RUN_ATTEMPT: "2" });
    expect(result.status, result.stderr).toBe(0);
  });

  test.each(["sha", "runId", "producerRunAttempt", "nodeVersion"])(
    "rejects tampered manifest %s independently of its digest",
    (key) => {
      const f = provenanceFixture();
      f.tamperManifest((manifest) => {
        manifest[key] = "tampered";
      });
      const result = f.run("--verify");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Provenance ${key} mismatch`);
    },
  );

  test.each([
    "EXPECTED_PRODUCER_RUN_ATTEMPT",
    "EXPECTED_MANIFEST_SHA256",
    "GITHUB_SHA",
    "GITHUB_RUN_ID",
  ])("rejects mismatched expected %s", (key) => {
    const f = provenanceFixture();
    const value = key.includes("SHA")
      ? "b".repeat(key === "GITHUB_SHA" ? 40 : 64)
      : "2";
    expect(f.run("--verify", { [key]: value }).status).toBe(1);
  });

  test.each([
    "EXPECTED_PRODUCER_RUN_ATTEMPT",
    "EXPECTED_MANIFEST_SHA256",
    "GITHUB_SHA",
    "GITHUB_RUN_ID",
  ])("rejects missing %s instead of accepting absent bindings", (key) => {
    const f = provenanceFixture();
    expect(f.run("--verify", { [key]: "" }).status).toBe(1);
  });

  test.each(["package-lock.json", "build.config.json", "astro.config.ts"])(
    "rejects tampered %s digest and changed checkout bytes",
    (path) => {
      const f = provenanceFixture();
      f.tamperManifest((manifest) => {
        (manifest.inputDigests as Record<string, string>)[path] = "0".repeat(
          64,
        );
      });
      let result = f.run("--verify");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Input digest mismatch: ${path}`);
      f.tamperManifest((manifest) => {
        (manifest.inputDigests as Record<string, string>)[path] = digest(
          readFileSync(join(f.dir, path)),
        );
      });
      writeFileSync(
        join(f.dir, path),
        `${readFileSync(join(f.dir, path), "utf8")}\n`,
      );
      result = f.run("--verify");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Input digest mismatch: ${path}`);
    },
  );

  test.each([
    "manifest missing",
    "manifest malformed",
    "manifest bytes",
    "dist missing",
    "file missing",
    "file changed",
    "file injected",
    "symlink injected",
  ])("fails closed: %s", (control) => {
    const f = provenanceFixture();
    if (control === "manifest missing") rmSync(f.manifestPath);
    if (control === "manifest malformed") {
      writeFileSync(f.manifestPath, "invalid JSON");
      f.env.EXPECTED_MANIFEST_SHA256 = digest(readFileSync(f.manifestPath));
    }
    if (control === "manifest bytes")
      writeFileSync(
        f.manifestPath,
        `${readFileSync(f.manifestPath, "utf8")}\n`,
      );
    if (control === "dist missing")
      rmSync(join(f.dir, BUILD.dist), { recursive: true });
    if (control === "file missing")
      rmSync(join(f.dir, BUILD.dist, "assets/theme.css"));
    if (control === "file changed")
      writeFileSync(join(f.dir, BUILD.dist, "index.html"), "tampered");
    if (control === "file injected")
      writeFileSync(join(f.dir, BUILD.dist, "extra.txt"), "injected");
    if (control === "symlink injected")
      symlinkSync(
        join(f.dir, "package-lock.json"),
        join(f.dir, BUILD.dist, "link"),
      );
    expect(f.run("--verify").status).toBe(1);
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
    expect(step("Verify ShellCheck", job).run).toContain(
      "shellcheck --version",
    );
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
