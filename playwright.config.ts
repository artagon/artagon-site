import { defineConfig, devices } from "@playwright/test";
import { BUILD } from "./build.config.ts";

/**
 * Playwright configuration for automated testing
 * Run tests: npx playwright test
 * Update snapshots: npx playwright test --update-snapshots
 *
 * Output paths sourced from build.config.ts (BUILD.reports.playwright.*).
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: BUILD.reports.playwright.results,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // HTML report under .build/reports/playwright/html/. GH annotations layered on CI.
  reporter: process.env.CI
    ? [
        ["github"],
        [
          "html",
          { outputFolder: BUILD.reports.playwright.html, open: "never" },
        ],
      ]
    : [
        [
          "html",
          { outputFolder: BUILD.reports.playwright.html, open: "never" },
        ],
      ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: "http://localhost:4321",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewports
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
