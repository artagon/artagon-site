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

const data = JSON.parse(
  readFileSync(join(__dirname, "build.config.json"), "utf8"),
) as BuildPaths;

// Validate at module-load time; throws if shape drifts.
const _validate: BuildPaths = data satisfies BuildPaths;

export const BUILD: DeepReadonly<BuildPaths> = data;
