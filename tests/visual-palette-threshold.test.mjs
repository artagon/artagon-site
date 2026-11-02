// USMR 14.89 (site-ukx): exercise the real screenshot policy without a browser.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { VISUAL_SCREENSHOT_POLICY } from "./helpers/visual-screenshot-policy.ts";

const require = createRequire(import.meta.url);
const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(TESTS_DIR);
const coreRoot = dirname(require.resolve("playwright-core/package.json"));
// These are the pinned runner's own PNG codec and comparator. Missing private
// modules must fail the test so upgrades cannot silently substitute an engine.
const { getComparator } = require(
  join(coreRoot, "lib/server/utils/comparators.js"),
);
const { PNG } = require(join(coreRoot, "lib/utilsBundle.js"));
const compare = getComparator("image/png");
// Importing the whole runner config races the build-config test's temporary
// invalid root JSON. Read the same policy constant without loading build paths.
const policy = VISUAL_SCREENSHOT_POLICY;
assert.ok(policy, "the shared screenshot policy must be configured");

// USMR 14.89: keep the shared policy wired globally and forbid per-spec tolerance overrides.
const FORBIDDEN_SCREENSHOT_OPTIONS = new Set([
  "threshold",
  "maxDiffPixelRatio",
  "maxDiffPixels",
]);

function parseTypeScript(sourceText, fileName) {
  return ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function propertyName(name) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (
    ts.isComputedPropertyName(name) &&
    ts.isStringLiteralLike(name.expression)
  ) {
    return name.expression.text;
  }
  return undefined;
}

function objectProperty(object, expectedName) {
  if (!ts.isObjectLiteralExpression(object)) return undefined;
  return object.properties.find(
    (property) => property.name && propertyName(property.name) === expectedName,
  );
}

function callPropertyName(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text;
  }
  return undefined;
}

function visitNodes(root, visit) {
  const walk = (node) => {
    visit(node);
    ts.forEachChild(node, walk);
  };
  walk(root);
}

function policyConfigErrors(sourceText) {
  const source = parseTypeScript(sourceText, "playwright.config.ts");
  const exportedConfig = source.statements.find(ts.isExportAssignment);
  const configCall = exportedConfig?.expression;
  if (
    !configCall ||
    !ts.isCallExpression(configCall) ||
    !ts.isIdentifier(configCall.expression) ||
    configCall.expression.text !== "defineConfig"
  ) {
    return ["playwright.config.ts default export must be a defineConfig call"];
  }

  const config = configCall.arguments[0];
  if (!config || !ts.isObjectLiteralExpression(config)) {
    return ["playwright.config.ts default config must be an object literal"];
  }
  const expectProperty = objectProperty(config, "expect");
  if (!expectProperty || !ts.isPropertyAssignment(expectProperty)) {
    return ["playwright.config.ts default config must define expect"];
  }
  const screenshotPolicy = objectProperty(
    expectProperty.initializer,
    "toHaveScreenshot",
  );
  return screenshotPolicy &&
    ts.isPropertyAssignment(screenshotPolicy) &&
    ts.isIdentifier(screenshotPolicy.initializer) &&
    screenshotPolicy.initializer.text === "VISUAL_SCREENSHOT_POLICY"
    ? []
    : [
        "playwright.config.ts default config must set expect.toHaveScreenshot to VISUAL_SCREENSHOT_POLICY",
      ];
}

function variableInitializers(source) {
  const initializers = new Map();
  visitNodes(source, (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      initializers.set(node.name.text, node.initializer);
    }
  });
  return initializers;
}

