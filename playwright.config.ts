import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    // vite.config.ts pins the dev server to port 3000 with strictPort, so this is the only
    // port that works here; `npm run build && preview` would be closer to production but is
    // much slower to start for what's meant to be a small set of smoke tests.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Playwright suppresses the dev server's own output by default, so a slow or stuck boot
    // (first-run Vite dep pre-bundling, a port conflict, etc.) looks like a silent hang instead
    // of showing what's actually happening.
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
