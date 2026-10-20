// USMR 14.73 (site-2m1.73): compile embedded scripts with the action's bindings.
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parseDocument } from "yaml";

const workflows = new URL("../.github/workflows/", import.meta.url);
const injected = ["github", "context", "core", "glob", "io", "exec", "require"];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function compileScript(script: string) {
  // Lexical bindings also reject var/function redeclarations that JS parameters allow.
  return new AsyncFunction(
    "bindings",
    `const { ${injected.join(", ")} } = bindings;\n${script}`,
  );
}

describe("workflow YAML and github-script syntax", () => {
  for (const file of readdirSync(workflows).filter((f) => /\.ya?ml$/.test(f))) {
    test(file, () => {
      const doc = parseDocument(readFileSync(new URL(file, workflows), "utf8"));
      expect(doc.errors).toEqual([]);
      const workflow = doc.toJS();
      for (const job of Object.values(workflow.jobs) as {
        steps?: { uses?: string; with?: { script?: string } }[];
      }[]) {
        for (const step of job.steps ?? []) {
          if (step.uses?.startsWith("actions/github-script@")) {
            expect(() => compileScript(step.with?.script ?? "")).not.toThrow();
          }
        }
      }
    });
  }

  test.each(injected)(
    "rejects redeclaring injected %s (negative control)",
    (binding) => {
      for (const declaration of [
        `const ${binding} = {};`,
        `var ${binding};`,
        `function ${binding}() {}`,
      ]) {
        expect(() => compileScript(declaration)).toThrow(SyntaxError);
      }
    },
  );
});
