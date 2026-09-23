import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // Vite's dev server (see webServer below) transforms modules on demand per request rather than
  // serving a pre-bundled app, so a route with a heavy first-time import tree (like /ips, which
  // pulls in ~20 resource-template components) can take a while to finish its first compile on a
  // constrained CI runner - well past the 5s default. Only bump it in CI so local runs, which hit
  // Vite's warm cache, keep failing fast on a genuine issue.
  expect: { timeout: process.env.CI ? 20_000 : 5_000 },
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
    // A cold Vite dep pre-bundle (no warm node_modules/.vite cache yet) can run well past 60s,
    // especially on Windows where the many-small-file scan across node_modules is much slower
    // than on Linux/Mac - this is the likely cause if Playwright's own spawned dev server never
    // becomes healthy in time, while one already running in another terminal works fine.
    timeout: 120_000,
    // Playwright suppresses the dev server's own output by default, so a slow or stuck boot
    // (first-run Vite dep pre-bundling, a port conflict, etc.) looks like a silent hang instead
    // of showing what's actually happening.
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
