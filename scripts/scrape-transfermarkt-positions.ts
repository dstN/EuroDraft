#!/usr/bin/env tsx
/**
 * EuroDraft — Transfermarkt Position Scraper
 *
 * Strategy:
 *  1. Search DuckDuckGo: site:transfermarkt.com "{name}" profil
 *  2. Fetch transfermarkt.com (English) with cheerio — no Cloudflare blocking
 *  3. Parse dt.detail-position__title + dd.detail-position__position
 *  4. Fall back to Playwright if cheerio fails
 *
 * Usage:
 *   npx tsx scripts/scrape-transfermarkt-positions.ts --name "Zinedine Zidane"
 *   npx tsx scripts/scrape-transfermarkt-positions.ts --file players.txt
 *
 * Output: player-positions.ts registry entries to stdout
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, 'cache', 'transfermarkt')

// ---- Position mapping: Transfermarkt English labels → our PositionCode ----
const TM_POSITION_MAP: Record<string, string> = {
  // Goalkeepers
  'Goalkeeper': 'GK',
  'Keeper': 'GK',
  'Torwart': 'GK',
  // Centre-Backs
  'Centre-Back': 'CB',
  'Central Defender': 'CB',
  'Sweeper': 'CB',
  'Libero': 'CB',
  'Stopper': 'CB',
  'Innenverteidiger': 'CB',
  // Left-Back
  'Left-Back': 'LB',
  'Linksverteidiger': 'LB',
  // Right-Back
  'Right-Back': 'RB',
  'Rechtsverteidiger': 'RB',
  // Defensive Midfielder
  'Defensive Midfield': 'CDM',
  'Holding Midfield': 'CDM',
  'Defensives Mittelfeld': 'CDM',
  // Central Midfielder
  'Central Midfield': 'CM',
  'Zentrales Mittelfeld': 'CM',
  'Box-to-Box Midfielder': 'CM',
  // Attacking Midfielder
  'Attacking Midfield': 'CAM',
  'Offensives Mittelfeld': 'CAM',
  'Second Striker': 'CAM',
  'Shadow Striker': 'CAM',
  'Hängende Spitze': 'CAM',
  // Left Midfielder
  'Left Midfield': 'LM',
  'Linkes Mittelfeld': 'LM',
  // Right Midfielder
  'Right Midfield': 'RM',
  'Rechtes Mittelfeld': 'RM',
  // Left Winger
  'Left Winger': 'LW',
  'Linksaußen': 'LW',
  // Right Winger
  'Right Winger': 'RW',
  'Rechtsaußen': 'RW',
  // Striker / CF
  'Centre-Forward': 'ST',
  'Striker': 'ST',
  'Mittelstürmer': 'ST',
  'Second Striker (backup)': 'CF',
  'False 9': 'CF'
}

function mapTMPosition(label: string): string | null {
  const trimmed = label.trim()
  if (TM_POSITION_MAP[trimmed]) return TM_POSITION_MAP[trimmed]!
  // Partial/case-insensitive match
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(TM_POSITION_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return val
    }
  }
  return null
}

function positionToBase(pos: string): string {
  if (pos === 'GK') return 'Goalkeeper'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'Defender'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'Midfielder'
  return 'Forward'
}

interface ScrapedPosition {
  name: string
  primary: string
  positions: string[]
  base: string
  source: string
  tmUrl?: string
}

// ---- HTTP headers for transfermarkt.com ----
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/'
}

// ---- Step 1: Find transfermarkt.com profile URL ----
async function findTransfermarktUrl(playerName: string): Promise<string | null> {
  console.error(`🔍 Searching for: ${playerName}`)

  // Approach A: DuckDuckGo HTML search for transfermarkt.com profil URL
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:transfermarkt.com "${playerName}" profil`)}`

  try {
    const res = await axios.get(ddgUrl, { headers: HEADERS, timeout: 15000 })
    const html: string = res.data

    // Regex: find https://www.transfermarkt.com/xxx/profil/spieler/NNN
    const tmRegex = /https?:\/\/www\.transfermarkt\.com\/[^/]+\/profil\/spieler\/\d+/g
    const regexMatches = html.match(tmRegex) ?? []

    // Also parse anchor hrefs (DuckDuckGo wraps in uddg= param)
    const $ = cheerio.load(html)
    const hrefMatches: string[] = []
    $('a').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const decoded = href.includes('uddg=')
        ? decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] ?? '')
        : href
      if (decoded.includes('transfermarkt.com') && decoded.includes('/profil/spieler/')) {
        hrefMatches.push(decoded.split('?')[0]!) // strip query params
      }
    })

    const allUrls = [...regexMatches, ...hrefMatches].filter(u =>
      u.includes('transfermarkt.com') && u.includes('/profil/spieler/')
    )

    if (allUrls.length > 0) {
      const url = allUrls[0]!
      console.error(`  ✓ Found via DuckDuckGo: ${url}`)
      return url
    }
  }
  catch (err: any) {
    console.error(`  ✗ DuckDuckGo search failed: ${err.message}`)
  }

  // Approach B: TM quick search, prefer players born ≤ 1990 (historical era)
  console.error(`  → Trying TM search API...`)
  try {
    const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}&Spieler_page=0`
    const res = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 })
    const $ = cheerio.load(res.data)

    // Collect all player result rows with name + age
    interface Candidate { url: string; age: number }
    const candidates: Candidate[] = []

    // Each player result has a row in table.items
    $('table.items tbody tr').each((_, row) => {
      const link = $(row).find('a[href*="/profil/spieler/"]').first()
      const href = link.attr('href') ?? ''
      if (!href.includes('/profil/spieler/')) return

      // Age is in a td.zentriert — find the first one that's a plausible age (15-80)
      let age = 0
      $(row).find('td.zentriert').each((_, td) => {
        const text = $(td).text().trim()
        const n = parseInt(text)
        if (!isNaN(n) && n >= 15 && n <= 80) {
          age = n
          return false // break
        }
      })

      candidates.push({ url: `https://www.transfermarkt.com${href}`, age })
    })

    if (candidates.length > 0) {
      // Prefer retired legends (age >= 40) over active modern players
      const legends = candidates.filter(c => c.age >= 40)
      const chosen = legends.length > 0 ? legends[0]! : candidates[0]!
      console.error(`  ✓ Found via TM search (age ${chosen.age}): ${chosen.url}`)
      return chosen.url
    }
  }
  catch (err: any) {
    console.error(`  ✗ TM search failed: ${err.message}`)
  }

  // Approach C: Playwright headless as last resort
  console.error(`  🎭 Trying Playwright...`)
  return await findUrlWithPlaywright(playerName)
}

async function findUrlWithPlaywright(playerName: string): Promise<string | null> {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}`,
      { waitUntil: 'domcontentloaded', timeout: 20000 }
    )
    const links = await page.$$eval('a[href*="/profil/spieler/"]', els =>
      els.slice(0, 3).map(el => 'https://www.transfermarkt.com' + (el.getAttribute('href') ?? ''))
    )
    await browser.close()
    if (links.length > 0) {
      console.error(`  ✓ Found via Playwright: ${links[0]}`)
      return links[0]!
    }
    return null
  }
  catch (err: any) {
    console.error(`  ✗ Playwright failed: ${err.message}`)
    return null
  }
}

// ---- Step 2: Parse positions from HTML ----
function parsePositionsFromHtml(html: string): { primary: string | null; others: string[] } {
  const $ = cheerio.load(html)
  const positions: string[] = []

  // Primary: dt.detail-position__title + dd.detail-position__position
  $('dl').each((_, dl) => {
    const title = $(dl).find('dt.detail-position__title').text().trim()
    const pos = $(dl).find('dd.detail-position__position').text().trim()
    if (pos) {
      const mapped = mapTMPosition(pos)
      if (mapped && !positions.includes(mapped)) {
        if (title.toLowerCase().includes('main')) {
          positions.unshift(mapped) // main position first
        } else {
          positions.push(mapped)
        }
      }
    }
  })

  // Fallback: any dd.detail-position__position
  if (positions.length === 0) {
    $('dd.detail-position__position').each((_, el) => {
      const text = $(el).text().trim()
      const mapped = mapTMPosition(text)
      if (mapped && !positions.includes(mapped)) {
        positions.push(mapped)
      }
    })
  }

  return {
    primary: positions[0] ?? null,
    others: positions.slice(1)
  }
}

// ---- Step 3: Fetch page HTML ----
async function fetchProfileHtml(tmUrl: string): Promise<string | null> {
  // Try cheerio/axios first (works on transfermarkt.com)
  try {
    const res = await axios.get(tmUrl, {
      headers: HEADERS,
      timeout: 15000
    })
    if (res.status === 200 && res.data.includes('detail-position')) {
      console.error(`  ✓ Fetched via axios (${res.data.length} bytes)`)
      return res.data
    }
    console.error(`  ⚠ Axios got ${res.status} but no position data, trying Playwright...`)
  }
  catch (err: any) {
    const status = err.response?.status
    if (status === 403 || status === 503 || status === 429) {
      console.error(`  ⚠ Blocked (${status}), trying Playwright...`)
    } else {
      console.error(`  ✗ axios failed: ${err.message}`)
    }
  }

  // Playwright fallback
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext({
      userAgent: HEADERS['User-Agent'],
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' }
    })
    const page = await ctx.newPage()
    await page.goto(tmUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const html = await page.content()
    await browser.close()
    console.error(`  ✓ Fetched via Playwright (${html.length} bytes)`)
    return html
  }
  catch (err: any) {
    console.error(`  ✗ Playwright fetch failed: ${err.message}`)
    return null
  }
}

// ---- Main: scrape one player ----
async function scrapePlayerPositions(playerName: string): Promise<ScrapedPosition | null> {
  await mkdir(CACHE_DIR, { recursive: true })
  const cacheKey = playerName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const cacheFile = join(CACHE_DIR, `${cacheKey}.json`)

  if (existsSync(cacheFile)) {
    const cached = JSON.parse(await readFile(cacheFile, 'utf8'))
    console.error(`  📦 Cache hit: ${playerName}`)
    return cached
  }

  const tmUrl = await findTransfermarktUrl(playerName)
  if (!tmUrl) return null

  const html = await fetchProfileHtml(tmUrl)
  if (!html) return null

  const result = parsePositionsFromHtml(html)
  if (!result.primary) {
    console.error(`  ✗ Could not extract positions from page`)
    return null
  }

  const allPositions = [result.primary, ...result.others].filter(Boolean)
  const scraped: ScrapedPosition = {
    name: playerName,
    primary: result.primary,
    positions: allPositions,
    base: positionToBase(result.primary),
    source: 'transfermarkt',
    tmUrl
  }

  await writeFile(cacheFile, JSON.stringify(scraped, null, 2), 'utf8')
  return scraped
}

// ---- CLI Entry Point ----
async function main() {
  const args = process.argv.slice(2)
  let playerNames: string[] = []
  let directUrl: string | null = null

  const nameIdx = args.indexOf('--name')
  const fileIdx = args.indexOf('--file')
  const urlIdx = args.indexOf('--url') // allow direct URL override

  if (urlIdx !== -1 && args[urlIdx + 1]) {
    directUrl = args[urlIdx + 1]!
  }

  if (nameIdx !== -1 && args[nameIdx + 1]) {
    playerNames = [args[nameIdx + 1]!]
  }
  else if (fileIdx !== -1 && args[fileIdx + 1]) {
    const content = await readFile(args[fileIdx + 1]!, 'utf8')
    playerNames = content.split('\n').map(l => l.trim()).filter(Boolean)
  }
  else {
    // Demo: test a few French 1998 legends
    playerNames = ['Lilian Thuram', 'Laurent Blanc', 'Didier Deschamps', 'Marcel Desailly', 'Zinedine Zidane']
  }

  const results: ScrapedPosition[] = []

  for (const name of playerNames) {
    console.error(`\n──── ${name} ────`)
    const res = await scrapePlayerPositions(name)
    if (res) {
      console.error(`  ✓ primary=${res.primary} | positions=[${res.positions.join(', ')}]`)
      results.push(res)
    } else {
      console.error(`  ✗ Failed`)
    }
    // Rate limit: 1.5s between requests
    await new Promise(r => setTimeout(r, 1500))
  }

  // Output player-positions.ts registry entries
  console.log('\n// ==================== Scraped from Transfermarkt ====================')
  for (const r of results) {
    const key = r.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '').trim()
    const posArray = `['${r.positions.join("', '")}']`
    console.log(`  '${key}': { primary: '${r.primary}', positions: ${posArray}, base: '${r.base}' },  // ${r.tmUrl}`)
  }

  console.error(`\n✅ Done: ${results.length}/${playerNames.length} players scraped`)
  if (results.length < playerNames.length) {
    console.error(`ℹ  Failed players may need manual lookup or are not on Transfermarkt.com`)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
