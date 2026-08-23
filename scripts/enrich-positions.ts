#!/usr/bin/env tsx
/**
 * EuroDraft — Player Position Enrichment Script
 *
 * Fetches player position data from an external football data source.
 * The source URL is configured via the POSITION_SOURCE_BASE_URL environment variable.
 *
 * Strategy:
 *  1. Generate normalized & transliterated search variants (e.g. Solskjær -> Solskjaer)
 *  2. Search DuckDuckGo / Schnellsuche API with resilient fallbacks
 *  3. Fetch the profile with cheerio / Playwright
 *  4. Parse individual main and secondary position tags accurately
 *
 * Usage:
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --name "Ole Gunnar Solskjær"
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --file players.txt
 *   POSITION_SOURCE_BASE_URL=https://... npx tsx scripts/enrich-positions.ts --db  # enrich all DB players
 *
 * Output: enriched player-positions.ts entries to stdout
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(__dirname, 'cache', 'positions')

// Auto-load .env file if POSITION_SOURCE_BASE_URL is not already exported in process.env
if (!process.env['POSITION_SOURCE_BASE_URL']) {
  const envPath = join(ROOT, '.env')
  if (existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath)
      } else {
        const envContent = readFileSync(envPath, 'utf8')
        for (const line of envContent.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
          if (match) {
            const key = match[1]!
            let val = match[2]?.trim() ?? ''
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
              val = val.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
      }
    } catch {
      // Ignore env file parsing error
    }
  }
}

// Source base URL — injected from environment or .env, never hardcoded
const SOURCE_BASE_URL = (process.env['POSITION_SOURCE_BASE_URL'] ?? '').replace(/\/+$/, '')
if (!SOURCE_BASE_URL) {
  console.error('❌ POSITION_SOURCE_BASE_URL environment variable not set.')
  console.error('   Add POSITION_SOURCE_BASE_URL to your .env file or set it in your environment.')
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
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase())) {
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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
  'Referer': 'https://www.google.com/'
}

/**
 * Generates transliterated & normalized search variants for international names.
 * Ensures characters like Scandinavian æ/ø/å, German umlauts ä/ö/ü/ß, Slavic č/ć/š/ž, etc.
 * match Transfermarkt search slugs.
 */
function generateSearchVariants(name: string): string[] {
  const variants = new Set<string>()
  // Clean Wikipedia suffixes like "(footballer)", "(born 1968)", "Jr.", etc.
  const raw = name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!raw) return []

  // 1. Transliteration variant (æ -> ae, ø -> o, å -> a, etc.)
  const transliterated = raw
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[çÇ]/g, 'c')
    .replace(/[éèêëÉÈÊË]/g, 'e')
    .replace(/[áàâãÁÀÂÃ]/g, 'a')
    .replace(/[íìîïÍÌÎÏ]/g, 'i')
    .replace(/[óòôõÓÒÔÕ]/g, 'o')
    .replace(/[úùûüÚÙÛÜ]/g, 'u')
    .replace(/[ćčĆČ]/g, 'c')
    .replace(/[šŠ]/g, 's')
    .replace(/[žŽ]/g, 'z')
    .replace(/[ýÝ]/g, 'y')
    .replace(/\s+/g, ' ')
    .trim()

  // 2. Pure ASCII (NFD stripped)
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Add in priority order: Transliterated -> ASCII -> Raw
  if (transliterated) variants.add(transliterated)
  if (ascii) variants.add(ascii)
  variants.add(raw)

  // 3. Cyrillic / Slavic / Greek common phonetic alternatives
  const yToJ = transliterated.replace(/\by/gi, 'j').replace(/iy\b/gi, 'ij').replace(/y\b/gi, 'i')
  if (yToJ !== transliterated) variants.add(yToJ)

  const jToY = transliterated.replace(/\bj/gi, 'y').replace(/ij\b/gi, 'iy')
  if (jToY !== transliterated) variants.add(jToY)

  const wToV = transliterated.replace(/w/gi, 'v')
  if (wToV !== transliterated) variants.add(wToV)

  // 4. Simplified first + last name if player has > 2 name parts
  const parts = transliterated.split(' ')
  if (parts.length > 2) {
    variants.add(`${parts[0]} ${parts[parts.length - 1]}`)
  }

  // 5. Surname alone for distinctive names (length >= 5)
  if (parts.length >= 2 && parts[parts.length - 1]!.length >= 5) {
    variants.add(parts[parts.length - 1]!)
  }

  return [...variants]
}

