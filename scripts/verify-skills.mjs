#!/usr/bin/env node
/**
 * verify-skills.mjs — agent-skill supply-chain gate.
 *
 * OpenSpec: add-agent-skills-supply-chain (tasks 2.1–2.4). The skill tree
 * under `.agents/skills/` is executable supply-chain input for every agent
 * that works in this repo, so its provenance and content are checked here,
 * in CI, and never left to a skill to police itself.
 *
 * Checks, per `skills-lock.json` (format: docs/agents/skills-supply-chain.md):
 *   1. Accounting. Every directory under `.agents/skills/` is either a lock
 *      entry or listed in `unlocked` with a reason. Lock entries must exist
 *      on disk.
 *   2. Integrity. An entry with `files` (relative path -> sha256) must match
 *      the disk exactly: no hash drift, no missing file, no unlisted file.
 *      Third-party entries without `files` (the legacy `npx skills` entries)
 *      are reported as `legacy` and not hash-checked. Repo-authored skills
 *      (`sourceType: "local"`) are reviewed through git and carry no hashes.
 *   3. Content (every skill directory, locked or not): hidden Unicode
 *      (zero-width, bidi controls, tag characters) and long base64 runs.
 *   4. Declared class (entries that declare `execution` / `network`):
 *      a script, binary or hook manifest raises the minimum execution class;
 *      a mutable `@latest` reference, or a fetch/download/package-runner
 *      instruction, needs a network class other than "none". A reviewed
 *      hit (sample code, not an agent action) is listed in the entry's
 *      `acknowledged` map ("path:line" or "path:*" -> reason); an
 *      acknowledgement that no longer matches anything is itself a finding.
 *
 * Usage: node scripts/verify-skills.mjs [--root <repo>] [--json]
 *
 * Exit codes:
 *   0 — clean
 *   1 — findings (each printed as `<skill>: <code>: <detail>`)
 *   2 — usage or IO error (bad flag, unreadable or malformed lock file)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stdout, stderr } from "node:process";

const EXECUTION_RANK = { "text-only": 0, script: 1, binary: 2, hook: 3 };
const NETWORK_KEYWORDS = ["none", "docs-only", "arbitrary"];

// Zero-width, bidi embedding/override/isolate controls, BOM/ZWNBSP, tag chars.
const HIDDEN_UNICODE = /[​-‍⁠⁦-⁩‪-‮﻿]|[\u{E0000}-\u{E007F}]/u;
const BASE64_RUN = /[A-Za-z0-9+/]{200,}={0,2}/;
const SCRIPT_EXT =
  /\.(sh|bash|zsh|fish|js|mjs|cjs|ts|mts|py|rb|pl|ps1|cmd|bat)$/i;
const HOOK_FILE = /(^|\/)(hooks\.json|hooks\/[^/]+\.json)$/i;
const PLUGIN_MANIFEST =
  /(^|\/)(plugin\.json|marketplace\.json|settings(\.local)?\.json)$/i;
const MUTABLE_REF = /@latest\b/;
// An instruction an agent would run that reaches the network, in any file.
const NETWORK_ACTION =
  /\b(curl|wget|npx|pnpx|bunx|WebFetch)\b|\bgit\s+clone\b|\bpip\s+install\b|\bnpm\s+(i|install|exec)\b/;
// A network call in shipped code. Only checked in script files: in Markdown,
// `fetch(` is sample code for a web page, not something the agent runs.
const SCRIPT_NETWORK_CALL =
  /\bfetch\s*\(|\bhttps?\.request\s*\(|\bXMLHttpRequest\b/;

/** @typedef {{ skill: string, code: string, detail: string }} Finding */

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

