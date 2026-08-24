import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag2aaa', 'wcag21aaa', 'best-practice']

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.emulateMedia({ colorScheme: theme })
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  if ((theme === 'dark' && !isDark) || (theme === 'light' && isDark)) {
    const toggleBtn = page.getByRole('button', { name: /switch to/i })
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      await page.waitForTimeout(300)
    }
  }
}

async function waitLoadingGone(page: Page) {
  await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function runAxe(page: Page) {
  return new AxeBuilder({ page })
    .exclude('#nuxt-devtools-container')
    .exclude('.nuxt-devtools-frame')
    .withTags(A11Y_TAGS)
    .analyze()
}

function reportViolations(name: string, results: Awaited<ReturnType<typeof runAxe>>) {
  if (results.violations.length > 0) {
    console.log(`\n=== 🚨 [${name}] A11y Violations (${results.violations.length}) ===`)
    for (const v of results.violations) {
      console.log(`\nRule: ${v.id} (${v.impact}) - ${v.description}`)
      for (const node of v.nodes) {
        console.log(`  - Target: ${node.target.join(' ')}`)
        console.log(`    HTML: ${node.html}`)
        console.log(`    Failure: ${node.failureSummary}`)
      }
    }
  }
}

/**
 * Completes a draft through the Pinia stores directly rather than
 * simulating 11 rounds of UI clicks. Both were tried: driving the real UI
 * (select a squad player, then a compatible pitch slot -- mirroring
 * app/pages/draft/index.vue's actual click handlers) hit two real bugs
 * along the way -- DraftSquadList.vue's per-row "view stats" button has
 * no disabled state, so a naive `button:not([disabled])` selector
 * sometimes matched it instead of the draft button and opened
 * PlayerStatCardModal, wedging every later click -- but even after fixing
 * that, the full sequence was consistently unreliable in this
 * environment (repeated "Target page, context or browser has been
 * closed" failures at the 45s/120s test timeout, cause undetermined).
 *
 * useNuxtApp() is available on `window` in dev (verified live), which
 * gives direct access to the same Pinia store instances the UI reads
 * from and calls the same actions the real click handlers call
 * (draft.draftPlayer, roulette.spin/rerollYear) -- so this exercises real
 * app logic, just without going through 11 rounds of click-wait-click.
 * Navigating to /tournament afterwards is done explicitly because
 * confirmDraft()'s auto-navigation on the 11th pick is UI-handler logic
 * this bypasses; app/pages/tournament/index.vue's onMounted guard handles
 * an already-complete draft identically regardless of how it got there.
 */
async function completeFullDraft(page: Page) {
  await page.goto('/draft/formation')
  await waitLoadingGone(page)
  const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
  await firstCard.click()
  await expect(page).toHaveURL(/\/draft$/, { timeout: 15000 })
  await waitLoadingGone(page)

  await page.waitForFunction(() => {
    const app = (window as unknown as { useNuxtApp?: () => { $pinia?: { _s: Map<string, unknown> } } }).useNuxtApp?.()
    return !!app?.$pinia?._s?.get('draft')
  }, { timeout: 10000 })

  await page.evaluate(async () => {
    interface StoreLike { [key: string]: unknown }
    const app = (window as unknown as {
      useNuxtApp: () => { $pinia: { _s: Map<string, StoreLike> }, $router: { push: (path: string) => Promise<void> } }
    }).useNuxtApp()
    const draft = app.$pinia._s.get('draft') as {
      filledSlots: unknown[]
      draftPlayer: (slotId: string, player: unknown) => void
      rerollsRemaining: number
    }
    const roulette = app.$pinia._s.get('roulette') as {
      currentCountry: string | null
      squadWithEligibility: { player: unknown, canDraft: boolean, compatibleSlots: { id: string }[] }[]
      noValidSquadsRemaining: boolean
      spin: () => void
    }

    let guard = 0
    while (draft.filledSlots.length < 11 && guard++ < 300) {
      if (!roulette.currentCountry) roulette.spin()

      const pick = roulette.squadWithEligibility.find(e => e.canDraft && e.compatibleSlots.length > 0)
      if (pick) {
        draft.draftPlayer(pick.compatibleSlots[0]!.id, pick.player)
        continue
      }

      // Deliberately not using rerollYear()/rerollNation() here: both
      // silently no-op (no state change, reroll not consumed) when no
      // alternative exists for the *current* country/year -- caught
      // live, that stalled this loop forever on a stuck squad. spin()
      // makes a real guarantee instead: it either lands on a squad with
      // at least one draftable player, or -- once every team/year
      // combination has been tried and failed -- sets
      // noValidSquadsRemaining, which is exactly the same "stuck" signal
      // the real UI shows the user in this situation.
      if (roulette.noValidSquadsRemaining) {
        throw new Error(`No valid squads remaining at ${draft.filledSlots.length}/11 (all teams exhausted)`)
      }
      roulette.spin()
    }

    if (draft.filledSlots.length < 11) {
      throw new Error(`Draft stalled at ${draft.filledSlots.length}/11 after ${guard} attempts`)
    }

    // A separate page.goto() here would be a full browser navigation --
    // reloading from the server discards everything draftPlayer() just
    // did, since it only ever existed in this tab's in-memory Pinia
    // state (caught live: the next page load redirected straight back to
    // /draft/formation because the fresh SSR render had an empty draft
    // again). $router.push is the same client-side navigation
    // confirmDraft() itself uses on the real 11th pick, so the state
    // carries over exactly as it would from a genuine playthrough.
    await app.$router.push('/tournament')
  })

  await waitLoadingGone(page)
  await expect(page).toHaveURL(/\/tournament$/, { timeout: 20000 })
}

const staticPages = [
  { name: 'Home (Dark)', path: '/', theme: 'dark' as const },
  { name: 'Home (Light)', path: '/', theme: 'light' as const },
  { name: 'Formation Picker (Dark)', path: '/draft/formation', theme: 'dark' as const },
  { name: 'Formation Picker (Light)', path: '/draft/formation', theme: 'light' as const },
  { name: 'Legal Hub (Dark)', path: '/legal', theme: 'dark' as const },
  { name: 'Legal Hub (Light)', path: '/legal', theme: 'light' as const }
]

for (const { name, path, theme } of staticPages) {
  test(`a11y audit (AAA + Best Practice): ${name}`, async ({ page }) => {
    await page.goto(path)
    await waitLoadingGone(page)
    await page.waitForSelector('main', { state: 'visible' })
    await setTheme(page, theme)
    await page.waitForTimeout(300)

    const results = await runAxe(page)
    reportViolations(name, results)
    expect(results.violations).toEqual([])
  })
}

const interactivePages = [
  { name: 'Draft Room (Dark)', theme: 'dark' as const },
  { name: 'Draft Room (Light)', theme: 'light' as const }
]

for (const { name, theme } of interactivePages) {
  test(`a11y audit (AAA + Best Practice): ${name}`, async ({ page }) => {
    await page.goto('/draft/formation')
    await waitLoadingGone(page)
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')
    await waitLoadingGone(page)
    await page.waitForSelector('.custom-scroll', { state: 'visible' })
    await setTheme(page, theme)
    await page.waitForTimeout(400)

    const results = await runAxe(page)
    reportViolations(name, results)
    expect(results.violations).toEqual([])
  })
}

// These used to be named "Tournament Hub" and point at /tournament directly
// -- but a fresh visitor with no completed draft gets redirected straight
// back to /draft/formation (app/pages/tournament/index.vue's onMounted
// guard), so every one of these was silently auditing the formation picker
// a second time instead of the tournament results screen. Driving a real
// draft to completion first, and asserting the final URL before running
// axe, means a future redirect regression fails loudly here instead of
// passing quietly against the wrong page again.
const tournamentPages = [
  { name: 'Tournament Results (Dark)', theme: 'dark' as const },
  { name: 'Tournament Results (Light)', theme: 'light' as const }
]

for (const { name, theme } of tournamentPages) {
  test(`a11y audit (AAA + Best Practice): ${name}`, async ({ page }) => {
    await completeFullDraft(page)
    await expect(page).toHaveURL(/\/tournament$/)
    await setTheme(page, theme)
    await page.waitForTimeout(400)

    const results = await runAxe(page)
    reportViolations(name, results)
    expect(results.violations).toEqual([])
  })
}
