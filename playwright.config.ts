import { defineConfig, devices } from "@playwright/test";

import {
  DEV_SERVER_HOST,
  DEV_SERVER_PORT,
  DEV_SERVER_URL,
} from "./devServer.config";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: DEV_SERVER_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT} --strictPort`,
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
