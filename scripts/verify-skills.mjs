#!/usr/bin/env node
/**
 * verify-skills.mjs — agent-skill supply-chain gate.
 *
 * OpenSpec: add-agent-skills-supply-chain (tasks 2.1–2.4, 2.6). Every
 * `SKILL.md` an agent can load is executable supply-chain input, so the skill
 * trees are checked here, in CI, and never left to a skill to police itself.
 * Lock format and procedure: docs/agents/skills-supply-chain.md.
 *
 * 1. Lock shape. `sourceType` is `github` or `local`; `local` is only this
 *    repo. A `github` entry records `commit`, `license`, `execution`,
 *    `network` and a `files` hash map (only `design-md` is grandfathered).
 * 2. Accounting. Every entry under `.agents/skills/` is a real directory with
 *    a lock entry or an `unlocked` reason. Every entry under a mirror tree
 *    (`.claude/skills`, `.codex/skills`, `.gemini/skills`) is a symlink to
 *    `../../.agents/skills/<same name>` or is listed in `mirrorExceptions`.
 * 3. Integrity. A `files` map matches the directory exactly.
 * 4. Content, for every scanned directory (locked, unlocked, mirror-only):
 *    hidden Unicode (format characters, bidi marks, variation selectors,
 *    filler characters), base64 runs (also split across lines), binary or
 *    special files, symlinks, `allowed-tools` frontmatter, moving `@latest`
 *    references.
 * 5. Classes. Content that executes (anything that is not a known text or
 *    image type, shebangs, executable bits, package scripts) needs
 *    `execution: script`; binaries `binary`; hook manifests, `.mcp.json` and
 *    frontmatter `hooks:` need `hook`. Network instructions need a network
 *    class: under `none` every hit fails, under `{ allowlist }` every host a
 *    hit reaches must be listed. Undeclared means `text-only` and `none`.
 * 6. Acknowledgements. A reviewed hit is listed as "path:line" with the
 *    sha256 of that exact line, so changing the line voids it. A stale or
 *    mismatched acknowledgement is itself a finding.
 *
 * Usage: node scripts/verify-skills.mjs [--root <repo>] [--json]
 *
 * Exit codes:
 *   0 — clean
 *   1 — findings (each printed as `<skill>: <code>: <detail>`)
 *   2 — usage or IO error (bad flag, unreadable or malformed lock file)
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stderr, stdout } from "node:process";

const SELF_SOURCE = "artagon/artagon-site";
const LEGACY_UNHASHED = new Set(["design-md"]);
const MIRRORS = [".claude/skills", ".codex/skills", ".gemini/skills"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EXECUTION_RANK = new Map([
  ["text-only", 0],
  ["script", 1],
  ["binary", 2],
  ["hook", 3],
]);
const RANK_NAME = [...EXECUTION_RANK.keys()];

const TEXT_FILE = /\.(md|markdown|txt|csv|tsv|ya?ml|json|toml)$/i;
const TEXT_NAME =
  /^(LICENSE|LICENCE|NOTICE|COPYING|README|CHANGELOG|AUTHORS)(\.[A-Za-z0-9]+)?$/i;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif|ico)$/i;
const HOOK_FILE = /(^|\/)(hooks\.json|hooks\/[^/]+\.json|\.mcp\.json)$/i;
const MANIFEST_FILE =
  /(^|\/)(plugin\.json|marketplace\.json|settings(\.local)?\.json|gemini-extension\.json)$/i;

// Format characters (incl. zero-width, bidi marks/embeddings/isolates, soft
// hyphen, tag characters), line/paragraph separators, combining grapheme
// joiner, Hangul and halfwidth fillers, variation selectors.
const HIDDEN_UNICODE =
  /[\p{Cf}\u2028\u2029\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u;
// A single emoji presentation selector right after a pictograph is ordinary
// text (U+26A0 U+FE0F, a warning sign); runs of selectors are how variation-selector smuggling hides data.
const EMOJI_PRESENTATION =
  /(\p{Extended_Pictographic})[\uFE0E\uFE0F](?![\uFE00-\uFE0F\u{E0100}-\u{E01EF}])/gu;
const BASE64_RUN = /[A-Za-z0-9+/_-]{200,}={0,2}/g;
// Encoded data mixes letters with other symbols; a ruler of dashes or one
// repeated letter does not count.
const looksEncoded = (s) => /[A-Za-z]/.test(s) && new Set(s).size >= 4;
const BASE64_LINE = /^[A-Za-z0-9+/_=-]{40,}$/;
const MUTABLE_REF = /@latest\b/i;

// Commands an agent would run that reach the network. Case-insensitive.
const NETWORK_COMMAND = new RegExp(
  [
    String.raw`\b(curl|wget|aria2c|npx|pnpx|bunx|uvx|pipx|webfetch|iwr|irm|ncat|nc|ssh|scp|sftp|rsync|telnet)\b`,
    String.raw`\binvoke-(webrequest|restmethod)\b`,
    String.raw`\bbun\s+x\b`,
    String.raw`\b(npm|pnpm|yarn)\s+(i|install|add|exec|x|dlx|create|init)\b`,
    String.raw`\bpip3?\s+install\b`,
    String.raw`\b(cargo|go|gem|composer)\s+(install|get|require)\b`,
    String.raw`\bgit\s+(clone|fetch|pull|ls-remote|submodule)\b`,
    String.raw`\bgh\s+(api|repo|release|gist|extension)\b`,
    String.raw`\bdeno\s+(run|install)\s+\S*https?:`,
    // Inline interpreter evaluation can do anything, including network access.
    String.raw`\b(node|deno|bun)\s+(-e|--eval|-p|--print)\b`,
    String.raw`\b(python3?|perl|ruby|php)\s+-[ce]\b`,
    // Network modules named in prose or samples an agent might paste and run.
    String.raw`require\(\s*["'](node:)?(https?|net|dgram|tls)["']\s*\)`,
    String.raw`\burllib\.request\b`,
  ].join("|"),
  "i",
);
// Network calls in shipped code; checked only in script files.
const SCRIPT_NETWORK = new RegExp(
  [
    String.raw`\bfetch\s*\(`,
    String.raw`\bhttps?\.(get|request)\s*\(`,
    String.raw`require\(\s*["'](node:)?(https?|net|dgram|tls)["']\s*\)`,
    String.raw`from\s+["'](node:)?(https?|net|dgram|tls)["']`,
    String.raw`\bXMLHttpRequest\b`,
    String.raw`\bWebSocket\s*\(`,
    String.raw`\burllib\b`,
    String.raw`\brequests\.(get|post|put|request)\b`,
    String.raw`\bsocket\.(socket|create_connection)\b`,
    String.raw`https?://`,
  ].join("|"),
  "i",
);
const FENCE = /^\s*(```|~~~)\s*([A-Za-z0-9_-]*)/;
const SHELL_LANG =
  /^(sh|bash|zsh|fish|shell|console|terminal|powershell|ps1|pwsh|cmd|bat)$/i;
const URL_HOST = /https?:\/\/([^/\s"'`)<>\]]+)/gi;
const IMPLIED_HOSTS = [
  [/\b(npx|pnpx|bunx|bun\s+x|npm|pnpm|yarn)\b/i, "registry.npmjs.org"],
  [/\b(pip3?|pipx|uvx)\b/i, "pypi.org"],
  [/\bcargo\b/i, "crates.io"],
  [/\bgo\s+(install|get)\b/i, "proxy.golang.org"],
  [/\bgh\b/i, "api.github.com"],
];

/** @typedef {{ skill: string, code: string, detail: string }} Finding */

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (o, k) => isObj(o) && Object.hasOwn(o, k);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const posix = (p) => p.split(sep).join("/");

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

