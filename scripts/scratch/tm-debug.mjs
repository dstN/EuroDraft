import { chromium } from '../../node_modules/playwright/index.mjs'

const b = await chromium.launch({
  headless: false, // use headed to bypass CF better
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
})
const ctx = await b.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'de-DE',
  extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' }
})
const page = await ctx.newPage()
await page.goto('https://www.transfermarkt.de/zinedine-zidane/spielerprofil/spieler/3455', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(3000)

const posText = await page.evaluate(() => {
  const selectors = [
    '.detail-position__box',
    '.detail-position__position',
    '.spielprofil_content',
    '.data-header__label',
    '.info-table',
    '.info-table__content',
    'dt',
    'dd'
  ]
  const results = {}
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel)
    if (els.length > 0) {
      results[sel] = Array.from(els).slice(0, 5).map(e => e.textContent?.trim()?.substring(0, 100))
    }
  }
  // Also grab all text near "Position" keyword
  const body = document.body.innerHTML
  const idx = body.indexOf('Position')
  if (idx >= 0) {
    results['_positionContext'] = body.substring(Math.max(0, idx - 50), idx + 300)
  }
  return results
})

console.log(JSON.stringify(posText, null, 2))
await b.close()