/** Parse and shape-check the lock file. Returns { ok, value | error }. */
export function parseLock(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `skills-lock.json is not JSON: ${e.message}` };
  }
  if (!raw || typeof raw !== "object" || raw.version !== 1) {
    return {
      ok: false,
      error: "skills-lock.json: expected { version: 1, ... }",
    };
  }
  if (
    !raw.skills ||
    typeof raw.skills !== "object" ||
    Array.isArray(raw.skills)
  ) {
    return { ok: false, error: "skills-lock.json: `skills` must be an object" };
  }
  const unlocked = raw.unlocked ?? {};
  if (typeof unlocked !== "object" || Array.isArray(unlocked)) {
    return {
      ok: false,
      error: "skills-lock.json: `unlocked` must be an object of name -> reason",
    };
  }
  for (const [name, reason] of Object.entries(unlocked)) {
    if (typeof reason !== "string" || !reason.trim()) {
      return {
        ok: false,
        error: `skills-lock.json: unlocked.${name} needs a non-empty reason`,
      };
    }
    if (name in raw.skills) {
      return {
        ok: false,
        error: `skills-lock.json: ${name} is both locked and unlocked`,
      };
    }
  }
  for (const [name, e] of Object.entries(raw.skills)) {
    if (!e || typeof e !== "object")
      return { ok: false, error: `skills.${name} must be an object` };
    if (typeof e.source !== "string" || typeof e.sourceType !== "string") {
      return {
        ok: false,
        error: `skills.${name}: source and sourceType are required strings`,
      };
    }
    if (e.commit !== undefined && !/^[0-9a-f]{40}$/.test(e.commit)) {
      return { ok: false, error: `skills.${name}.commit must be a 40-hex SHA` };
    }
    if (e.execution !== undefined && !(e.execution in EXECUTION_RANK)) {
      return {
        ok: false,
        error: `skills.${name}.execution must be one of ${Object.keys(EXECUTION_RANK).join("|")}`,
      };
    }
    if (e.network !== undefined) {
      const n = e.network;
      const okKeyword = typeof n === "string" && NETWORK_KEYWORDS.includes(n);
      const okAllow =
        n &&
        typeof n === "object" &&
        Array.isArray(n.allowlist) &&
        n.allowlist.length > 0 &&
        n.allowlist.every((h) => typeof h === "string" && h);
      if (!okKeyword && !okAllow) {
        return {
          ok: false,
          error: `skills.${name}.network must be none|docs-only|arbitrary or { allowlist: [hosts] }`,
        };
      }
    }
    if (e.acknowledged !== undefined) {
      if (
        !e.acknowledged ||
        typeof e.acknowledged !== "object" ||
        Array.isArray(e.acknowledged)
      ) {
        return {
          ok: false,
          error: `skills.${name}.acknowledged must map "path:line" or "path:*" -> reason`,
        };
      }
      for (const [k, why] of Object.entries(e.acknowledged)) {
        if (
          !/^[^:]+:(\d+|\*)$/.test(k) ||
          typeof why !== "string" ||
          !why.trim()
        ) {
          return {
            ok: false,
            error: `skills.${name}.acknowledged["${k}"] needs a "path:line" or "path:*" key and a reason`,
          };
        }
      }
    }
    if (e.files !== undefined) {
      if (!e.files || typeof e.files !== "object" || Array.isArray(e.files)) {
        return {
          ok: false,
          error: `skills.${name}.files must map path -> sha256`,
        };
      }
      for (const [p, h] of Object.entries(e.files)) {
        if (!/^[0-9a-f]{64}$/.test(String(h))) {
          return {
            ok: false,
            error: `skills.${name}.files["${p}"] must be a sha256 hex digest`,
          };
        }
        if (p.startsWith("/") || p.split("/").includes("..")) {
          return {
            ok: false,
            error: `skills.${name}.files["${p}"] must be a relative path inside the skill`,
          };
        }
      }
    }
  }
  return { ok: true, value: { skills: raw.skills, unlocked } };
}

function walk(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() || ent.isSymbolicLink()) out.push(p);
  }
  return out;
}

function isBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const posix = (p) => p.split(sep).join("/");

