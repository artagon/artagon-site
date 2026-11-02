#!/usr/bin/env node
/**
 * verify-stack.mjs — stack-contract gate behind the artagon-stack-guard skill.
 *
 * OpenSpec: add-agent-skills-supply-chain (task 3.2). Prints the installed
 * stack (from package.json, package-lock.json and .nvmrc) and fails on
 * patterns the stack contract forbids: APIs Astro removed, and Tailwind or
 * Starlight adoption that has not gone through OpenSpec (ADR 0001;
 * openspec/changes/adopt-tailwind-and-starlight/).
 *
 * Scanned: src/**, astro.config.*, public/assets/*.css, package.json, and a
 * root tailwind.config.*. Documentation, tests, skills and openspec/ are not
 * scanned: they may name these patterns to forbid them.
 *
 * Usage: node scripts/verify-stack.mjs [--root <repo>] [--json]
 *
 * Exit codes:
 *   0 — stack contract holds
 *   1 — findings (each printed as `<path>:<line>: <code>: <detail>`)
 *   2 — usage or IO error (bad flag, unreadable or malformed package.json)
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stderr, stdout } from "node:process";

const SCANNED_EXT = /\.(astro|mdx?|ts|tsx|mts|js|mjs|jsx|css)$/;

export const RULES = [
  {
    code: "removed-api",
    re: /\bAstro\.glob\s*\(/,
    detail:
      "Astro.glob() was removed; use content collections or import.meta.glob()",
  },
  {
    code: "removed-api",
    re: /<ViewTransitions\b/,
    detail:
      "<ViewTransitions /> was removed; client routing needs a spec change here",
  },
  {
    code: "tailwind",
    re: /@tailwind\s+(base|components|utilities)\b/,
    detail: "Tailwind directive; ADR 0001",
  },
  {
    code: "tailwind",
    re: /@import\s+["']tailwindcss["']/,
    detail: "Tailwind import; ADR 0001",
  },
];

export const FORBIDDEN_DEPS = [
  { re: /^tailwindcss$/, detail: "Tailwind is not adopted (ADR 0001)" },
  { re: /^@tailwindcss\//, detail: "Tailwind is not adopted (ADR 0001)" },
  { re: /^@astrojs\/tailwind$/, detail: "Tailwind is not adopted (ADR 0001)" },
  {
    re: /^@astrojs\/starlight$/,
    detail: "Starlight is only proposed (adopt-tailwind-and-starlight)",
  },
];

const REPORTED_PACKAGES = /^(astro|react|react-dom|@astrojs\/.+)$/;

function parseArgs(args) {
  const opts = { root: null, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") opts.json = true;
    else if (a === "--root") {
      const v = args[++i];
      if (!v) return { ok: false, error: "--root needs a path" };
      opts.root = v;
    } else if (a.startsWith("--root=")) opts.root = a.slice("--root=".length);
    else return { ok: false, error: `unknown argument: ${a}` };
  }
  return { ok: true, value: opts };
}

function readJson(path) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { ok: false, error: `${path}: ${e.message}` };
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && SCANNED_EXT.test(ent.name)) out.push(p);
  }
  return out;
}

export function verifyStack(root) {
  const pkgPath = join(root, "package.json");
  const pkg = readJson(pkgPath);
  if (!pkg.ok) return pkg;
  const deps = {
    ...(pkg.value.dependencies ?? {}),
    ...(pkg.value.devDependencies ?? {}),
  };

  const installed = {};
  const lockPath = join(root, "package-lock.json");
  const lock = existsSync(lockPath)
    ? readJson(lockPath)
    : { ok: true, value: {} };
  if (!lock.ok) return lock;
  for (const name of Object.keys(deps)
    .filter((n) => REPORTED_PACKAGES.test(n))
    .sort()) {
    installed[name] =
      lock.value.packages?.[`node_modules/${name}`]?.version ??
      `${deps[name]} (declared)`;
  }
  const nvmrc = join(root, ".nvmrc");
  if (existsSync(nvmrc)) installed.node = readFileSync(nvmrc, "utf8").trim();

  const findings = [];
  for (const [name] of Object.entries(deps)) {
    const hit = FORBIDDEN_DEPS.find((d) => d.re.test(name));
    if (hit)
      findings.push({
        where: "package.json",
        code: "dependency",
        detail: `${name}: ${hit.detail}`,
      });
  }
  for (const f of readdirSync(root)) {
    if (/^tailwind\.config\.(js|cjs|mjs|ts|cts|mts)$/.test(f)) {
      findings.push({
        where: f,
        code: "tailwind",
        detail: "Tailwind config file; ADR 0001",
      });
    }
  }
  const files = [
    ...walk(join(root, "src")),
    ...walk(join(root, "public", "assets")).filter((p) => p.endsWith(".css")),
    ...readdirSync(root)
      .filter((f) => /^astro\.config\.(mjs|js|ts|mts)$/.test(f))
      .map((f) => join(root, f)),
  ];
  for (const abs of files) {
    const rel = relative(root, abs).split(sep).join("/");
    readFileSync(abs, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const r of RULES)
          if (r.re.test(line))
            findings.push({
              where: `${rel}:${i + 1}`,
              code: r.code,
              detail: r.detail,
            });
      });
  }
  return { ok: true, value: { installed, findings, scanned: files.length } };
}

function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.ok) {
    stderr.write(
      `verify-stack: ${args.error}\nusage: node scripts/verify-stack.mjs [--root <repo>] [--json]\n`,
    );
    exit(2);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(args.value.root ?? join(here, ".."));
  const result = verifyStack(root);
  if (!result.ok) {
    stderr.write(`verify-stack: ${result.error}\n`);
    exit(2);
  }
  const { installed, findings, scanned } = result.value;
  if (args.value.json) {
    stdout.write(
      JSON.stringify(
        { ok: findings.length === 0, installed, scanned, findings },
        null,
        2,
      ) + "\n",
    );
  } else {
    for (const [k, v] of Object.entries(installed))
      stdout.write(`installed ${k} ${v}\n`);
    for (const f of findings)
      stdout.write(`${f.where}: ${f.code}: ${f.detail}\n`);
    stderr.write(
      `verify-stack: ${scanned} files scanned, ${findings.length} finding(s)\n`,
    );
  }
  exit(findings.length === 0 ? 0 : 1);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(argv[1] ?? "")) main();