function checkClasses(where, e) {
  if (e.execution !== undefined && !EXECUTION_RANK.has(e.execution)) {
    return `${where}.execution must be one of ${RANK_NAME.join("|")}`;
  }
  if (e.network !== undefined) {
    const n = e.network;
    const ok =
      n === "none" ||
      n === "arbitrary" ||
      (isObj(n) &&
        Array.isArray(n.allowlist) &&
        n.allowlist.length > 0 &&
        n.allowlist.every(
          (h) => typeof h === "string" && /^[a-z0-9.-]+(:\d+)?$/i.test(h),
        ));
    if (!ok)
      return `${where}.network must be "none", "arbitrary" or { "allowlist": [hosts] }`;
  }
  if (e.acknowledged !== undefined) {
    if (!isObj(e.acknowledged))
      return `${where}.acknowledged must map "path:line" -> { reason, sha256 }`;
    for (const [k, v] of Object.entries(e.acknowledged)) {
      if (!/^[^:]+:\d+$/.test(k))
        return `${where}.acknowledged["${k}"]: key must be "path:line" (whole-file keys are not allowed)`;
      if (
        !isObj(v) ||
        typeof v.reason !== "string" ||
        !v.reason.trim() ||
        !/^[0-9a-f]{64}$/.test(String(v.sha256))
      ) {
        return `${where}.acknowledged["${k}"] must be { "reason": "...", "sha256": "<sha256 of the line>" }`;
      }
    }
  }
  return null;
}

