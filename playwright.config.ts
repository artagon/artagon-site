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
  // Playwright tests use *.spec.ts; *.test.mjs runs under node:test
  // (see test:node script) and *.test.mts under vitest (test:vitest).
  // Without this restriction, Playwright's default testMatch picks up
  // vitest files and crashes with @vitest/expect symbol collisions.
  testMatch: "**/*.spec.ts",
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
    // Microsoft Edge — Chromium engine, but separate stable channel.
    // Useful for confirming the build works against the bundled-with-OS
    // browser most enterprise users have.
    {
      name: "Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    // Google Chrome stable channel — distinct from Playwright's bundled
    // chromium build (which can lag stable by several versions).
    {
      name: "Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    // Mobile viewports — multiple form factors.
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Chrome (Pixel 7)",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "Mobile Chrome (Galaxy S9+)",
      use: { ...devices["Galaxy S9+"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "Mobile Safari (iPhone 14 Pro Max)",
      use: { ...devices["iPhone 14 Pro Max"] },
    },
    // Tablet viewports — hybrid touch + mouse, larger surface than mobile.
    {
      name: "Tablet Safari",
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "Tablet Safari (iPad Mini)",
      use: { ...devices["iPad Mini"] },
    },
    {
      name: "Tablet Chrome (Galaxy Tab S4)",
      use: { ...devices["Galaxy Tab S4"] },
    },
    // TV / large-desktop viewport. Common for kiosks and design-review
    // sessions on external monitors. 1920×1080 covers the bulk of desktop
    // installations and exercises the wide-grid layout paths.
    {
      name: "TV",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // 4K — for high-DPI / kiosk displays. Captures any layout that
    // collapses or stretches at 2× the standard desktop width.
    {
      name: "TV 4K",
      use: {
        ...devices["Desktop Chrome HiDPI"],
        viewport: { width: 3840, height: 2160 },
      },
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
