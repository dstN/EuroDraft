import type { FullConfig } from '@playwright/test'

// Guards against exactly the failure this file's sibling issue documented:
// with `reuseExistingServer: true`, Playwright treats anything already
// listening on the target port as the server under test. On a machine
// where something unrelated (observed here: a VS Code extension's static
// file server) already held port 3000, every test silently navigated
// against that instead of EuroDraft and failed with a confusing selector
// timeout -- not an obviously-wrong-server error. This checks once, before
// any test runs, so a port conflict fails fast and unambiguously instead.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const healthUrl = new URL('/api/health', baseURL).toString()

  // Nitro's dev server (unlike the production build) compiles server
  // routes lazily on first request -- Playwright's own webServer.url
  // readiness check only confirms *something* answers baseURL, not that
  // /api/health specifically has finished compiling yet, so the very
  // first hit can transiently race that. A few short retries absorb that
  // without weakening the actual guard: a genuinely wrong/foreign server
  // fails every attempt identically, not just the first.
  let body: unknown
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(healthUrl)
      body = await res.json()
      lastError = undefined
      break
    } catch (err) {
      lastError = err
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  if (lastError) {
    throw new Error(
      `Playwright's target server at ${baseURL} did not answer ${healthUrl} with JSON `
      + `after 5 attempts (${lastError instanceof Error ? lastError.message : String(lastError)}). `
      + 'If this is a local run, check whether something else is already bound to that port.'
    )
  }

  if (!body || typeof body !== 'object' || !('playerDatabase' in body)) {
    throw new Error(
      `The server at ${baseURL} responded, but ${healthUrl} doesn't look like EuroDraft's `
      + `health check (missing "playerDatabase"). Got: ${JSON.stringify(body)}. `
      + 'This usually means something other than EuroDraft is already listening on that port -- '
      + 'check for a stale process before re-running.'
    )
  }
}
