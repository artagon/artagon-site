// USMR 14.38a (site-2m1.38): keep snapshot locators aligned with built routes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { load, type CheerioAPI } from "cheerio";
import ts from "typescript";
import { describe, expect, test } from "vitest";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, ".build", "dist");
const SNAPSHOT_SPECS = [
  join(ROOT, "tests", "styling-snapshots.spec.ts"),
  join(ROOT, "tests", "vision-page.spec.ts"),
];
const HOOK_PATTERN = /#[A-Za-z_][\w-]*|\.[A-Za-z_][\w-]*/g;
const PLAYWRIGHT_ONLY_SELECTOR_PATTERN =
  />>|:has-text\s*\(|:text|:visible|:nth-match\s*\(/;
const NEGATIVE_CONTROL_SELECTOR = "#site-2m1-38-missing-control";
const NON_MATCHING_VISION_SELECTOR =
  "#product-vision .ui-grid:has(.ui-card--domain)";

type SnapshotHook = {
  spec: string;
  testTitle: string;
  route: string;
  selector: string;
  tokens: string[];
};

function callPropertyName(call: ts.CallExpression): string | undefined {
  return ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name.text
    : undefined;
}

function stringValue(node: ts.Expression | undefined): string | undefined {
  if (
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  ) {
    return node.text;
  }
  return undefined;
}

function callExpressions(root: ts.Node): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return calls;
}

function testCallback(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (!ts.isIdentifier(call.expression) || call.expression.text !== "test") {
    return undefined;
  }
  return call.arguments.find(
    (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
  );
}

function routeFromCalls(calls: ts.CallExpression[]): string[] {
  return calls
    .filter((call) => callPropertyName(call) === "goto")
    .map((call) => stringValue(call.arguments[0]))
    .filter((route): route is string => route !== undefined);
}

function snapshotHooksFromSource(
  sourceText: string,
  specPath: string,
): SnapshotHook[] {
  const source = ts.createSourceFile(
    specPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const allCalls = callExpressions(source);
  const fileRoutes = [...new Set(routeFromCalls(allCalls))];
  const hooks: SnapshotHook[] = [];

  for (const call of allCalls) {
    const callback = testCallback(call);
    if (!callback) continue;

    const callbackCalls = callExpressions(callback);
    if (
      !callbackCalls.some(
        (item) => callPropertyName(item) === "toHaveScreenshot",
      )
    ) {
      continue;
    }

    const testTitle =
      stringValue(call.arguments[0]) ??
      call.arguments[0]?.getText(source) ??
      "<unnamed>";
    const localRoutes = [...new Set(routeFromCalls(callbackCalls))];
    const route =
      localRoutes.length === 1
        ? localRoutes[0]
        : fileRoutes.length === 1
          ? fileRoutes[0]
          : undefined;
    if (!route) {
      throw new Error(
        "Cannot determine the built route for snapshot test " +
          testTitle +
          " in " +
          specPath,
      );
    }

    for (const locator of callbackCalls.filter(
      (item) => callPropertyName(item) === "locator",
    )) {
      const argument = locator.arguments[0];
      if (!argument || !ts.isStringLiteral(argument)) {
        throw new Error(
          "Snapshot test " +
            testTitle +
            " in " +
            specPath +
            " has a locator() call whose first argument is not a string literal",
        );
      }
      const selector = argument.text;
      const tokens = selector.match(HOOK_PATTERN) ?? [];
      if (tokens.length === 0) {
        throw new Error(
          "Snapshot test " +
            testTitle +
            " in " +
            specPath +
            " has a locator() selector without an id or class hook: " +
            selector,
        );
      }
      hooks.push({
        spec: specPath,
        testTitle,
        route,
        selector,
        tokens,
      });
    }
  }

  return hooks;
}

function snapshotHooks(specPath: string): SnapshotHook[] {
  return snapshotHooksFromSource(readFileSync(specPath, "utf8"), specPath);
}

function builtPagePath(route: string): string {
  const pathname = (route.split(/[?#]/, 1)[0] ?? "").replace(/^\/+|\/+$/g, "");
  return join(DIST, pathname, "index.html");
}

function builtPageHtml(route: string): CheerioAPI {
  const pagePath = builtPagePath(route);
  if (!existsSync(pagePath)) {
    throw new Error("Built page missing for route " + route + ": " + pagePath);
  }
  return load(readFileSync(pagePath, "utf8"));
}

function assertHooksExist(hooks: SnapshotHook[]): void {
  const parsedPages = new Map<string, CheerioAPI>();
  const missing: string[] = [];
  for (const item of hooks) {
    const pagePath = builtPagePath(item.route);
    let parsed = parsedPages.get(pagePath);
    if (!parsed) {
      parsed = builtPageHtml(item.route);
      parsedPages.set(pagePath, parsed);
    }

    if (PLAYWRIGHT_ONLY_SELECTOR_PATTERN.test(item.selector)) {
      const missingTokens = item.tokens.filter(
        (token) => parsed?.(token).length === 0,
      );
      if (missingTokens.length > 0) {
        missing.push(
          item.spec.replace(ROOT + "/", "") +
            ": " +
            item.testTitle +
            " -> " +
            item.selector +
            " has missing fallback token(s) " +
            missingTokens.join(", ") +
            " on " +
            item.route,
        );
      }
    } else if (parsed(item.selector).length === 0) {
      missing.push(
        item.spec.replace(ROOT + "/", "") +
          ": " +
          item.testTitle +
          " -> " +
          item.selector +
          " matches no element on " +
          item.route,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      "Snapshot selectors are missing from built HTML:\n" + missing.join("\n"),
    );
  }
}

describe("built visual-regression selector hooks", () => {
  test("snapshot selectors match their built routes and retain known anchors", () => {
    expect(
      existsSync(DIST),
      "run npm --ignore-scripts=false run build first",
    ).toBe(true);

    const hooks = SNAPSHOT_SPECS.flatMap(snapshotHooks);
    expect(hooks.length, "expected locators in snapshot tests").toBeGreaterThan(
      0,
    );
    const extractedAnchors = hooks.flatMap((hook) =>
      hook.tokens.map((token) => ({ route: hook.route, token })),
    );
    expect(extractedAnchors).toEqual(
      expect.arrayContaining([
        { route: "/", token: "#playground" },
        { route: "/vision", token: "#executive-summary" },
        { route: "/platform", token: "#pillars" },
      ]),
    );
    expect(() => assertHooksExist(hooks)).not.toThrow();
  });

  test("negative control fails for a missing id selector", () => {
    expect(
      existsSync(DIST),
      "run npm --ignore-scripts=false run build first",
    ).toBe(true);
    expect(() =>
      assertHooksExist([
        {
          spec: "negative-control",
          testTitle: "intentionally missing selector",
          route: "/",
          selector: NEGATIVE_CONTROL_SELECTOR,
          tokens: [NEGATIVE_CONTROL_SELECTOR],
        },
      ]),
    ).toThrow(NEGATIVE_CONTROL_SELECTOR);
  });

  test("negative control rejects a full selector that matches nothing when all tokens exist", () => {
    expect(
      existsSync(DIST),
      "run npm --ignore-scripts=false run build first",
    ).toBe(true);
    const visionHtml = builtPageHtml("/vision");
    const tokens = NON_MATCHING_VISION_SELECTOR.match(HOOK_PATTERN) ?? [];
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((token) => visionHtml(token).length > 0)).toBe(true);
    expect(visionHtml(NON_MATCHING_VISION_SELECTOR).length).toBe(0);
    expect(() =>
      assertHooksExist([
        {
          spec: "negative-control",
          testTitle: "intentionally non-matching composite selector",
          route: "/vision",
          selector: NON_MATCHING_VISION_SELECTOR,
          tokens,
        },
      ]),
    ).toThrow(NON_MATCHING_VISION_SELECTOR);
  });

  test("snapshot extraction fails closed for non-literal locator arguments", () => {
    const source = [
      'test("snapshot extraction control", async ({ page }) => {',
      '  await page.goto("/vision");',
      "  await expect(page).toHaveScreenshot();",
      '  page.locator("#executive-summary");',
      '  const selector = "#roadmap";',
      "  page.locator(selector);",
      "});",
    ].join("\n");
    expect(() =>
      snapshotHooksFromSource(source, "snapshot-extraction-control.spec.ts"),
    ).toThrow(/first argument is not a string literal/);
  });
});