/** Run every check against a repo root. Pure apart from reading files. */
export function verifySkills(root) {
  const lockPath = join(root, "skills-lock.json");
  const skillsDir = join(root, ".agents", "skills");
  if (!existsSync(lockPath)) return { ok: false, error: `missing ${lockPath}` };
  if (!existsSync(skillsDir))
    return { ok: false, error: `missing ${skillsDir}` };
  const parsed = parseLock(readFileSync(lockPath, "utf8"));
  if (!parsed.ok) return parsed;
  const { skills, unlocked } = parsed.value;

  /** @type {Finding[]} */
  const findings = [];
  const legacy = [];
  const add = (skill, code, detail) => findings.push({ skill, code, detail });

  const onDisk = readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() || d.isSymbolicLink())
    .map((d) => d.name)
    .sort();

  for (const name of onDisk) {
    if (!(name in skills) && !(name in unlocked)) {
      add(
        name,
        "unaccounted",
        "directory has no skills-lock.json entry and is not in `unlocked`",
      );
    }
  }
  for (const name of Object.keys(skills)) {
    if (!onDisk.includes(name))
      add(
        name,
        "missing",
        "locked skill has no directory under .agents/skills/",
      );
  }
  for (const name of Object.keys(unlocked)) {
    if (!onDisk.includes(name))
      add(name, "stale-unlocked", "listed in `unlocked` but not on disk");
  }

  for (const name of onDisk) {
    const dir = join(skillsDir, name);
    let st;
    try {
      st = statSync(dir);
    } catch {
      add(name, "dangling", "skill path is a dangling symlink");
      continue;
    }
    if (!st.isDirectory()) continue;
    const entry = skills[name];
    const files = walk(dir)
      .map((abs) => ({ abs, rel: posix(relative(dir, abs)) }))
      .sort((a, b) => a.rel.localeCompare(b.rel));

    // 2. Integrity
    if (entry && entry.files) {
      const listed = new Set(Object.keys(entry.files));
      for (const f of files) {
        if (!listed.has(f.rel)) add(name, "unlisted-file", f.rel);
        else if (sha256(readFileSync(f.abs)) !== entry.files[f.rel])
          add(name, "hash-drift", f.rel);
      }
      const present = new Set(files.map((f) => f.rel));
      for (const rel of listed)
        if (!present.has(rel)) add(name, "missing-file", rel);
    } else if (entry && entry.sourceType !== "local") {
      legacy.push(name);
    }

    // 3 + 4. Content and declared class
    let foundExec = 0;
    const netHits = [];
    for (const f of files) {
      const buf = readFileSync(f.abs);
      const exe = (statSync(f.abs).mode & 0o111) !== 0;
      if (isBinary(buf)) {
        foundExec = Math.max(foundExec, EXECUTION_RANK.binary);
        continue;
      }
      const text = buf.toString("utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (HIDDEN_UNICODE.test(i === 0 ? line.replace(/^﻿/, "") : line)) {
          add(name, "hidden-unicode", `${f.rel}:${i + 1}`);
        }
        if (BASE64_RUN.test(line))
          add(name, "base64-blob", `${f.rel}:${i + 1}`);
      });
      const isScript = SCRIPT_EXT.test(f.rel) || exe || text.startsWith("#!");
      if (isScript) foundExec = Math.max(foundExec, EXECUTION_RANK.script);
      if (
        HOOK_FILE.test(f.rel) ||
        (PLUGIN_MANIFEST.test(f.rel) && /"hooks"\s*:/.test(text))
      ) {
        foundExec = Math.max(foundExec, EXECUTION_RANK.hook);
      }
      lines.forEach((line, i) => {
        if (MUTABLE_REF.test(line))
          netHits.push({ code: "mutable-ref", where: `${f.rel}:${i + 1}` });
        if (
          NETWORK_ACTION.test(line) ||
          (isScript && SCRIPT_NETWORK_CALL.test(line))
        ) {
          netHits.push({ code: "network-action", where: `${f.rel}:${i + 1}` });
        }
      });
    }

    if (entry && entry.execution !== undefined) {
      const declared = EXECUTION_RANK[entry.execution];
      if (foundExec > declared) {
        const found = Object.keys(EXECUTION_RANK).find(
          (k) => EXECUTION_RANK[k] === foundExec,
        );
        add(
          name,
          "execution-class",
          `declared ${entry.execution}, content needs ${found}`,
        );
      }
    }
    if (entry && entry.network !== undefined) {
      const acks = entry.acknowledged ?? {};
      const used = new Set();
      const acked = (where) => {
        const fileKey = `${where.slice(0, where.lastIndexOf(":"))}:*`;
        if (where in acks) return (used.add(where), true);
        if (fileKey in acks) return (used.add(fileKey), true);
        return false;
      };
      for (const hit of netHits) {
        if (acked(hit.where)) continue;
        if (hit.code === "mutable-ref")
          add(name, "mutable-ref", `${hit.where} (pin an exact version)`);
        else if (entry.network === "none")
          add(
            name,
            "network-class",
            `${hit.where} reaches the network but network is "none"`,
          );
      }
      for (const k of Object.keys(acks)) {
        if (!used.has(k))
          add(
            name,
            "stale-ack",
            `${k} is acknowledged but no longer matches a finding`,
          );
      }
    }
  }

  return { ok: true, value: { findings, legacy, checked: onDisk.length } };
}

function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.ok) {
    stderr.write(
      `verify-skills: ${args.error}\nusage: node scripts/verify-skills.mjs [--root <repo>] [--json]\n`,
    );
    exit(2);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(args.value.root ?? join(here, ".."));
  let result;
  try {
    result = verifySkills(root);
  } catch (e) {
    stderr.write(`verify-skills: ${e.message}\n`);
    exit(2);
  }
  if (!result.ok) {
    stderr.write(`verify-skills: ${result.error}\n`);
    exit(2);
  }
  const { findings, legacy, checked } = result.value;
  if (args.value.json) {
    stdout.write(
      JSON.stringify(
        { ok: findings.length === 0, checked, legacy, findings },
        null,
        2,
      ) + "\n",
    );
  } else {
    for (const f of findings)
      stdout.write(`${f.skill}: ${f.code}: ${f.detail}\n`);
    if (legacy.length)
      stderr.write(
        `verify-skills: legacy entries without file hashes: ${legacy.join(", ")}\n`,
      );
    stderr.write(
      `verify-skills: ${checked} skill directories, ${findings.length} finding(s)\n`,
    );
  }
  exit(findings.length === 0 ? 0 : 1);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(argv[1] ?? "")) main();
