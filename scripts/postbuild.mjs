import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// BUILD 2.1: preserve the original stage order and complete npm script bodies.
export const POSTBUILD_STAGES = [
  { name: "verify:prerequisites", command: "npm", args: ["run", "verify:prerequisites"], npmCommand: "npm run verify:prerequisites" },
  { name: "verify:design-prerequisites", command: "npm", args: ["run", "verify:design-prerequisites"], npmCommand: "npm run verify:design-prerequisites" },
  { name: "lint:tokens", command: "npm", args: ["run", "lint:tokens"], npmCommand: "npm run lint:tokens" },
  { name: "verify-font-self-hosting.mjs", command: process.execPath, args: ["scripts/verify-font-self-hosting.mjs"] },
  { name: "minify-theme-css.mjs", command: process.execPath, args: ["scripts/minify-theme-css.mjs"] },
  { name: "sri.mjs", command: process.execPath, args: ["scripts/sri.mjs"] },
  { name: "csp.mjs", command: process.execPath, args: ["scripts/csp.mjs"] },
  { name: "lint:skip-link", command: "npm", args: ["run", "lint:skip-link"], npmCommand: "npm run lint:skip-link" },
  { name: "lint:taglines", command: "npm", args: ["run", "lint:taglines"], npmCommand: "npm run lint:taglines" },
  { name: "lint:design", command: "npm", args: ["run", "lint:design"], npmCommand: "npm run lint:design" },
  { name: "lint:design-md-uniqueness", command: "npm", args: ["run", "lint:design-md-uniqueness"], npmCommand: "npm run lint:design-md-uniqueness" },
  { name: "verify:indexation", command: "npm", args: ["run", "verify:indexation"], npmCommand: "npm run verify:indexation" },
];

const elapsedMs = (start) => Number((process.hrtime.bigint() - start) / 1_000_000n);

export function runPostbuild(stages = POSTBUILD_STAGES) {
  const totalStart = process.hrtime.bigint();
  let attempted = 0;
  for (const stage of stages) {
    attempted++;
    const start = process.hrtime.bigint();
    const result = spawnSync(stage.command, stage.args, {
      stdio: "inherit",
      // Windows needs cmd.exe to launch npm.cmd. Arguments are fixed stage data.
      shell: process.platform === "win32" && stage.command === "npm",
    });
    console.log(`[postbuild] ${stage.name} (${elapsedMs(start)}ms)`);
    if (result.error || result.signal || result.status !== 0) {
      console.error(`[postbuild] ${stage.name} failed: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}`);
      console.log(`[postbuild] attempted ${attempted} stages in ${elapsedMs(totalStart)}ms`);
      return result.error || result.signal ? 1 : (result.status ?? 1);
    }
  }
  console.log(`[postbuild] completed ${stages.length} stages in ${elapsedMs(totalStart)}ms`);
  return 0;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  process.exitCode = runPostbuild();
}