// ---- Step 1: Find profile URL ----
async function findProfileUrl(playerName: string): Promise<string | null> {
  const searchVariants = generateSearchVariants(playerName)
  console.error(`🔍 Searching for: ${playerName} (variants: ${searchVariants.join(' | ')})`)

  // A: Fast Source Search API via Axios with search variants
  for (const variant of searchVariants) {
    try {
      const searchUrl = `${SOURCE_BASE_URL}/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(variant)}&Spieler_page=0`
      const res = await axios.get(searchUrl, { headers: HEADERS, timeout: 8000, maxRedirects: 5 })

      // If Transfermarkt redirected directly to player profile
      if (res.request?.res?.responseUrl && res.request.res.responseUrl.includes('/profil/spieler/')) {
        console.error(`  ✓ Found via direct redirect: ${res.request.res.responseUrl}`)
        return res.request.res.responseUrl
      }

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
          if (!isNaN(n) && n >= 15 && n <= 85) {
            age = n
            return false
          }
        })
        const fullUrl = href.startsWith('http') ? href : `${SOURCE_BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`
        candidates.push({ url: fullUrl, age })
      })

      if (candidates.length > 0) {
        // Disambiguation: prefer retired / historical players (age >= 35)
        const historical = candidates.filter(c => c.age >= 35)
        const chosen = historical.length > 0 ? historical[0]! : candidates[0]!
        console.error(`  ✓ Found via API (${variant}, age ${chosen.age}): ${chosen.url}`)
        return chosen.url
      }
    } catch {
      // Continue to next variant / search method
    }
  }

  // B: DuckDuckGo HTML search fallback
  const primaryVariant = searchVariants[0] ?? playerName
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${SOURCE_HOST} ${primaryVariant} profil`)}`
  try {
    const res = await axios.get(ddgUrl, { headers: HEADERS, timeout: 6000 })
    const html: string = res.data
    const profileRegex = new RegExp(`https?:\\/\\/(?:www\\.)?${SOURCE_HOST.replace('.', '\\.')}\\/[^/]+\\/profil\\/spieler\\/\\d+`, 'g')
    const regexMatches = html.match(profileRegex) ?? []

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
      console.error(`  ✓ Found via DuckDuckGo: ${allUrls[0]}`)
      return allUrls[0]!
    }
  } catch {
    // Continue to Playwright fallback
  }

  // C: Playwright fallback with transliterated queries
  console.error(`  🎭 Falling back to Playwright...`)
  return await findUrlWithPlaywright(searchVariants)
}

