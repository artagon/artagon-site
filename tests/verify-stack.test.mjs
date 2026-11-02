// OpenSpec add-agent-skills-supply-chain, task 3.3: verify-stack.mjs gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyStack } from "../scripts/verify-stack.mjs";

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
  "verify-stack.mjs",
);

function fixture(files, pkg = { dependencies: { astro: "6.2.1" } }) {
  const root = mkdtempSync(join(tmpdir(), "verify-stack-"));
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify({
      packages: { "node_modules/astro": { version: "6.2.1" } },
    }),
  );
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
const codes = (r) => r.value.findings.map((f) => f.code);

test("a clean tree passes and reports installed versions from the lockfile", () => {
  const f = fixture({
    "src/pages/index.astro": "---\nconst x = 1;\n---\n<h1>Hi</h1>\n",
  });
  try {
    const r = verifyStack(f.root);
    assert.deepEqual(codes(r), []);
    assert.equal(r.value.installed.astro, "6.2.1");
  } finally {
    f.cleanup();
  }
});

test("removed Astro APIs fail", () => {
  const f = fixture({
    "src/pages/a.astro":
      "---\nconst posts = await Astro.glob('../posts/*.md');\n---\n",
    "src/layouts/B.astro": "<ViewTransitions />\n",
  });
  try {
    assert.deepEqual(codes(verifyStack(f.root)).sort(), [
      "removed-api",
      "removed-api",
    ]);
  } finally {
    f.cleanup();
  }
});

test("Tailwind directives, imports, config and dependencies fail", () => {
  const f = fixture(
    {
      "src/styles/a.css": "@tailwind base;\n",
      "public/assets/b.css": '@import "tailwindcss";\n',
      "tailwind.config.mjs": "export default {}\n",
    },
    {
      dependencies: { astro: "6.2.1", "@astrojs/starlight": "0.42.0" },
      devDependencies: { "@tailwindcss/vite": "4.3.0" },
    },
  );
  try {
    assert.deepEqual(codes(verifyStack(f.root)).sort(), [
      "dependency",
      "dependency",
      "tailwind",
      "tailwind",
      "tailwind",
    ]);
  } finally {
    f.cleanup();
  }
});

test("docs and tests that name forbidden patterns are not scanned", () => {
  const f = fixture({
    "docs/x.md": "Never use Astro.glob( here.\n",
    "tests/y.test.mjs": "'@tailwind base'\n",
  });
  try {
    assert.deepEqual(codes(verifyStack(f.root)), []);
  } finally {
    f.cleanup();
  }
});

test("CLI exit codes: 0 clean, 1 findings, 2 bad package.json or flag", () => {
  const clean = fixture({});
  const dirty = fixture({ "src/a.astro": "<ViewTransitions />\n" });
  try {
    assert.equal(
      spawnSync(process.execPath, [SCRIPT, "--root", clean.root]).status,
      0,
    );
    assert.equal(
      spawnSync(process.execPath, [SCRIPT, "--root", dirty.root]).status,
      1,
    );
    assert.equal(spawnSync(process.execPath, [SCRIPT, "--nope"]).status, 2);
    writeFileSync(join(clean.root, "package.json"), "{");
    assert.equal(
      spawnSync(process.execPath, [SCRIPT, "--root", clean.root]).status,
      2,
    );
  } finally {
    clean.cleanup();
    dirty.cleanup();
  }
});
