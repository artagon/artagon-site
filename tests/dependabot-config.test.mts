// USMR 14.83 (site-o6a): guard Dependabot grouping and incompatible major ignores.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const config = parse(
  readFileSync(new URL(".github/dependabot.yml", root), "utf8"),
) as DependabotConfig;
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const npmUpdate = config.updates.find(
  (update) => update["package-ecosystem"] === "npm",
);

if (!npmUpdate)
  throw new Error("Dependabot npm update configuration is missing");

type Group = {
  patterns?: string[];
  "exclude-patterns"?: string[];
  "dependency-type"?: "development" | "production";
  "update-types"?: string[];
};

type Ignore = {
  "dependency-name": string;
  "update-types"?: string[];
};

type Update = {
  "package-ecosystem": string;
  groups?: Record<string, Group>;
  ignore?: Ignore[];
};

type DependabotConfig = { updates: Update[] };

const REACT_PACKAGES = [
  "react",
  "react-dom",
  "@types/react",
  "@types/react-dom",
];
const MAJOR = "version-update:semver-major";

function dependencyType(
  name: string,
): "development" | "production" | undefined {
  if (Object.hasOwn(packageJson.dependencies ?? {}, name)) return "production";
  if (Object.hasOwn(packageJson.devDependencies ?? {}, name)) {
    return "development";
  }
  return undefined;
}

function patternMatches(pattern: string, name: string): boolean {
  const wildcard = pattern.indexOf("*");
  if (wildcard < 0) return pattern === name;
  return (
    name.startsWith(pattern.slice(0, wildcard)) &&
    name.endsWith(pattern.slice(wildcard + 1))
  );
}

function groupMatches(group: Group, name: string): boolean {
  const type = dependencyType(name);
  if (group["dependency-type"] && group["dependency-type"] !== type) {
    return false;
  }
  const included =
    group.patterns === undefined ||
    group.patterns.some((pattern) => patternMatches(pattern, name));
  const excluded = (group["exclude-patterns"] ?? []).some((pattern) =>
    patternMatches(pattern, name),
  );
  return included && !excluded;
}

function firstMatchingGroup(update: Update, name: string): string | undefined {
  return Object.entries(update.groups ?? {}).find(([, group]) =>
    groupMatches(group, name),
  )?.[0];
}

function hasMajorIgnore(update: Update, name: string): boolean {
  return (update.ignore ?? []).some(
    (ignore) =>
      patternMatches(ignore["dependency-name"], name) &&
      ignore["update-types"]?.includes(MAJOR),
  );
}

function withoutIgnore(update: Update, name: string): Update {
  return {
    ...update,
    ignore: (update.ignore ?? []).filter(
      (ignore) => !patternMatches(ignore["dependency-name"], name),
    ),
  };
}

// Captures the npm policy before USMR 14.83 (site-o6a).
const legacyNpmUpdate: Update = {
  "package-ecosystem": "npm",
  groups: { "dev-deps": { "dependency-type": "development" } },
  ignore: [
    { "dependency-name": "astro", "update-types": [MAJOR] },
    { "dependency-name": "@playwright/test", "update-types": [MAJOR] },
  ],
};

describe("Dependabot npm update policy (USMR 14.83)", () => {
  test("groups all React packages first for every dependency type", () => {
    const reactGroup = npmUpdate.groups?.react;
    const validReactGroup =
      reactGroup !== undefined &&
      JSON.stringify([...(reactGroup.patterns ?? []).slice().sort()]) ===
        JSON.stringify([...REACT_PACKAGES].sort()) &&
      reactGroup["dependency-type"] === undefined &&
      reactGroup["update-types"] === undefined &&
      REACT_PACKAGES.every(
        (name) => firstMatchingGroup(npmUpdate, name) === "react",
      );

    expect(
      validReactGroup,
      "the four React runtime and type packages must first match the unfiltered react group",
    ).toBe(true);

    // Negative controls: the old dev-deps-only policy and a misplaced React group fail.
    expect(
      REACT_PACKAGES.every(
        (name) => firstMatchingGroup(legacyNpmUpdate, name) === "react",
      ),
      "legacy config negative control",
    ).toBe(false);
    expect(
      firstMatchingGroup(
        {
          ...npmUpdate,
          groups: {
            "dev-deps": { "dependency-type": "development" },
            ...(reactGroup ? { react: reactGroup } : {}),
          },
        },
        "@types/react",
      ),
      "group-order negative control",
    ).not.toBe("react");
    expect(
      firstMatchingGroup(
        {
          ...npmUpdate,
          groups: {
            react: {
              patterns: REACT_PACKAGES,
              "exclude-patterns": ["@types/react"],
            },
            "dev-deps": { "dependency-type": "development" },
          },
        },
        "@types/react",
      ),
      "excluded React package negative control",
    ).not.toBe("react");
  });

  test.each([
    ["typescript", "TypeScript major upgrades are tracked by site-xt4"],
    ["@astrojs/mdx", "@astrojs major upgrades are tracked by site-yy1"],
  ])("ignores semver-major updates for %s", (name, reason) => {
    expect(hasMajorIgnore(npmUpdate, name), reason).toBe(true);
    expect(
      hasMajorIgnore(legacyNpmUpdate, name),
      `${name} legacy config negative control`,
    ).toBe(false);
  });

  test.each([
    ["astro", "the existing Astro major ignore remains"],
    ["@playwright/test", "the existing Playwright major ignore remains"],
  ])("retains the semver-major ignore for %s", (name, reason) => {
    expect(hasMajorIgnore(npmUpdate, name), reason).toBe(true);
    expect(
      hasMajorIgnore(withoutIgnore(npmUpdate, name), name),
      `${name} removal negative control`,
    ).toBe(false);
  });
});