function screenshotOptionOverrides(sourceText, fileName) {
  const source = parseTypeScript(sourceText, fileName);
  const initializers = variableInitializers(source);
  const findings = [];

  function inspectOptions(expression, seen = new Set()) {
    if (ts.isIdentifier(expression)) {
      if (seen.has(expression.text)) {
        findings.push(
          `${fileName}: cyclic screenshot options cannot be inspected`,
        );
        return;
      }
      const initializer = initializers.get(expression.text);
      if (initializer) {
        const nextSeen = new Set(seen);
        nextSeen.add(expression.text);
        inspectOptions(initializer, nextSeen);
      } else {
        findings.push(
          `${fileName}: screenshot options alias ${expression.text} cannot be inspected`,
        );
      }
      return;
    }
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression)
    ) {
      inspectOptions(expression.expression, seen);
      return;
    }
    if (ts.isCallExpression(expression)) {
      const callee = expression.expression;
      const isObjectAssign =
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === "assign" &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "Object";
      if (isObjectAssign) {
        for (const argument of expression.arguments) {
          inspectOptions(argument, seen);
        }
        return;
      }
    }
    if (!ts.isObjectLiteralExpression(expression)) {
      findings.push(
        `${fileName}: screenshot options are not statically inspectable`,
      );
      return;
    }

    for (const property of expression.properties) {
      const name = property.name ? propertyName(property.name) : undefined;
      if (name && FORBIDDEN_SCREENSHOT_OPTIONS.has(name)) {
        findings.push(`${fileName}: ${name} is set in a toHaveScreenshot call`);
      }
      if (
        property.name &&
        ts.isComputedPropertyName(property.name) &&
        !ts.isStringLiteralLike(property.name.expression)
      ) {
        findings.push(
          `${fileName}: computed screenshot option names cannot be inspected`,
        );
      }
      if (ts.isSpreadAssignment(property)) {
        inspectOptions(property.expression, seen);
      }
    }
  }

  function isScreenshotName(expression) {
    return (
      ts.isStringLiteralLike(expression) ||
      ts.isTemplateExpression(expression) ||
      ts.isRegularExpressionLiteral(expression) ||
      ts.isArrayLiteralExpression(expression)
    );
  }

  visitNodes(source, (node) => {
    if (
      !ts.isCallExpression(node) ||
      callPropertyName(node.expression) !== "toHaveScreenshot"
    ) {
      return;
    }

    if (node.arguments.some(ts.isSpreadElement)) {
      findings.push(
        `${fileName}: spread screenshot arguments cannot be inspected`,
      );
      return;
    }
    if (node.arguments.length > 1) {
      for (const argument of node.arguments.slice(1)) {
        inspectOptions(argument);
      }
      return;
    }

    const argument = node.arguments[0];
    if (!argument || isScreenshotName(argument)) return;
    if (ts.isIdentifier(argument)) {
      const initializer = initializers.get(argument.text);
      if (initializer && isScreenshotName(initializer)) return;
    }
    inspectOptions(argument);
  });

  return findings;
}

function screenshotSpecOverrides(specSources) {
  return specSources.flatMap(({ fileName, sourceText }) =>
    screenshotOptionOverrides(sourceText, fileName),
  );
}

function screenshotSpecFiles(directory = TESTS_DIR) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return screenshotSpecFiles(path);
    return entry.isFile() && entry.name.endsWith(".spec.ts") ? [path] : [];
  });
}

test("screenshot specs use the global policy without per-call tolerance overrides", () => {
  const config = readFileSync(join(ROOT, "playwright.config.ts"), "utf8");
  assert.deepEqual(policyConfigErrors(config), []);

  const specSources = screenshotSpecFiles().map((filePath) => ({
    fileName: relative(ROOT, filePath),
    sourceText: readFileSync(filePath, "utf8"),
  }));
  assert.ok(specSources.length > 0, "expected tests/**/*.spec.ts files");
  assert.deepEqual(screenshotSpecOverrides(specSources), []);
});

test("policy guard rejects an unused config when the default export is unconfigured", () => {
  const brokenConfig = `
    const unused = defineConfig({ expect: { toHaveScreenshot: VISUAL_SCREENSHOT_POLICY } });
    export default defineConfig({ expect: {} });
  `;
  assert.match(policyConfigErrors(brokenConfig).join("\n"), /default config/);
});

