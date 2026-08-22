#!/usr/bin/env tsx
/**
 * EuroDraft — Player Position Enrichment Script
 *
 * Fetches player position data from an external football data source.
 * The source URL is configured via the POSITION_SOURCE_BASE_URL environment variable.
 *
 * Strategy:
 *  1. Search DuckDuckGo for a player profile URL on the configured source
 *  2. Fetch the profile with cheerio (fast, no JS required)
 *  3. Fall back to Playwright if the initial fetch is blocked
 *  4. Parse main position + secondary positions from the profile HTML
 *
 * Usage:
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --name "Zinedine Zidane"
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --file players.txt
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --db  # enrich all DB players
 *
 * Output: enriched player-positions.ts entries to stdout
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, 'cache', 'positions')

// Source base URL — injected from environment, never hardcoded
const SOURCE_BASE_URL = process.env['POSITION_SOURCE_BASE_URL'] ?? ''
if (!SOURCE_BASE_URL) {
  console.error('❌ POSITION_SOURCE_BASE_URL environment variable not set.')
  console.error('   Set it to the base URL of your player data source.')
  process.exit(1)
}

const SOURCE_HOST = new URL(SOURCE_BASE_URL).hostname

// ---- Position label mapping → our PositionCode ----
const POSITION_LABEL_MAP: Record<string, string> = {
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
  'False 9': 'CF'
}

function mapPositionLabel(label: string): string | null {
  const trimmed = label.trim()
  if (POSITION_LABEL_MAP[trimmed]) return POSITION_LABEL_MAP[trimmed]!
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(POSITION_LABEL_MAP)) {
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

interface EnrichedPosition {
  name: string
  primary: string
  positions: string[]
  base: string
  sourceUrl?: string
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/'
}

// ---- Step 1: Find profile URL ----
async function findProfileUrl(playerName: string): Promise<string | null> {
  console.error(`🔍 Searching for: ${playerName}`)

  // A: DuckDuckGo HTML search
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${SOURCE_HOST} "${playerName}" profil`)}`
  try {
    const res = await axios.get(ddgUrl, { headers: HEADERS, timeout: 15000 })
    const html: string = res.data

    // Regex match for profile URLs
    const profileRegex = new RegExp(`https?:\\/\\/(?:www\\.)?${SOURCE_HOST.replace('.', '\\.')}\\/[^/]+\\/profil\\/spieler\\/\\d+`, 'g')
    const regexMatches = html.match(profileRegex) ?? []

    // Cheerio href extraction (DuckDuckGo wraps with uddg= param)
    const $ = cheerio.load(html)
    const hrefMatches: string[] = []
    $('a').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const decoded = href.includes('uddg=')
        ? decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] ?? '')
        : href
      if (decoded.includes(SOURCE_HOST) && decoded.includes('/profil/spieler/')) {
        hrefMatches.push(decoded.split('?')[0]!)
      }
    })

    const allUrls = [...regexMatches, ...hrefMatches].filter(u =>
      u.includes(SOURCE_HOST) && u.includes('/profil/spieler/')
    )
    if (allUrls.length > 0) {
      console.error(`  ✓ Found via search: ${allUrls[0]}`)
      return allUrls[0]!
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗ DuckDuckGo search failed: ${msg}`)
  }

  // B: Source search API (age-based disambiguation — prefer retired players age >= 40)
  console.error(`  → Trying source search API...`)
  try {
    const searchUrl = `${SOURCE_BASE_URL}/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}&Spieler_page=0`
    const res = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 })
    const $ = cheerio.load(res.data)

    interface Candidate { url: string, age: number }
    const candidates: Candidate[] = []

    $('table.items tbody tr').each((_, row) => {
      const link = $(row).find('a[href*="/profil/spieler/"]').first()
      const href = link.attr('href') ?? ''
      if (!href.includes('/profil/spieler/')) return

      let age = 0
      $(row).find('td.zentriert').each((_, td) => {
        const n = parseInt($(td).text().trim())
        if (!isNaN(n) && n >= 15 && n <= 80) {
          age = n
          return false
        }
      })
      candidates.push({ url: `${SOURCE_BASE_URL}${href}`, age })
    })

    if (candidates.length > 0) {
      // Prefer retired historical players (age >= 40)
      const historical = candidates.filter(c => c.age >= 40)
      const chosen = historical.length > 0 ? historical[0]! : candidates[0]!
      console.error(`  ✓ Found via API (age ${chosen.age}): ${chosen.url}`)
      return chosen.url
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗ Search API failed: ${msg}`)
  }

  // C: Playwright fallback
  console.error(`  🎭 Falling back to Playwright...`)
  return await findUrlWithPlaywright(playerName)
}

async function findUrlWithPlaywright(playerName: string): Promise<string | null> {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(
      `${SOURCE_BASE_URL}/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(playerName)}`,
      { waitUntil: 'domcontentloaded', timeout: 20000 }
    )
    const links = await page.$$eval('a[href*="/profil/spieler/"]', (els, base) =>
      els.slice(0, 3).map(el => base + (el.getAttribute('href') ?? '')),
    SOURCE_BASE_URL
    )
    await browser.close()
    if (links.length > 0) {
      console.error(`  ✓ Found via Playwright: ${links[0]}`)
      return links[0]!
    }
    return null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗ Playwright failed: ${msg}`)
    return null
  }
}

// ---- Step 2: Parse positions from HTML ----
function parsePositionsFromHtml(html: string): { primary: string | null, others: string[] } {
  const $ = cheerio.load(html)
  const positions: string[] = []

  $('dl').each((_, dl) => {
    const title = $(dl).find('dt.detail-position__title').text().trim()
    const pos = $(dl).find('dd.detail-position__position').text().trim()
    if (pos) {
      const mapped = mapPositionLabel(pos)
      if (mapped && !positions.includes(mapped)) {
        if (title.toLowerCase().includes('main')) positions.unshift(mapped)
        else positions.push(mapped)
      }
    }
  })

  if (positions.length === 0) {
    $('dd.detail-position__position').each((_, el) => {
      const mapped = mapPositionLabel($(el).text().trim())
      if (mapped && !positions.includes(mapped)) positions.push(mapped)
    })
  }

  return { primary: positions[0] ?? null, others: positions.slice(1) }
}

// ---- Step 3: Fetch HTML ----
async function fetchProfileHtml(profileUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(profileUrl, { headers: HEADERS, timeout: 15000 })
    if (res.status === 200 && res.data.includes('detail-position')) {
      console.error(`  ✓ Fetched (${res.data.length} bytes)`)
      return res.data
    }
    console.error(`  ⚠ Response missing position data, trying Playwright...`)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status
      if (status === 403 || status === 503 || status === 429) {
        console.error(`  ⚠ Blocked (HTTP ${status}), trying Playwright...`)
      } else {
        console.error(`  ✗ Fetch failed: ${err.message}`)
      }
    } else {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ Fetch failed: ${msg}`)
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
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const html = await page.content()
    await browser.close()
    console.error(`  ✓ Fetched via Playwright (${html.length} bytes)`)
    return html
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗ Playwright fetch failed: ${msg}`)
    return null
  }
}

// ---- Main enrichment function ----
async function enrichPlayer(playerName: string): Promise<EnrichedPosition | null> {
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

  const profileUrl = await findProfileUrl(playerName)
  if (!profileUrl) return null

  const html = await fetchProfileHtml(profileUrl)
  if (!html) return null

  const result = parsePositionsFromHtml(html)
  if (!result.primary) {
    console.error(`  ✗ No positions found in page`)
    return null
  }

  const allPositions = [result.primary, ...result.others].filter(Boolean)
  const enriched: EnrichedPosition = {
    name: playerName,
    primary: result.primary,
    positions: allPositions,
    base: positionToBase(result.primary),
    sourceUrl: profileUrl
  }

  await writeFile(cacheFile, JSON.stringify(enriched, null, 2), 'utf8')
  return enriched
}

// ---- CLI Entry Point ----
async function main() {
  const args = process.argv.slice(2)
  let playerNames: string[] = []

  const nameIdx = args.indexOf('--name')
  const fileIdx = args.indexOf('--file')
  const dbMode = args.includes('--db')

  if (nameIdx !== -1 && args[nameIdx + 1]) {
    playerNames = [args[nameIdx + 1]!]
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    const content = await readFile(args[fileIdx + 1]!, 'utf8')
    playerNames = content.split('\n').map(l => l.trim()).filter(Boolean)
  } else if (dbMode) {
    // Load ALL unique player names from the database
    const dbPath = join(__dirname, '..', 'public', 'eurodraft_db.json')
    if (!existsSync(dbPath)) {
      console.error('❌ Database not found. Run `npm run build:db` first.')
      process.exit(1)
    }
    const db = JSON.parse(await readFile(dbPath, 'utf8'))
    const nameSet = new Set<string>()

    // DB structure: { tournaments: [ { squads: [ { players: [...] } ] } ] }
    for (const tournament of db.tournaments ?? []) {
      for (const squad of tournament.squads ?? []) {
        for (const player of squad.players ?? []) {
          if (player.name) nameSet.add(player.name as string)
        }
      }
    }

    // Also handle flat { players: [...] } structure
    for (const player of db.players ?? []) {
      if (player.name) nameSet.add(player.name as string)
    }

    playerNames = [...nameSet].sort()
    console.error(`📋 Loaded ${playerNames.length} unique players from database`)
  } else {
    console.error('Usage:')
    console.error('  npx tsx scripts/enrich-positions.ts --name "Player Name"')
    console.error('  npx tsx scripts/enrich-positions.ts --file players.txt')
    console.error('  npx tsx scripts/enrich-positions.ts --db  # enrich all DB players')
    console.error('')
    console.error('Required env: POSITION_SOURCE_BASE_URL')
    process.exit(0)
  }

  console.error(`\n📊 Enriching ${playerNames.length} players...\n`)

  const results: EnrichedPosition[] = []
  let failed = 0

  for (let i = 0; i < playerNames.length; i++) {
    const name = playerNames[i]!
    process.stderr.write(`\r[${i + 1}/${playerNames.length}] `)
    console.error(`──── ${name} ────`)

    const res = await enrichPlayer(name)
    if (res) {
      console.error(`  ✓ ${res.primary} [${res.positions.join(', ')}]`)
      results.push(res)
    } else {
      console.error(`  ✗ Failed — will use fallback position from Wikipedia`)
      failed++
    }

    // Rate limiting — 1.5s between requests
    if (i < playerNames.length - 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  // Output registry entries
  console.log('\n// ==============================')
  console.log('// Enriched player position data')
  console.log('// ==============================')
  for (const r of results) {
    const key = r.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '').trim()
    const posArray = `['${r.positions.join('\', \'')}']`
    console.log(`  '${key}': { primary: '${r.primary}', positions: ${posArray}, base: '${r.base}' },`)
  }

  console.error(`\n✅ Done: ${results.length}/${playerNames.length} enriched, ${failed} failed`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
