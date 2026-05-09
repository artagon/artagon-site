// USMR Phase 5.5.16-pt174 — no-inline-event-handler gate.
//
// Inline event-handler attributes (`onclick="..."`, `onload="..."`,
// `onerror="..."`, etc.) are problematic in this codebase:
//
// 1) **CSP**: the project's strict Content-Security-Policy ships
//    `script-src` WITHOUT `'unsafe-inline'` (enforced by
//    `scripts/csp.mjs` — its postbuild gate fails if 'unsafe-inline'
//    appears in the constructed `script-src`). Inline event-handler
//    attributes are blocked under such a CSP — they're a hidden
//    inline-script execution surface that the rest of the project's
//    SRI/hash machinery doesn't cover.
//
// 2) **XSS sink class**: every inline event-handler attribute is a
//    string-to-code conversion at parse time. Sibling rules
//    `no-inner-html`, `no-set-html-directive`, and `no-hardcoded-
//    secrets` (in `rules/security/`) all guard against this same
//    "string becomes runtime code" failure mode. Inline `on<event>=`
//    attrs are the third member of that family.
//
// 3) **Astro-specific footgun**: `<button onClick={...}>` in an
//    `.astro` template is NOT the JSX programmatic-listener syntax —
//    Astro emits it verbatim as `onclick="..."` in the rendered HTML.
//    A contributor copying the React idiom into an Astro file
//    silently introduces an inline-handler attr.
//
// Canonical pattern (e.g. `Header.astro [data-nav-toggle]`,
// `BaseLayout.astro [data-theme-toggle]`, post-pt174
// `ThemePreviewPanel.astro [data-theme-target]`): use a `data-*`
// attribute + a scoped `<script>` that calls `addEventListener`.
//
// Scope:
//   - `.astro` files only. JSX/TSX `onClick={...}` is fine — React
//     binds those programmatically (no inline-handler attribute is
//     ever emitted to HTML), so the CSP / XSS arguments don't apply.
//
// Allow-list:
//   - Per-line `<!-- lint-no-inline-event-handler: ok -->` /
//     `{/* lint-no-inline-event-handler: ok */}` for deliberate
//     exceptions. None should exist today.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// HTML event-handler attribute names per the WHATWG HTML spec
// "event handler IDL attributes" + "event handler content attributes"
// (https://html.spec.whatwg.org/multipage/webappapis.html#event-handlers-on-elements,-document-objects,-and-window-objects).
// We match the common surface that has historically appeared in this
// codebase + the spec's reflected-handler list. Match is
// case-insensitive (HTML attributes are case-insensitive).
const EVENT_NAMES = [
  "abort",
  "blur",
  "cancel",
  "canplay",
  "canplaythrough",
  "change",
  "click",
  "close",
  "contextmenu",
  "cuechange",
  "dblclick",
  "drag",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "dragstart",
  "drop",
  "durationchange",
  "emptied",
  "ended",
  "error",
  "focus",
  "formdata",
  "input",
  "invalid",
  "keydown",
  "keypress",
  "keyup",
  "load",
  "loadeddata",
  "loadedmetadata",
  "loadstart",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "pause",
  "play",
  "playing",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "progress",
  "ratechange",
  "reset",
  "resize",
  "scroll",
  "scrollend",
  "seeked",
  "seeking",
  "select",
  "stalled",
  "submit",
  "suspend",
  "timeupdate",
  "toggle",
  "volumechange",
  "waiting",
  "wheel",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".astro")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  attr: string;
}

function findInlineHandlers(body: string, rel: string): Finding[] {
  // Strip block / JSX / HTML / line comments so prose mentions of
  // `onclick=` (e.g. "// `onclick=...` would violate CSP") don't
  // trip the gate. Replace stripped chars with spaces to preserve
  // 1-based line numbers in the residual string.
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/<!--[\s\S]*?-->/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));

  // Strip Astro frontmatter `---\n…\n---` so TS code mentioning event
  // names (e.g. `addEventListener("click", …)`) doesn't false-match.
  stripped = stripped.replace(/^---\n[\s\S]*?\n---\n/, (m) =>
    m.replace(/[^\n]/g, " "),
  );

  // Strip <style> and <script> block bodies — TypeScript inside a
  // <script>…</script> block can legitimately mention `onclick` etc.
  // (e.g. as event-name strings), and CSS inside <style> can use
  // selectors that contain those tokens. Only attribute occurrences
  // outside script/style blocks are the inline-handler footgun.
  stripped = stripped.replace(/<script[\s\S]*?<\/script>/gi, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/<style[\s\S]*?<\/style>/gi, (m) =>
    m.replace(/[^\n]/g, " "),
  );

  const findings: Finding[] = [];
  const origLines = body.split("\n");
  // Build one big alternation. `\b` ensures we don't accidentally
  // match `myonclick=` or similar identifier suffixes.
  const alt = EVENT_NAMES.join("|");
  // Match any of: `onclick="..."`, `onClick="..."`, `onclick={...}`,
  // `onClick={...}`, etc. Allow attribute name to be any case (HTML).
  const re = new RegExp(`\\bon(?:${alt})\\s*=\\s*([\"'\`{])`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const before = stripped.slice(0, m.index);
    const lineNum = before.split("\n").length;
    const orig = origLines[lineNum - 1] ?? "";
    if (/lint-no-inline-event-handler:\s*ok/i.test(orig)) continue;
    // Extract just the attribute name (e.g. `onClick`) for the
    // diagnostic message.
    const attrMatch = m[0].match(/^on[a-z]+/i);
    findings.push({
      file: rel,
      line: lineNum,
      attr: attrMatch ? attrMatch[0] : m[0],
    });
  }
  return findings;
}

describe("no inline event-handler attributes in .astro templates (CSP + XSS)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered .astro files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no inline `on<event>=` attrs in .astro templates", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findInlineHandlers(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.attr}=... (use [data-*] + scoped <script>addEventListener; see Header.astro [data-nav-toggle])`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} inline event-handler attribute${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