/** Normalize an `unlocked` or mirror-exception value to { reason, ...classes }. */
function parseException(where, v) {
  const e = typeof v === "string" ? { reason: v } : v;
  if (!isObj(e) || typeof e.reason !== "string" || !e.reason.trim()) {
    return { ok: false, error: `${where} needs a non-empty reason` };
  }
  const bad = checkClasses(where, e);
  return bad ? { ok: false, error: bad } : { ok: true, value: e };
}

/** Parse and shape-check the lock file. Returns { ok, value | error }. */
export function parseLock(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `skills-lock.json is not JSON: ${e.message}` };
  }
  if (!isObj(raw) || raw.version !== 1)
    return {
      ok: false,
      error: "skills-lock.json: expected { version: 1, ... }",
    };
  if (!isObj(raw.skills))
    return { ok: false, error: "skills-lock.json: `skills` must be an object" };

  const skills = new Map();
  for (const [name, e] of Object.entries(raw.skills)) {
    const where = `skills.${name}`;
    if (!isObj(e)) return { ok: false, error: `${where} must be an object` };
    if (e.sourceType !== "github" && e.sourceType !== "local") {
      return {
        ok: false,
        error: `${where}.sourceType must be "github" or "local"`,
      };
    }
    if (typeof e.source !== "string" || !e.source)
      return { ok: false, error: `${where}.source is required` };
    if (e.sourceType === "local" && e.source !== SELF_SOURCE) {
      return {
        ok: false,
        error: `${where}: sourceType "local" is only for ${SELF_SOURCE}`,
      };
    }
    const legacy =
      e.sourceType === "github" &&
      LEGACY_UNHASHED.has(name) &&
      e.files === undefined;
    const required =
      e.sourceType === "local"
        ? ["execution", "network"]
        : legacy
          ? []
          : ["commit", "license", "execution", "network", "files"];
    for (const k of required)
      if (!own(e, k)) return { ok: false, error: `${where}.${k} is required` };
    if (e.commit !== undefined && !/^[0-9a-f]{40}$/.test(e.commit))
      return { ok: false, error: `${where}.commit must be a 40-hex SHA` };
    if (
      e.license !== undefined &&
      (typeof e.license !== "string" || !e.license.trim())
    ) {
      return {
        ok: false,
        error: `${where}.license must be a non-empty string`,
      };
    }
    const bad = checkClasses(where, e);
    if (bad) return { ok: false, error: bad };
    if (e.files !== undefined) {
      if (!isObj(e.files) || Object.keys(e.files).length === 0)
        return { ok: false, error: `${where}.files must map path -> sha256` };
      for (const [p, h] of Object.entries(e.files)) {
        if (!/^[0-9a-f]{64}$/.test(String(h)))
          return {
            ok: false,
            error: `${where}.files["${p}"] must be a sha256 hex digest`,
          };
        if (p.startsWith("/") || p.split("/").includes("..")) {
          return {
            ok: false,
            error: `${where}.files["${p}"] must be a relative path inside the skill`,
          };
        }
      }
    }
    skills.set(name, { ...e, legacy });
  }

  const unlocked = new Map();
  if (raw.unlocked !== undefined) {
    if (!isObj(raw.unlocked))
      return {
        ok: false,
        error: "skills-lock.json: `unlocked` must be an object",
      };
    for (const [name, v] of Object.entries(raw.unlocked)) {
      if (skills.has(name))
        return {
          ok: false,
          error: `skills-lock.json: ${name} is both locked and unlocked`,
        };
      const p = parseException(`unlocked.${name}`, v);
      if (!p.ok) return p;
      unlocked.set(name, p.value);
    }
  }

  const mirrorExceptions = new Map(MIRRORS.map((m) => [m, new Map()]));
  if (raw.mirrorExceptions !== undefined) {
    if (!isObj(raw.mirrorExceptions))
      return {
        ok: false,
        error: "skills-lock.json: `mirrorExceptions` must be an object",
      };
    for (const [mirror, names] of Object.entries(raw.mirrorExceptions)) {
      if (!mirrorExceptions.has(mirror))
        return {
          ok: false,
          error: `mirrorExceptions: unknown mirror ${mirror}`,
        };
      if (!isObj(names))
        return {
          ok: false,
          error: `mirrorExceptions["${mirror}"] must be an object`,
        };
      for (const [name, v] of Object.entries(names)) {
        const p = parseException(`mirrorExceptions["${mirror}"].${name}`, v);
        if (!p.ok) return p;
        mirrorExceptions.get(mirror).set(name, p.value);
      }
    }
  }
  return { ok: true, value: { skills, unlocked, mirrorExceptions } };
}

