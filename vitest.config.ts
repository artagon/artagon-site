import { defineConfig } from "vitest/config";

// USMR Phase 5.1d — Three test runners coexist in `tests/`. They are
// disjoint by what they import, not by file extension:
//   - vitest     covers files importing from `vitest`           (this config)
//   - node:test  covers files importing from `node:test`        (test:node, test:tweaks)
//   - playwright covers files importing from `@playwright/test` (test / test:ci)
// vitest's default glob `**/*.{test,spec}.?(c|m)[jt]s?(x)` would pull in
// Playwright's .spec.ts files (Symbol($$jest-matchers-object) collision)
// and the existing tests/tweaks-state.test.mts (a node:test file that
// happens to use the .mts extension). Both are excluded explicitly.

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
