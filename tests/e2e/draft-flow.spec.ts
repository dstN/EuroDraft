import { test, expect } from '@playwright/test'

test.describe('Full Draft Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/draft/formation')
  })

  test('formation picker renders 3 formation cards', async ({ page }) => {
    const cards = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') })
    await expect(cards).toHaveCount(3)
  })

  test('each formation card shows a mini pitch', async ({ page }) => {
    const pitches = page.locator('.pitch-bg')
    await expect(pitches).toHaveCount(3)
  })

  test('selecting a formation navigates to /draft', async ({ page }) => {
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL(/\/draft$/, { timeout: 10000 })
  })

  test('draft page shows squad list and tactical pitch', async ({ page }) => {
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL(/\/draft$/, { timeout: 10000 })

    // Squad list should be visible
    await expect(page.locator('.custom-scroll')).toBeVisible()
    // Pitch should be visible
    await expect(page.locator('.pitch-bg').first()).toBeVisible()
  })

  test('draft controls and reroll options are available', async ({ page }) => {
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')
    await expect(page.locator('.custom-scroll')).toBeVisible()

    // Pitch is visible and interactive
    await expect(page.locator('.pitch-bg').first()).toBeVisible()
    const rerollButtons = page.locator('button').filter({ hasText: /reroll/i })
    await expect(rerollButtons.first()).toBeVisible()
  })

  test('mobile viewport (390px iPhone 12) renders perfectly without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})

    // Check no horizontal scrollbar on Home
    const hasHorizontalOverflowHome = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflowHome).toBe(false)

    // Navigate to /draft/formation
    await page.goto('/draft/formation')
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    const hasHorizontalOverflowFormation = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflowFormation).toBe(false)

    // Select formation
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')
    await page.locator('[role="status"][aria-label="Loading EuroDraft"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})

    // Check no horizontal scroll on Draft room
    const hasHorizontalOverflowDraft = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflowDraft).toBe(false)

    // Squad list is immediately visible on mobile
    await expect(page.locator('.custom-scroll')).toBeVisible()

    // Selecting an eligible player switches to pitch
    const eligiblePlayer = page.locator('.custom-scroll button:not([disabled])').first()
    if (await eligiblePlayer.count() > 0) {
      await eligiblePlayer.click()
      // Pitch is now shown, and Back to Squad button is visible
      const backBtn = page.getByRole('button', { name: /Back to Squad/i })
      await expect(backBtn).toBeVisible()

      // Back button click returns to squad view without leaving /draft
      await backBtn.click()
      await expect(page).toHaveURL('/draft')
      await expect(page.locator('.custom-scroll')).toBeVisible()

      // Selecting player again and using browser back gesture
      await eligiblePlayer.click()
      await expect(backBtn).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL('/draft')
      await expect(page.locator('.custom-scroll')).toBeVisible()
    }
  })
})
