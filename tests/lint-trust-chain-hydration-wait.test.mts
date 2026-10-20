// USMR 14.74 (site-2m1.74): guard TrustChain interactions against lost pre-hydration input.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { walkFiles } from "./helpers/lint-discovery.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TESTS_DIR = join(ROOT, "tests");
const TRUST_CHAIN_SELECTOR =
  /\.trust-chain__(?:stage|scenario)(?:[-\w]*)|#trust-chain-[\w-]+/;
const TRUST_CHAIN_INTERACTIONS = new Set(["click", "tap", "focus", "hover"]);

function testCallName(expression: ts.Expression): string[] {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (ts.isCallExpression(expression)) return testCallName(expression.expression);
  if (ts.isPropertyAccessExpression(expression)) {
    return [...testCallName(expression.expression), expression.name.text];
  }
  return [];
}

function isTestCaseCall(node: ts.CallExpression): boolean {
  const parts = testCallName(node.expression);
  if (!["test", "it", "specify"].includes(parts[0] ?? "")) return false;
  return parts.length === 1 ||
    (parts.length === 2 &&
      ["skip", "only", "fixme", "fails", "each"].includes(parts[1]!));
}

function findMissingHydrationWaits(
  fileName: string,
  source: string,
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const failures: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isTestCaseCall(node)) {
      const callback = [...node.arguments]
        .reverse()
        .find(
          (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
            ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
        );
      if (callback && ts.isBlock(callback.body)) {
        let hasTrustChainSelector = false;
        let firstInteraction = Number.POSITIVE_INFINITY;
        let hydrationHelperCall = Number.POSITIVE_INFINITY;
        const inspectBody = (bodyNode: ts.Node): void => {
          if (
            ts.isStringLiteralLike(bodyNode) &&
            TRUST_CHAIN_SELECTOR.test(bodyNode.text)
          ) {
            hasTrustChainSelector = true;
          }
          if (ts.isCallExpression(bodyNode)) {
            const callName = testCallName(bodyNode.expression);
            const method = callName[callName.length - 1];
            if (TRUST_CHAIN_INTERACTIONS.has(method ?? "")) {
              firstInteraction = Math.min(
                firstInteraction,
                bodyNode.expression.getStart(sourceFile),
              );
            }
            if (
              callName.length === 1 &&
              callName[0] === "waitForTrustChainHydration"
            ) {
              hydrationHelperCall = Math.min(
                hydrationHelperCall,
                bodyNode.getStart(sourceFile),
              );
            }
          }
          ts.forEachChild(bodyNode, inspectBody);
        };
        inspectBody(callback.body);
        if (
          hasTrustChainSelector &&
          Number.isFinite(firstInteraction) &&
          hydrationHelperCall > firstInteraction
        ) {
          const title = node.arguments[0];
          const testName =
            title && ts.isStringLiteralLike(title) ? title.text : "unnamed test";
          failures.push(
            `${fileName} > ${testName}: waitForTrustChainHydration must precede the first TrustChain interaction`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return failures;
}

describe("TrustChain interaction hydration waits", () => {
  test("rejects a stage interaction without the hydration helper (negative control)", () => {
    const brokenSpec = `
      test("tap stage", async ({ page }) => {
        await page.locator(".trust-chain__stage").tap();
      });
      test("focus scenario after helper", async ({ page }) => {
        await page.locator(".trust-chain__scenario-dot").focus();
        await waitForTrustChainHydration(page);
      });
    `;

    expect(findMissingHydrationWaits("fixture.spec.ts", brokenSpec)).toEqual([
      "fixture.spec.ts > tap stage: waitForTrustChainHydration must precede the first TrustChain interaction",
      "fixture.spec.ts > focus scenario after helper: waitForTrustChainHydration must precede the first TrustChain interaction",
    ]);
  });

  test("every TrustChain interaction waits for island hydration", () => {
    const specs = walkFiles(TESTS_DIR, (filePath) => filePath.endsWith(".spec.ts"));
    const failures = specs.flatMap((filePath) =>
      findMissingHydrationWaits(
        filePath.slice(ROOT.length + 1),
        readFileSync(filePath, "utf8"),
      ),
    );

    expect(failures).toEqual([]);
  });
});
