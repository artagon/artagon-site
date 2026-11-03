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
  versions?: string[];
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

// Any ignore entry at all for a package (all versions, a range, or majors).
function ignoreEntries(update: Update, name: string): Ignore[] {
  return (update.ignore ?? []).filter((ignore) =>
    patternMatches(ignore["dependency-name"], name),
  );
}

const ASTRO_PACKAGES = [
  "astro",
  "@astrojs/mdx",
  "@astrojs/react",
  "@astrojs/rss",
  "@astrojs/sitemap",
  "@astrojs/check",
  "@astrojs/markdown-remark",
];

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

describe("Dependabot npm update policy (USMR 14.83, 14.88)", () => {
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

  // USMR 14.88 (site-yy1): React and Astro are never held back.
  test.each([...REACT_PACKAGES, ...ASTRO_PACKAGES])(
    "does not hold back %s",
    (name) => {
      expect(
        ignoreEntries(npmUpdate, name),
        `${name} must have no ignore entry`,
      ).toEqual([]);
      expect(
        ignoreEntries(legacyNpmUpdate, "astro").length,
        "legacy config negative control",
      ).toBeGreaterThan(0);
    },
  );

  test("groups astro with every @astrojs package, ahead of dev-deps", () => {
    expect(
      ASTRO_PACKAGES.every(
        (name) => firstMatchingGroup(npmUpdate, name) === "astro",
      ),
      "astro and @astrojs/* must first match the astro group",
    ).toBe(true);
    expect(
      npmUpdate.groups?.astro?.["update-types"],
      "majors are included",
    ).toBeUndefined();
    // Negative control: without the group, @astrojs/check falls into dev-deps.
    const { astro: _astro, ...withoutAstro } = npmUpdate.groups ?? {};
    expect(
      firstMatchingGroup(
        { ...npmUpdate, groups: withoutAstro },
        "@astrojs/check",
      ),
    ).toBe("dev-deps");
  });

  test("holds TypeScript only at 7.x, which @astrojs/check cannot accept yet (site-xt4)", () => {
    const entries = ignoreEntries(npmUpdate, "typescript");
    expect(entries).toEqual([
      { "dependency-name": "typescript", versions: [">=7.0.0"] },
    ]);
    expect(
      hasMajorIgnore(npmUpdate, "typescript"),
      "TypeScript 6 must not be blocked",
    ).toBe(false);
  });

  test("retains the semver-major ignore for @playwright/test", () => {
    expect(hasMajorIgnore(npmUpdate, "@playwright/test")).toBe(true);
    expect(
      hasMajorIgnore(
        withoutIgnore(npmUpdate, "@playwright/test"),
        "@playwright/test",
      ),
      "removal negative control",
    ).toBe(false);
  });
});
