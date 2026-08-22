import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Formation Picker', path: '/draft/formation' },
  { name: 'Impressum', path: '/impressum' }
]

for (const { name, path } of pages) {
  test(`a11y: ${name} has no critical violations`, async ({ page }) => {
    await page.goto(path)
    // Let the page settle
    await page.waitForTimeout(500)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    if (critical.length > 0) {
      console.error('A11y violations on', name, ':', critical.map(v => `${v.id}: ${v.description}`).join(', '))
    }

    // Fail on critical/serious violations
    expect(critical).toHaveLength(0)
  })
}