async function findUrlWithPlaywright(searchVariants: string[]): Promise<string | null> {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    for (const query of searchVariants) {
      const searchUrl = `${SOURCE_BASE_URL}/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(query)}`
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(1000)

        // Check if page redirected directly to a player profile
        const currentUrl = page.url()
        if (currentUrl.includes('/profil/spieler/')) {
          await browser.close()
          console.error(`  ✓ Found via Playwright direct redirect: ${currentUrl}`)
          return currentUrl
        }

        const links = await page.$$eval('a[href*="/profil/spieler/"]', (els, base) =>
          els.slice(0, 5).map(el => {
            const h = el.getAttribute('href') ?? ''
            return h.startsWith('http') ? h : base + (h.startsWith('/') ? '' : '/') + h
          }),
        SOURCE_BASE_URL
        )

        if (links.length > 0) {
          await browser.close()
          console.error(`  ✓ Found via Playwright (${query}): ${links[0]}`)
          return links[0]!
        }
      } catch {
        // Try next variant
      }
    }

    await browser.close()
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
  const primaryList: string[] = []
  const secondaryList: string[] = []

  // 1. Process dl blocks containing detail-position items individually
  $('dl').each((_, dl) => {
    const title = $(dl).find('dt.detail-position__title').text().trim().toLowerCase()
    const isMain = title.includes('main') || title.includes('hauptposition')

    $(dl).find('dd.detail-position__position').each((_, dd) => {
      const posText = $(dd).text().trim()
      const mapped = mapPositionLabel(posText)
      if (mapped) {
        if (isMain) {
          if (!primaryList.includes(mapped)) primaryList.push(mapped)
        } else {
          if (!secondaryList.includes(mapped)) secondaryList.push(mapped)
        }
      }
    })
  })

  // 2. Fallback if no dl found: check all dd.detail-position__position
  if (primaryList.length === 0) {
    $('dd.detail-position__position').each((_, el) => {
      const mapped = mapPositionLabel($(el).text().trim())
      if (mapped && !primaryList.includes(mapped) && !secondaryList.includes(mapped)) {
        if (primaryList.length === 0) primaryList.push(mapped)
        else secondaryList.push(mapped)
      }
    })
  }

  // 3. Fallback: check header info-table for position
  if (primaryList.length === 0) {
    $('.info-table__content--bold').each((_, el) => {
      const text = $(el).text().trim()
      const parts = text.split('-').map(p => p.trim())
      for (const p of parts) {
        const mapped = mapPositionLabel(p)
        if (mapped && !primaryList.includes(mapped)) {
          primaryList.push(mapped)
          break
        }
      }
    })
  }

  const primary = primaryList[0] ?? null
  const others = secondaryList.filter(p => p !== primary)
  return { primary, others }
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
    await page.waitForTimeout(1500)
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
function normalizeRegistryKey(str: string): string {
  return str
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'oe')
    .replace(/[åÅ]/g, 'aa')
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function enrichPlayer(playerName: string): Promise<EnrichedPosition | null> {
  await mkdir(CACHE_DIR, { recursive: true })
  const cacheKey = normalizeRegistryKey(playerName).replace(/\s+/g, '-')
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
  const retryFailed = args.includes('--retry-failed') || args.includes('--missing') || args.includes('--missing-only')
  const exportMode = args.includes('--export')

  // Handle Export-Only Mode
  if (exportMode) {
    await mkdir(CACHE_DIR, { recursive: true })
    const { readdirSync } = await import('node:fs')
    const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'))
    console.error(`📦 Exporting ${files.length} cached player positions...`)

    const registryEntries: Record<string, { primary: string, positions: string[], base: string }> = {}
    for (const f of files) {
      try {
        const data = JSON.parse(await readFile(join(CACHE_DIR, f), 'utf8')) as EnrichedPosition
        const key = normalizeRegistryKey(data.name)
        registryEntries[key] = {
          primary: data.primary,
          positions: data.positions,
          base: data.base
        }
      } catch {
        // Ignore corrupt cache file
      }
    }

    console.log(`// Total Enriched Players: ${Object.keys(registryEntries).length}`)
    console.log('export const HISTORICAL_PLAYER_REGISTRY: Record<string, PlayerPositionProfile> = {')
    for (const [k, v] of Object.entries(registryEntries).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`  '${k}': { primary: '${v.primary}', positions: ['${v.positions.join("', '")}'], base: '${v.base}' },`)
    }
    console.log('}')
    console.error(`✅ Successfully exported ${Object.keys(registryEntries).length} entries.`)
    return
  }

  if (nameIdx !== -1 && args[nameIdx + 1]) {
    playerNames = [args[nameIdx + 1]!]
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    const content = await readFile(args[fileIdx + 1]!, 'utf8')
    playerNames = content.split('\n').map(l => l.trim()).filter(Boolean)
  } else if (dbMode || retryFailed) {
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

    const allNames = [...nameSet].sort()

    if (retryFailed) {
      await mkdir(CACHE_DIR, { recursive: true })
      playerNames = allNames.filter(name => {
        const cacheKey = normalizeRegistryKey(name).replace(/\s+/g, '-')
        const cacheFile = join(CACHE_DIR, `${cacheKey}.json`)
        return !existsSync(cacheFile)
      })
      console.error(`📋 Found ${playerNames.length} missing (un-enriched) players out of ${allNames.length} total players.`)
    } else {
      playerNames = allNames
      console.error(`📋 Loaded ${playerNames.length} unique players from database`)
    }
  } else {
    console.error('Usage:')
    console.error('  npx tsx scripts/enrich-positions.ts --name "Player Name"')
    console.error('  npx tsx scripts/enrich-positions.ts --file players.txt')
    console.error('  npx tsx scripts/enrich-positions.ts --db             # enrich all DB players')
    console.error('  npx tsx scripts/enrich-positions.ts --retry-failed   # retry only failed / missing players')
    console.error('  npx tsx scripts/enrich-positions.ts --export         # export all cached players to registry')
    console.error('')
    console.error('Required env: POSITION_SOURCE_BASE_URL')
    process.exit(0)
  }

  console.error(`\n📊 Enriching ${playerNames.length} players...\n`)

  const results: EnrichedPosition[] = []
  let failed = 0

  for (let i = 0; i < playerNames.length; i++) {
    const name = playerNames[i]!
    const cacheKey = normalizeRegistryKey(name).replace(/\s+/g, '-')
    const cacheFile = join(CACHE_DIR, `${cacheKey}.json`)
    const wasCached = existsSync(cacheFile)

    process.stderr.write(`\r[${i + 1}/${playerNames.length}] `)
    console.error(`──── ${name} ────`)

    const res = await enrichPlayer(name)
    if (res) {
      console.error(`  ✓ ${res.primary} [${res.positions.join(', ')}] (${res.base})`)
      results.push(res)
    } else {
      console.error(`  ✗ Failed — will use fallback position from Wikipedia`)
      failed++
    }

    // Rate limiting — 1.5s between requests ONLY if network call was made
    if (!wasCached && i < playerNames.length - 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  console.error(`\n✅ Done: ${results.length}/${playerNames.length} enriched, ${failed} failed`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
