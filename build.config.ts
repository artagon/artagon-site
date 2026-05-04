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

const raw: unknown = JSON.parse(
  readFileSync(join(__dirname, "build.config.json"), "utf8"),
);
assertPaths(raw, "");

// `as const` would preserve literal-string types here, but `JSON.parse`
// returns a freshly-typed `any` and `as const` cannot narrow runtime values
// to literals. Consumers needing literal types should re-derive locally
// (e.g. `const DIST = ".build/dist" as const`); the BUILD object holds the
// canonical strings as `string` and that's adequate for outDir/cacheDir
// use sites which already accept `string`.
export const BUILD: DeepReadonly<BuildPaths> = raw as DeepReadonly<BuildPaths>;
