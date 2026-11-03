import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.LMS_E2E_BASE_URL || 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  webServer: process.env.LMS_E2E_BASE_URL ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: {DISABLE_PWA:"1",NEXT_TELEMETRY_DISABLED:"1"},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
