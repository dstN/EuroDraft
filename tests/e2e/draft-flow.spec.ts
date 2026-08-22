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
    await expect(page).toHaveURL('/draft')
  })

  test('draft page shows squad list and tactical pitch', async ({ page }) => {
    const firstCard = page.locator('.surface-card').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')

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
})
