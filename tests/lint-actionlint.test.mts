import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const workflowsDir = join(repoRoot, ".github", "workflows");
const actionlintProbe = spawnSync("actionlint", ["-version"], {
  encoding: "utf8",
});
const probeError: NodeJS.ErrnoException | undefined = actionlintProbe.error;
const actionlintAvailable = probeError?.code !== "ENOENT";
const shellcheckProbe = spawnSync("shellcheck", ["--version"], {
  encoding: "utf8",
});
const shellcheckProbeError: NodeJS.ErrnoException | undefined =
  shellcheckProbe.error;
const shellcheckAvailable = shellcheckProbeError?.code !== "ENOENT";
const missingTools = [
  ...(actionlintAvailable ? [] : ["actionlint"]),
  ...(shellcheckAvailable ? [] : ["shellcheck"]),
];
const missingToolsMessage =
  missingTools.length > 0
    ? `SKIP: ${missingTools.join(" and ")} ${missingTools.length === 1 ? "is" : "are"} absent from PATH. CI may not install these tools, so this gate is explicitly skipped.`
    : undefined;

function runActionlint(files: string[], cwd: string) {
  return spawnSync("actionlint", ["-no-color", ...files], {
    cwd,
    encoding: "utf8",
  });
}

test("all GitHub workflow YAML files pass actionlint and its shellcheck rules", async ({
  annotate,
  skip,
}) => {
  if (missingToolsMessage) {
    await annotate(missingToolsMessage, "warning");
    skip(missingToolsMessage);
    return;
  }

  expect(actionlintProbe.error, actionlintProbe.stderr).toBeUndefined();
  expect(actionlintProbe.status, actionlintProbe.stderr).toBe(0);
  expect(shellcheckProbe.error, shellcheckProbe.stderr).toBeUndefined();
  expect(shellcheckProbe.status, shellcheckProbe.stderr).toBe(0);

  const workflowFiles = readdirSync(workflowsDir)
    .filter((file) => file.endsWith(".yml"))
    .sort()
    .map((file) => join(".github", "workflows", file));
  const result = runActionlint(workflowFiles, repoRoot);
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);

  const scratchDir = mkdtempSync(join(tmpdir(), "site-actionlint-negative-"));
  try {
    expect(scratchDir.startsWith(repoRoot)).toBe(false);

    const specWorkflow = readFileSync(
      join(workflowsDir, "pr-spec-compliance.yml"),
      "utf8",
    );
    const marker = "    runs-on: ubuntu-latest\n";
    expect(specWorkflow).toContain(marker);
    const invalidJobEnv =
      "    env:\n      SPEC_VALIDATION_PATH: ${{ runner.temp }}/spec-validation.json\n";
    const invalidSpecWorkflow = specWorkflow.replace(
      marker,
      `${marker}${invalidJobEnv}`,
    );
    expect(invalidSpecWorkflow).not.toBe(specWorkflow);

    const invalidSpecPath = join(scratchDir, "pr-spec-compliance.yml");
    writeFileSync(invalidSpecPath, invalidSpecWorkflow);
    const invalidSpecResult = runActionlint([invalidSpecPath], scratchDir);
    const invalidSpecOutput = `${invalidSpecResult.stdout}${invalidSpecResult.stderr}`;
    expect(invalidSpecResult.error, invalidSpecOutput).toBeUndefined();
    expect(invalidSpecResult.status, invalidSpecOutput).not.toBe(0);
    expect(invalidSpecOutput).toContain("runner");

    const playwrightWorkflow = readFileSync(
      join(workflowsDir, "playwright.yml"),
      "utf8",
    );
    const splitAssignment =
      `          PLAYWRIGHT_HTML_OUTPUT_DIR="$(node --input-type=module -e 'import { BUILD } from "./build.config.ts"; process.stdout.write(BUILD.reports.playwright.html)')"\n` +
      "          export PLAYWRIGHT_HTML_OUTPUT_DIR";
    const maskedAssignment =
      `          export PLAYWRIGHT_HTML_OUTPUT_DIR="$(node --input-type=module -e 'import { BUILD } from "./build.config.ts"; process.stdout.write(BUILD.reports.playwright.html)')"`;
    expect(playwrightWorkflow).toContain(splitAssignment);
    const shellcheckWorkflow = playwrightWorkflow.replace(
      splitAssignment,
      maskedAssignment,
    );
    expect(shellcheckWorkflow).not.toBe(playwrightWorkflow);

    const shellcheckPath = join(scratchDir, "playwright.yml");
    writeFileSync(shellcheckPath, shellcheckWorkflow);
    const shellcheckResult = runActionlint([shellcheckPath], scratchDir);
    const shellcheckOutput = `${shellcheckResult.stdout}${shellcheckResult.stderr}`;
    expect(shellcheckResult.error, shellcheckOutput).toBeUndefined();
    expect(shellcheckResult.status, shellcheckOutput).not.toBe(0);
    expect(shellcheckOutput).toContain("SC2155");
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
});