/** Decode a text file; UTF-16 with a BOM is decoded, NUL bytes otherwise mean binary. */
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe)
    return { text: buf.subarray(2).toString("utf16le") };
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return { text: swapped.toString("utf16le") };
  }
  if (buf.includes(0)) return { binary: true };
  return { text: buf.toString("utf8").replace(/^\uFEFF/, "") };
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

function hostsOf(line) {
  const hosts = new Set();
  for (const m of line.matchAll(URL_HOST))
    hosts.add(m[1].toLowerCase().replace(/^.*@/, ""));
  for (const [re, host] of IMPLIED_HOSTS) if (re.test(line)) hosts.add(host);
  return hosts;
}

/** Walk a skill directory with lstat; report symlinks and special files instead of following them. */
function walk(dir, base, add) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const rel = posix(relative(base, abs));
    const st = lstatSync(abs);
    if (st.isSymbolicLink())
      add("symlink", `${rel} is a symlink (vendor the file instead)`);
    else if (st.isDirectory()) out.push(...walk(abs, base, add));
    else if (st.isFile()) out.push({ abs, rel, size: st.size, mode: st.mode });
    else add("special-file", `${rel} is not a regular file`);
  }
  return out;
}

/** Scan one skill directory against its declared entry (or {} for defaults). */
function scanSkill(label, dir, entry, add) {
  const files = walk(dir, dir, (code, detail) => add(label, code, detail));
  let needed = 0;
  const hits = [];

  if (entry.files) {
    const listed = new Set(Object.keys(entry.files));
    for (const f of files)
      if (!listed.has(f.rel)) add(label, "unlisted-file", f.rel);
    const present = new Set(files.map((f) => f.rel));
    for (const rel of listed)
      if (!present.has(rel)) add(label, "missing-file", rel);
  }

  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      add(label, "too-large", `${f.rel} (${f.size} bytes)`);
      continue;
    }
    const buf = readFileSync(f.abs);
    if (
      entry.files &&
      own(entry.files, f.rel) &&
      sha256(buf) !== entry.files[f.rel]
    )
      add(label, "hash-drift", f.rel);

    const executable = (f.mode & 0o111) !== 0;
    if (IMAGE_FILE.test(f.rel) && !executable) continue;
    const decoded = decode(buf);
    if (decoded.binary) {
      needed = Math.max(needed, EXECUTION_RANK.get("binary"));
      if (entry.execution !== "binary")
        add(
          label,
          "binary-file",
          `${f.rel} (declare execution "binary" or remove it)`,
        );
      continue;
    }
    const text = decoded.text;
    const base = f.rel.split("/").pop();
    const textType =
      (TEXT_FILE.test(base) || TEXT_NAME.test(base)) &&
      !executable &&
      !text.startsWith("#!");
    if (!textType) needed = Math.max(needed, EXECUTION_RANK.get("script"));
    if (base === "package.json" && /"scripts"\s*:/.test(text))
      needed = Math.max(needed, EXECUTION_RANK.get("script"));
    if (
      HOOK_FILE.test(f.rel) ||
      (MANIFEST_FILE.test(f.rel) && /"(hooks|mcpServers)"\s*:/.test(text))
    ) {
      needed = Math.max(needed, EXECUTION_RANK.get("hook"));
    }
    if (/\.md$/i.test(base)) {
      const fm = frontmatter(text);
      if (/^\s*hooks\s*:/m.test(fm))
        needed = Math.max(needed, EXECUTION_RANK.get("hook"));
      if (/^\s*allowed-tools\s*:/m.test(fm))
        add(
          label,
          "allowed-tools",
          `${f.rel} pre-approves tools in frontmatter`,
        );
    }

    let run = 0;
    let runStart = 0;
    let fence = null; // null outside a fence, else the fence language
    text.split("\n").forEach((line, i) => {
      const where = `${f.rel}:${i + 1}`;
      if (HIDDEN_UNICODE.test(line.replace(EMOJI_PRESENTATION, "$1")))
        add(label, "hidden-unicode", where);
      for (const m of line.matchAll(BASE64_RUN)) {
        if (looksEncoded(m[0])) add(label, "base64-blob", where);
      }
      const t = line.trim();
      if (BASE64_LINE.test(t) && looksEncoded(t)) {
        if (run === 0) runStart = i;
        run += t.length;
        if (run >= 200 && run - t.length < 200)
          add(
            label,
            "base64-blob",
            `${f.rel}:${runStart + 1} (split across lines)`,
          );
      } else run = 0;

      const fm = line.match(FENCE);
      if (fm) fence = fence === null ? fm[2] : null;

      const reasons = [];
      if (MUTABLE_REF.test(line)) reasons.push("mutable-ref");
      const inShellFence = fence !== null && SHELL_LANG.test(fence);
      if (
        NETWORK_COMMAND.test(line) ||
        (!textType && SCRIPT_NETWORK.test(line)) ||
        (inShellFence && /https?:\/\//i.test(line))
      ) {
        reasons.push("network");
      }
      if (reasons.length)
        hits.push({ where, line, reasons, hosts: hostsOf(line) });
    });
  }

  const declared = EXECUTION_RANK.get(entry.execution ?? "text-only");
  if (needed > declared) {
    add(
      label,
      "execution-class",
      `declared ${entry.execution ?? "text-only (default)"}, content needs ${RANK_NAME[needed]}`,
    );
  }

  const acks = entry.acknowledged ?? {};
  const used = new Set();
  const network = entry.network ?? "none";
  for (const hit of hits) {
    if (own(acks, hit.where)) {
      used.add(hit.where);
      if (acks[hit.where].sha256 !== sha256(hit.line))
        add(
          label,
          "ack-mismatch",
          `${hit.where} changed since it was acknowledged`,
        );
      continue;
    }
    if (hit.reasons.includes("mutable-ref"))
      add(label, "mutable-ref", `${hit.where} (pin an exact version)`);
    if (!hit.reasons.includes("network") || network === "arbitrary") continue;
    if (network === "none") {
      add(
        label,
        "network-class",
        `${hit.where} reaches the network but network is "none"`,
      );
      continue;
    }
    const allowed = new Set(network.allowlist.map((h) => h.toLowerCase()));
    if (hit.hosts.size === 0)
      add(label, "network-host", `${hit.where} reaches an unknown host`);
    for (const h of hit.hosts)
      if (!allowed.has(h))
        add(
          label,
          "network-host",
          `${hit.where} reaches ${h}, not in the allowlist`,
        );
  }
  for (const k of Object.keys(acks))
    if (!used.has(k))
      add(label, "stale-ack", `${k} is acknowledged but matches no finding`);
}

