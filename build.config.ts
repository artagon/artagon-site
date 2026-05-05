import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuildPaths {
  root: string;
  cache: {
    astro: string;
    content: string;
    lhci: string;
    lychee: string;
    playwright: string;
    "playwright-mcp": string;
  };
  reports: {
    playwright: { results: string; html: string };
    lhci: string;
    coverage: string;
  };
  dist: string;
}

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

const PATH_REGEX = /^\.build\/[a-z0-9/_-]+$/;

// Walk the parsed JSON and validate every leaf string. Mirrors the regex
// the sync-build-config.mjs generator enforces, so a drifted JSON fails
// loudly at module-load instead of silently typing leaves as `string`
// while runtime values may be undefined or not match `^.build/...`.
function assertPaths(node: unknown, trail: string): void {
  if (typeof node === "string") {
    // `root` is `.build` (no trailing slash); other leaves match the regex.
    if (trail === "root") {
      if (node !== ".build") {
        throw new Error(
          `build.config.json: root must equal ".build", got ${JSON.stringify(node)}`,
        );
      }
      return;
    }
    if (!PATH_REGEX.test(node)) {
      throw new Error(
        `build.config.json: invalid path at ${trail}: ${JSON.stringify(node)} (must match ${PATH_REGEX})`,
      );
    }
    return;
  }
  if (node === null || typeof node !== "object") {
    throw new Error(
      `build.config.json: expected object or string at ${trail}, got ${typeof node}`,
    );
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    assertPaths(v, trail ? `${trail}.${k}` : k);
  }
}

// Required key tree, mirroring the BuildPaths interface. Used to verify
// presence of every leaf — assertPaths only checks that EXISTING leaves
// are valid, not that all REQUIRED leaves are present. Without this
// check a missing key (e.g. cache.playwright dropped from the JSON)
// would type as `string` at compile time while being `undefined` at
// runtime — exactly the kind of unsoundness `as DeepReadonly<BuildPaths>`
// papers over.
const REQUIRED_SHAPE = {
  root: null,
  cache: {
    astro: null,
    content: null,
    lhci: null,
    lychee: null,
    playwright: null,
    "playwright-mcp": null,
  },
  reports: {
    playwright: { results: null, html: null },
    lhci: null,
    coverage: null,
  },
  dist: null,
} as const;

type ShapeNode = { readonly [k: string]: ShapeNode | null };

function assertShape(node: unknown, shape: ShapeNode, trail: string): void {
  if (node === null || typeof node !== "object") {
    throw new Error(
      `build.config.json: expected object at ${trail || "<root>"}, got ${typeof node}`,
    );
  }
  const obj = node as Record<string, unknown>;
  for (const [k, child] of Object.entries(shape)) {
    if (!(k in obj)) {
      throw new Error(
        `build.config.json: missing required key ${trail ? `${trail}.${k}` : k}`,
      );
    }
    if (child === null) {
      // Leaf — must be a string (assertPaths separately validates regex).
      if (typeof obj[k] !== "string") {
        throw new Error(
          `build.config.json: expected string at ${trail ? `${trail}.${k}` : k}, got ${typeof obj[k]}`,
        );
      }
    } else {
      assertShape(obj[k], child, trail ? `${trail}.${k}` : k);
    }
  }
}

const raw: unknown = JSON.parse(
  readFileSync(join(__dirname, "build.config.json"), "utf8"),
);
assertShape(raw, REQUIRED_SHAPE, "");
assertPaths(raw, "");

// `as const` would preserve literal-string types here, but `JSON.parse`
// returns a freshly-typed `any` and `as const` cannot narrow runtime values
// to literals. Consumers needing literal types should re-derive locally
// (e.g. `const DIST = ".build/dist" as const`); the BUILD object holds the
// canonical strings as `string` and that's adequate for outDir/cacheDir
// use sites which already accept `string`.
export const BUILD: DeepReadonly<BuildPaths> = raw as DeepReadonly<BuildPaths>;
