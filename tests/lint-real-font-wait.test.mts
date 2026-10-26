import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, test } from "vitest";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = join(TESTS_DIR, "helpers", "real-fonts.ts");

function parseWaitForFunctionPredicates(
  source: string,
  fileName: string,
): {
  calls: number;
  diagnostics: readonly ts.Diagnostic[];
  predicates: ts.Expression[];
} {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const parseResult = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.Latest },
    reportDiagnostics: true,
  });
  const predicates: ts.Expression[] = [];
  let calls = 0;

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "waitForFunction"
    ) {
      calls += 1;
      const predicate = node.arguments[0];
      if (predicate) predicates.push(predicate);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return {
    calls,
    diagnostics: parseResult.diagnostics ?? [],
    predicates,
  };
}

function isFunctionPredicate(
  predicate: ts.Expression | undefined,
): predicate is ts.ArrowFunction | ts.FunctionExpression {
  return (
    predicate !== undefined &&
    (ts.isArrowFunction(predicate) || ts.isFunctionExpression(predicate))
  );
}

function isAsyncPredicate(predicate: ts.Expression | undefined): boolean {
  if (!isFunctionPredicate(predicate)) return false;
  return (
    ts
      .getModifiers(predicate)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ??
    false
  );
}

test("real-font wait uses a synchronous waitForFunction predicate", () => {
  const source = readFileSync(HELPER_PATH, "utf8");
  const scan = parseWaitForFunctionPredicates(source, HELPER_PATH);

  expect(scan.diagnostics).toEqual([]);
  expect(scan.calls).toBe(1);
  expect(scan.predicates).toHaveLength(1);
  expect(isFunctionPredicate(scan.predicates[0])).toBe(true);
  expect(isAsyncPredicate(scan.predicates[0])).toBe(false);
});

test("the AST check detects an async waitForFunction predicate", () => {
  const scan = parseWaitForFunctionPredicates(
    "page.waitForFunction(async () => true);",
    "negative-control.ts",
  );

  expect(scan.diagnostics).toEqual([]);
  expect(scan.calls).toBe(1);
  expect(scan.predicates).toHaveLength(1);
  expect(isFunctionPredicate(scan.predicates[0])).toBe(true);
  expect(isAsyncPredicate(scan.predicates[0])).toBe(true);
});