for (const option of FORBIDDEN_SCREENSHOT_OPTIONS) {
  test(`screenshot override guard rejects an in-memory ${option} override`, () => {
    const brokenSpec = `await expect(page).toHaveScreenshot("home.png", { ${option}: 0.2 });`;
    assert.match(
      screenshotOptionOverrides(brokenSpec, "negative-control.spec.ts").join(
        "\n",
      ),
      new RegExp(option),
    );
  });
}

test("screenshot override guard follows option aliases and Object.assign", () => {
  const brokenSpec = `
    const base = { maxDiffPixels: 500 };
    const alias = base;
    await expect(page).toHaveScreenshot("home.png", alias);
    await expect(page).toHaveScreenshot("home-2.png", Object.assign({}, { threshold: 0.2 }));
  `;
  const findings = screenshotOptionOverrides(
    brokenSpec,
    "negative-control.spec.ts",
  );
  assert.match(findings.join("\n"), /maxDiffPixels/);
  assert.match(findings.join("\n"), /threshold/);
});

// Historical site-g3f fixtures stay fixed across future palette/baseline updates.
const SURFACE_PAIRS = [
  { token: "--bg", before: "#07090c", after: "#000808" },
  { token: "--bg-1", before: "#0d1013", after: "#020e0e" },
  { token: "--bg-2", before: "#14161a", after: "#061414" },
  { token: "--line", before: "#27292d", after: "#182727" },
  { token: "--line-soft", before: "#181b1e", after: "#0a1919" },
];

function rgba(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

function swatch(hex, width = 32, height = 32) {
  const image = new PNG({ width, height });
  const color = rgba(hex);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data.set(color, offset);
  }
  return image;
}

function patchedSwatch(size) {
  const image = swatch(SURFACE_PAIRS[0].before, 100, 100);
  const color = rgba(SURFACE_PAIRS[0].after);
  for (let y = 10; y < 10 + size; y++) {
    for (let x = 10; x < 10 + size; x++) {
      image.data.set(color, (y * image.width + x) * 4);
    }
  }
  return PNG.sync.write(image);
}

test("screenshot policy pins color sensitivity, pixel budget, and animations", () => {
  assert.deepEqual(policy, {
    threshold: 0.01,
    maxDiffPixelRatio: 0.001,
    animations: "disabled",
  });
});

for (const { token, before, after } of SURFACE_PAIRS) {
  const expected = PNG.sync.write(swatch(before));
  const actual = PNG.sync.write(swatch(after));

  test(`${token}: identical images pass the configured policy`, () => {
    assert.equal(compare(expected, expected, policy), null);
  });

  test(`${token}: legacy threshold misses the historical palette shift`, () => {
    assert.equal(
      compare(actual, expected, { ...policy, threshold: 0.2 }),
      null,
    );
  });

  test(`${token}: configured policy rejects the historical palette shift`, () => {
    const result = compare(actual, expected, policy);
    assert.ok(result, `${token} shift must exceed the configured tolerance`);
    assert.match(result.errorMessage, /1024 pixels .* are different/);
  });
}

test("pixel budget permits a 4-pixel patch below the 10-pixel allowance", () => {
  const expected = PNG.sync.write(swatch(SURFACE_PAIRS[0].before, 100, 100));
  const actual = patchedSwatch(2);
  const zeroBudget = compare(actual, expected, {
    ...policy,
    maxDiffPixelRatio: 0,
  });
  assert.ok(zeroBudget, "the patch must produce real mismatched pixels");
  assert.match(zeroBudget.errorMessage, /4 pixels .* are different/);
  assert.equal(compare(actual, expected, policy), null);
});

test("pixel budget rejects a 16-pixel patch above the 10-pixel allowance", () => {
  const expected = PNG.sync.write(swatch(SURFACE_PAIRS[0].before, 100, 100));
  const actual = patchedSwatch(4);
  const result = compare(actual, expected, policy);
  assert.ok(result, "the patch must exceed the configured pixel budget");
  assert.match(result.errorMessage, /16 pixels .* are different/);
  assert.equal(
    compare(actual, expected, { ...policy, maxDiffPixelRatio: 1 }),
    null,
  );
});
