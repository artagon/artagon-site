import { defineConfig } from "vitest/config";

// USMR Phase 5.1d — Vitest is scoped to TypeScript unit tests under
// `tests/**/*.test.mts`. The repo runs three test runners:
//   - vitest     → .test.mts (TypeScript unit tests; this config)
//   - node:test  → .test.mjs (legacy / non-TS unit tests, run via test:node)
//   - playwright → .spec.ts  (browser tests, run via test / test:ci)
// The default vitest glob would sweep up .spec.ts and conflict with
// @playwright/test's `test.describe`, so the include pattern is explicit.

export default defineConfig({
  test: {
    include: ["tests/**/*.test.mts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Legacy node:test runner — still run via the test:tweaks script. New
      // TypeScript tests should target vitest. Migration is out of scope for
      // USMR Phase 5.1d.
      "tests/tweaks-state.test.mts",
    ],
  },
});
