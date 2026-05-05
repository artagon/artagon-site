// Prod-noship smoke test — asserts the dev-only Tweaks panel does not
// reach production HTML. The spec scenario "Tweaks panel does not ship in
// production" (openspec/specs/style-system/spec.md) requires this; this
// test makes the contract enforceable.
//
// Run: node --test tests/tweaks-prod-noship.test.mjs (or npm run test:tweaks-prod-noship)
// Requires: prior `npm run build` has populated .build/dist/.
//
// The Vite-emitted `_astro/TweaksPanel.[hash].js` chunk MAY exist on disk
// (orphaned because the static `import` in Tweaks.astro is reachable in
// source, but no production HTML references the chunk). What we assert is
// that no rendered HTML page mentions tweaks-host / tweaks-trigger /
// TweaksPanel. If those strings appear in dist HTML, the dev-only gate
// regressed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, ".build", "dist");

const FORBIDDEN_TOKENS = ["tweaks-host", "tweaks-trigger", "TweaksPanel"];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

test("Tweaks panel does not ship in production HTML", (t) => {
  if (!existsSync(DIST)) {
    // The test is meaningless without a build. Use t.skip() so the
    // runner reports an explicit skip (not a silent pass) — masking a
    // misconfigured CI step would defeat the purpose.
    t.skip(`${DIST} does not exist — run \`npm run build\` first`);
    return;
  }

  const offenders = [];
  for (const file of walk(DIST)) {
    if (!file.endsWith(".html")) continue;
    const body = readFileSync(file, "utf8");
    for (const token of FORBIDDEN_TOKENS) {
      if (body.includes(token)) {
        offenders.push({
          file: file.slice(ROOT.length + 1),
          token,
        });
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Tweaks panel leaked into production HTML:\n${offenders
      .map((o) => `  ${o.file}: contains "${o.token}"`)
      .join("\n")}`,
  );
});
