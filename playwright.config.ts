import { defineConfig, devices } from '@playwright/test';
import { isLocalBaseURL, missingE2eEnv, playwrightBaseURL } from './e2e/required-env';

const baseURL = playwrightBaseURL();
const startLocalServer = isLocalBaseURL(baseURL) && missingE2eEnv(baseURL).length === 0;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    locale: 'en-US',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: startLocalServer
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
});
