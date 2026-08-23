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

const staticPages = [
  { name: 'Home (Dark)', path: '/', theme: 'dark' as const },
  { name: 'Home (Light)', path: '/', theme: 'light' as const },
  { name: 'Formation Picker (Dark)', path: '/draft/formation', theme: 'dark' as const },
  { name: 'Formation Picker (Light)', path: '/draft/formation', theme: 'light' as const },
  { name: 'Impressum (Dark)', path: '/legal/impressum', theme: 'dark' as const },
  { name: 'Impressum (Light)', path: '/legal/impressum', theme: 'light' as const },
  { name: 'Tournament Hub (Dark)', path: '/tournament', theme: 'dark' as const },
  { name: 'Tournament Hub (Light)', path: '/tournament', theme: 'light' as const }
]

for (const { name, path, theme } of staticPages) {
  test(`a11y audit (AAA + Best Practice): ${name}`, async ({ page }) => {
    await page.goto(path)
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    await page.waitForSelector('main', { state: 'visible' })
    await setTheme(page, theme)
    await page.waitForTimeout(300)

    const results = await new AxeBuilder({ page })
      .exclude('#nuxt-devtools-container')
      .exclude('.nuxt-devtools-frame')
      .withTags(A11Y_TAGS)
      .analyze()

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
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    await page.waitForSelector('.custom-scroll', { state: 'visible' })
    await setTheme(page, theme)
    await page.waitForTimeout(400)

    const results = await new AxeBuilder({ page })
      .exclude('#nuxt-devtools-container')
      .exclude('.nuxt-devtools-frame')
      .withTags(A11Y_TAGS)
      .analyze()

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

    expect(results.violations).toEqual([])
  })
}
