const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tests/helpers/static-server.js",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile-chromium",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
