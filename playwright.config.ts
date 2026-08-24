import { defineConfig, devices } from '@playwright/test'

// Configurable so a busy default port doesn't block a local run --
// `PORT=3100 npm run test:e2e` picks a free one without touching this file.
const port = process.env.PORT || '3000'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  retries: 1,
  globalSetup: './tests/e2e/global-setup.ts',
  // Explicit so CI has an HTML report to upload as an artifact on failure
  // (Playwright's own default reporter in CI is 'dot', which produces no
  // file output at all -- github's "list" is the closest human-readable
  // terminal reporter to what local runs already use).
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    // Reusing whatever's already on the port is convenient locally (skips
    // a redundant dev-server boot) but unconditionally trusts that it's
    // actually EuroDraft -- unsafe in CI, where nothing should be running
    // yet and a stale process reused by accident would mask a real
    // failure. globalSetup above catches an outright wrong server either
    // way; this just avoids relying on that as the only line of defense.
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
})
