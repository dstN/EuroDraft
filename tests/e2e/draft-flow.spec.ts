import { test, expect } from '@playwright/test'

test.describe('Full Draft Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/draft/formation')
  })

  test('formation picker renders 3 formation cards', async ({ page }) => {
    const cards = page.locator('button').filter({ has: page.locator('.pitch-bg') })
    await expect(cards).toHaveCount(3)
  })

  test('each formation card shows a mini pitch', async ({ page }) => {
    const pitches = page.locator('.pitch-bg')
    await expect(pitches).toHaveCount(3)
  })

  test('selecting a formation navigates to /draft', async ({ page }) => {
    // Click first formation button
    const firstCard = page.locator('button').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await expect(page).toHaveURL('/draft')
  })

  test('draft page shows squad list and tactical pitch', async ({ page }) => {
    // Select first formation
    const firstCard = page.locator('button').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await page.waitForURL('/draft')

    // Squad list should be visible
    await expect(page.locator('.custom-scroll')).toBeVisible()
    // Pitch should be visible
    await expect(page.locator('.pitch-bg').first()).toBeVisible()
  })

  test('clicking a player highlights pitch slots', async ({ page }) => {
    const firstCard = page.locator('button').filter({ has: page.locator('.pitch-bg') }).first()
    await firstCard.click()
    await page.waitForURL('/draft')

    // Find an eligible player (not disabled/greyed)
    const eligiblePlayer = page.locator('button[type=button]:not([disabled])').filter({ hasText: /\d{2}/ }).first()
    await eligiblePlayer.click()

    // An emerald/green pulse should appear on the pitch (animate-pulse class)
    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })
})