/** Run every check against a repo root. Pure apart from reading files. */
export function verifySkills(root) {
  const lockPath = join(root, "skills-lock.json");
  const skillsDir = join(root, ".agents", "skills");
  if (!existsSync(lockPath)) return { ok: false, error: `missing ${lockPath}` };
  if (!existsSync(skillsDir))
    return { ok: false, error: `missing ${skillsDir}` };
  const parsed = parseLock(readFileSync(lockPath, "utf8"));
  if (!parsed.ok) return parsed;
  const { skills, unlocked, mirrorExceptions } = parsed.value;

  /** @type {Finding[]} */
  const findings = [];
  const legacy = [];
  const external = [];
  const add = (skill, code, detail) => findings.push({ skill, code, detail });

  const canonical = new Set();
  for (const name of readdirSync(skillsDir).sort()) {
    const abs = join(skillsDir, name);
    const st = lstatSync(abs);
    if (st.isFile() && name === "README.md") continue;
    if (st.isSymbolicLink()) {
      add(
        name,
        "symlinked-skill",
        ".agents/skills entries must be real directories",
      );
      continue;
    }
    if (!st.isDirectory()) {
      add(
        name,
        "stray-file",
        "only skill directories and README.md belong in .agents/skills/",
      );
      continue;
    }
    canonical.add(name);
    const entry = skills.get(name) ?? unlocked.get(name);
    if (!entry) {
      add(
        name,
        "unaccounted",
        "directory has no skills-lock.json entry and is not in `unlocked`",
      );
      scanSkill(name, abs, {}, add);
      continue;
    }
    if (entry.legacy) legacy.push(name);
    scanSkill(name, abs, entry, add);
  }
  for (const name of skills.keys())
    if (!canonical.has(name))
      add(
        name,
        "missing",
        "locked skill has no directory under .agents/skills/",
      );
  for (const name of unlocked.keys())
    if (!canonical.has(name))
      add(name, "stale-unlocked", "listed in `unlocked` but not on disk");

  for (const mirror of MIRRORS) {
    const dir = join(root, mirror);
    const exceptions = mirrorExceptions.get(mirror);
    const seen = new Set();
    if (existsSync(dir)) {
      for (const name of readdirSync(dir).sort()) {
        seen.add(name);
        const abs = join(dir, name);
        const label = `${mirror}/${name}`;
        const st = lstatSync(abs);
        const exception = exceptions.get(name);
        if (st.isSymbolicLink()) {
          const target = readlinkSync(abs);
          if (
            target === `../../.agents/skills/${name}` &&
            canonical.has(name)
          ) {
            if (exception)
              add(
                label,
                "stale-exception",
                "links to the canonical skill; remove it from mirrorExceptions",
              );
            continue;
          }
          if (exception) {
            external.push(`${label} -> ${target}`);
            continue;
          }
          add(
            label,
            "mirror-link",
            `links to ${target}; must link to ../../.agents/skills/${name} or be in mirrorExceptions`,
          );
        } else if (st.isDirectory()) {
          if (!exception)
            add(
              label,
              "mirror-unaccounted",
              "real directory in a mirror tree is not in mirrorExceptions",
            );
          scanSkill(label, abs, exception ?? {}, add);
        } else {
          add(
            label,
            "stray-file",
            "mirror trees hold only skill links and directories",
          );
        }
      }
    }
    for (const name of exceptions.keys()) {
      if (!seen.has(name))
        add(
          `${mirror}/${name}`,
          "stale-exception",
          "listed in mirrorExceptions but not on disk",
        );
    }
  }

  return {
    ok: true,
    value: { findings, legacy, external, checked: canonical.size },
  };
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
  const { findings, legacy, external, checked } = result.value;
  if (args.value.json) {
    stdout.write(
      JSON.stringify(
        { ok: findings.length === 0, checked, legacy, external, findings },
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
    if (external.length)
      stderr.write(
        `verify-skills: ${external.length} mirror exception link(s) not reviewable in CI\n`,
      );
    stderr.write(
      `verify-skills: ${checked} skill directories, ${findings.length} finding(s)\n`,
    );
  }
  exit(findings.length === 0 ? 0 : 1);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(argv[1] ?? "")) main();
