import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";

export type IncludeFile = (filePath: string) => boolean;
export type ExcludeDirectory = (
  directoryPath: string,
  directoryName: string,
) => boolean;

/** Return matching files in stable order, with optional directory pruning. */
export function walkFiles(
  root: string,
  includeFile: IncludeFile = () => true,
  excludeDirectory: ExcludeDirectory = () => false,
  recursive = true,
): string[] {
  if (!existsSync(root)) return [];

  const files: string[] = [];
  const visit = (directory: string): void => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    );

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (recursive && !excludeDirectory(fullPath, entry.name)) {
          visit(fullPath);
        }
      } else if (entry.isFile() && includeFile(fullPath)) {
        files.push(fullPath);
      }
    }
  };

  visit(root);
  return files;
}

export interface StyleSource {
  filePath: string;
  relativePath: string;
  source: string;
  css: string;
}

/** Discover CSS and Astro scoped-style sources beneath the requested roots. */
export function discoverStyleSources(
  root: string,
  sourceRoots: readonly string[],
): StyleSource[] {
  return sourceRoots
    .flatMap((sourceRoot) =>
      walkFiles(join(root, sourceRoot), (file) => /\.(astro|css)$/.test(file)),
    )
    .map((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const css = filePath.endsWith(".css")
        ? source
        : [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
            .map((match) => match[1]!)
            .join("\n");
      return { filePath, relativePath: relative(root, filePath), source, css };
    });
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Resolve `*` and `?` in the final path segment against the repository. */
export function resolveWildcard(root: string, literal: string): boolean {
  const directory = join(root, dirname(literal));
  const pattern = basename(literal);
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return false;
  }

  const matcher = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return readdirSync(directory).some((entry) => matcher.test(entry));
}

export interface PathCitationPolicy {
  pathPrefixes: readonly string[];
  rootFiles?: readonly string[];
  rootAliases?: readonly string[];
  allowPaths?: readonly string[];
  allowPrefixes?: readonly string[];
  allowTokens?: readonly string[];
  skipPlaceholders?: boolean;
  skipDateTemplates?: boolean;
  skipBracePatterns?: boolean;
  skipRecursiveGlobs?: boolean;
  stripAtAlias?: boolean;
  normalizeWrappedComments?: boolean;
}

export interface PathCitationSource {
  name: string;
  files: () => string[];
  policy: PathCitationPolicy;
}

const COMMON_PATH_PREFIXES = [
  "src/",
  "tests/",
  "scripts/",
  "public/",
  ".github/",
  "docs/",
  "openspec/",
  "rules/",
  "new-design/",
  ".claude/",
  ".agents/",
] as const;

const COMMON_POLICY = {
  pathPrefixes: COMMON_PATH_PREFIXES,
  skipPlaceholders: true,
  skipDateTemplates: true,
  skipBracePatterns: true,
  skipRecursiveGlobs: true,
} satisfies PathCitationPolicy;

const README_ROOT_FILES = [
  "astro.config.ts",
  "build.config.json",
  "build.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "lighthouserc.json",
  "lychee.toml",
  "vitest.config.ts",
  "playwright.config.ts",
  "skills-lock.json",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "COPILOT.md",
  "DESIGN.md",
  "README.md",
  ".nvmrc",
  ".gitignore",
  ".gitattributes",
  ".mcp.json",
  "sgconfig.yml",
] as const;

/** The former per-document gates now share one explicit policy table. */
export function pathCitationSources(root: string): readonly PathCitationSource[] {
  const oneFile = (relativePath: string): (() => string[]) =>
    () => [join(root, relativePath)];
  const yamlFiles = (directory: string): (() => string[]) =>
    () =>
      walkFiles(
        join(root, directory),
        (file) => /\.(yml|yaml)$/.test(file),
      );

  return [
    {
      name: "AGENTS.md and docs/agents/*.md",
      files: () => [
        realpathSync(join(root, "AGENTS.md")),
        ...walkFiles(
          join(root, "docs", "agents"),
          (file) => file.endsWith(".md"),
          () => false,
          false,
        ),
      ],
      policy: {
        ...COMMON_POLICY,
        stripAtAlias: true,
        // Historical citation explains that this guide moved into opsx skills.
        allowPaths: ["openspec/AGENTS.md"],
        // These are external trees on contributor machines, absent in CI.
        allowPrefixes: ["new-design/", ".claude/skills/"],
      },
    },
    {
      name: "README.md",
      files: oneFile("README.md"),
      policy: {
        ...COMMON_POLICY,
        rootFiles: README_ROOT_FILES,
        // The README explains the old .mjs spelling while naming the current .ts file.
        rootAliases: ["astro.config.mjs"],
        allowPaths: ["astro.config.mjs"],
        allowPrefixes: ["new-design/", ".claude/skills/"],
      },
    },
    {
      name: "docs/CONTRIBUTING.md",
      files: oneFile("docs/CONTRIBUTING.md"),
      policy: COMMON_POLICY,
    },
    {
      name: "openspec/contributing.md",
      files: oneFile("openspec/contributing.md"),
      policy: {
        ...COMMON_POLICY,
        // Explicitly disclosed tutorial examples, not live change paths.
        allowTokens: [
          "add-two-factor-auth",
          "<change-id>",
          "<spec-id>",
          "<capability>",
          "<your-change-id>",
        ],
      },
    },
    {
      name: "openspec/specs/**/spec.md",
      files: () =>
        walkFiles(
          join(root, "openspec", "specs"),
          (file) => basename(file) === "spec.md",
        ),
      policy: {
        ...COMMON_POLICY,
        pathPrefixes: ["src/", "tests/", "scripts/", "public/"],
      },
    },
    {
      name: "docs/AUTOMATED_TESTING.md",
      files: oneFile("docs/AUTOMATED_TESTING.md"),
      policy: {
        ...COMMON_POLICY,
        // Astro v5 -> v6 migration narrative retained in this guide.
        allowPaths: ["src/content/config.ts"],
      },
    },
    {
      name: "docs/build-artifacts.md",
      files: oneFile("docs/build-artifacts.md"),
      policy: COMMON_POLICY,
    },
    {
      name: "docs/guides/new-design-conversion.md",
      files: oneFile("docs/guides/new-design-conversion.md"),
      policy: {
        ...COMMON_POLICY,
        // Planned font destination and archived roadmap stylesheet are explained in prose.
        allowPaths: ["public/assets/fonts/", "public/assets/roadmap.css"],
        allowPrefixes: ["new-design/", ".claude/skills/"],
      },
    },
    {
      name: "docs/guides/styling-guide.md",
      files: oneFile("docs/guides/styling-guide.md"),
      policy: COMMON_POLICY,
    },
    {
      name: ".github/workflows/*.yml",
      files: yamlFiles(".github/workflows"),
      policy: {
        ...COMMON_POLICY,
        // Past-tense rename explanation in pr-spec-compliance.yml.
        allowPaths: [".github/workflows/spec-compliance.yml"],
        normalizeWrappedComments: true,
      },
    },
    {
      name: ".github/ISSUE_TEMPLATE/*.yml",
      files: yamlFiles(".github/ISSUE_TEMPLATE"),
      policy: COMMON_POLICY,
    },
    {
      name: "Copilot instruction docs",
      files: () => [
        join(root, "COPILOT.md"),
        join(root, ".github", "copilot-instructions.md"),
        join(root, ".github", "copilot-review-instructions.md"),
      ],
      policy: COMMON_POLICY,
    },
  ];
}

/** Check source existence and citations for one row in the policy table. */
export function inspectPathCitationSource(
  root: string,
  source: PathCitationSource,
): string[] {
  const files = source.files();
  if (files.length === 0) {
    return [`${source.name}: expected at least one source file`];
  }

  const missingSources = files
    .filter((file) => !existsSync(file))
    .map((file) => `${source.name}: missing source ${relative(root, file)}`);
  const drifts = files
    .filter((file) => existsSync(file))
    .flatMap((file) =>
      findPathCitationDrifts(
        root,
        relative(root, file),
        readFileSync(file, "utf8"),
        source.policy,
      ),
    );
  return [...missingSources, ...drifts];
}

/** Return unresolved path citations from a backticked prose source. */
export function findPathCitationDrifts(
  root: string,
  sourceLabel: string,
  body: string,
  policy: PathCitationPolicy,
): string[] {
  const withoutFences = body.replace(/```[\s\S]*?```/g, "");
  const drifts: string[] = [];

  for (const match of withoutFences.matchAll(/`([^`]+)`/g)) {
    let raw = match[1]!;
    if (policy.normalizeWrappedComments) {
      raw = raw.replace(/\n\s*#\s*/g, "").replace(/\n\s*/g, "");
    }
    raw = raw.replace(/[,.;:)]+$/, "").trim();

    const pathCandidate = policy.stripAtAlias && raw.startsWith("@/")
      ? raw.slice(2)
      : raw;
    const recognized =
      policy.pathPrefixes.some((prefix) => pathCandidate.startsWith(prefix)) ||
      policy.rootFiles?.includes(pathCandidate) === true ||
      policy.rootAliases?.includes(pathCandidate) === true;
    if (!recognized) continue;

    if (policy.skipPlaceholders && /<[^>]+>/.test(raw)) continue;
    if (policy.skipDateTemplates && raw.includes("YYYY-MM-DD")) continue;
    if (policy.skipBracePatterns && /[{}]/.test(raw)) continue;
    if (policy.skipRecursiveGlobs && raw.includes("**")) continue;
    if (policy.allowTokens?.some((token) => raw.includes(token))) continue;

    let cleaned = raw.split(":")[0]!;
    if (policy.stripAtAlias && cleaned.startsWith("@/")) {
      cleaned = cleaned.slice(2);
    }
    if (policy.allowPaths?.includes(cleaned)) continue;
    if (policy.allowPrefixes?.some((prefix) => cleaned.startsWith(prefix))) {
      continue;
    }

    if (/[*?\[]/.test(cleaned)) {
      if (!resolveWildcard(root, cleaned)) {
        drifts.push(`${sourceLabel}: ${cleaned}`);
      }
      continue;
    }

    if (!existsSync(join(root, cleaned))) {
      drifts.push(`${sourceLabel}: ${cleaned}`);
    }
  }

  return drifts;
}
