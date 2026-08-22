#!/usr/bin/env tsx
/**
 * EuroDraft Data Pipeline — Real Wikipedia Squad Scraper & Database Builder
 * Scrapes real historical Euro squads from 1960 to 2024.
 * Caches all responses to scripts/cache/ so rebuilds are instantaneous.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

import { HISTORICAL_PLAYER_REGISTRY, type PlayerPositionProfile } from './player-positions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(__dirname, 'cache')
const OUTPUT_PATH = join(ROOT, 'public', 'eurodraft_db.json')

// ---- Types ----
interface PlayerStats {
  overall: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

interface ScrapedPlayer {
  id: string
  name: string
  nameNormalized: string
  country: string
  countryName: string
  year: number
  shirtNumber: number | null
  basePosition: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
  positions: string[]
  primaryPosition: string
  caps: number
  goals: number
  stats: PlayerStats
  enrichmentSource: 'wikipedia' | 'wikidata' | 'fallback'
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[çÇ]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Map country names to ISO code
const COUNTRY_MAP: Record<string, { code: string, name: string }> = {
  'albania': { code: 'al', name: 'Albania' },
  'austria': { code: 'at', name: 'Austria' },
  'belgium': { code: 'be', name: 'Belgium' },
  'bulgaria': { code: 'bg', name: 'Bulgaria' },
  'croatia': { code: 'hr', name: 'Croatia' },
  'czech republic': { code: 'cz', name: 'Czechia' },
  'czechia': { code: 'cz', name: 'Czechia' },
  'czechoslovakia': { code: 'cs', name: 'Czechoslovakia' },
  'denmark': { code: 'dk', name: 'Denmark' },
  'england': { code: 'gb-eng', name: 'England' },
  'finland': { code: 'fi', name: 'Finland' },
  'france': { code: 'fr', name: 'France' },
  'georgia': { code: 'ge', name: 'Georgia' },
  'germany': { code: 'de', name: 'Germany' },
  'west germany': { code: 'de', name: 'Germany' },
  'greece': { code: 'gr', name: 'Greece' },
  'hungary': { code: 'hu', name: 'Hungary' },
  'iceland': { code: 'is', name: 'Iceland' },
  'italy': { code: 'it', name: 'Italy' },
  'latvia': { code: 'lv', name: 'Latvia' },
  'netherlands': { code: 'nl', name: 'Netherlands' },
  'north macedonia': { code: 'mk', name: 'North Macedonia' },
  'northern ireland': { code: 'gb-nir', name: 'Northern Ireland' },
  'norway': { code: 'no', name: 'Norway' },
  'poland': { code: 'pl', name: 'Poland' },
  'portugal': { code: 'pt', name: 'Portugal' },
  'republic of ireland': { code: 'ie', name: 'Republic of Ireland' },
  'ireland': { code: 'ie', name: 'Republic of Ireland' },
  'romania': { code: 'ro', name: 'Romania' },
  'russia': { code: 'ru', name: 'Russia' },
  'cis': { code: 'cis', name: 'CIS' },
  'soviet union': { code: 'su', name: 'Soviet Union' },
  'scotland': { code: 'gb-sct', name: 'Scotland' },
  'serbia': { code: 'rs', name: 'Serbia' },
  'serbia and montenegro': { code: 'rs', name: 'Serbia' },
  'slovakia': { code: 'sk', name: 'Slovakia' },
  'slovenia': { code: 'si', name: 'Slovenia' },
  'spain': { code: 'es', name: 'Spain' },
  'sweden': { code: 'se', name: 'Sweden' },
  'switzerland': { code: 'ch', name: 'Switzerland' },
  'turkey': { code: 'tr', name: 'Türkiye' },
  'türkiye': { code: 'tr', name: 'Türkiye' },
  'ukraine': { code: 'ua', name: 'Ukraine' },
  'wales': { code: 'gb-wls', name: 'Wales' },
  'yugoslavia': { code: 'yu', name: 'Yugoslavia' }
}

function resolveCountry(str: string): { code: string, name: string } | null {
  const clean = str.toLowerCase().replace(/\[edit\]/g, '').trim()
  for (const [key, val] of Object.entries(COUNTRY_MAP)) {
    if (clean === key || clean.startsWith(key) || clean.includes(key)) {
      return val
    }
  }
  return null
}

// Load any enriched positions from cache if available
const ENRICHED_CACHE_DIR = join(__dirname, 'cache', 'positions')
const ENRICHED_REGISTRY: Record<string, PlayerPositionProfile> = { ...HISTORICAL_PLAYER_REGISTRY }

if (existsSync(ENRICHED_CACHE_DIR)) {
  try {
    const files = readdirSync(ENRICHED_CACHE_DIR).filter(f => f.endsWith('.json'))
    for (const f of files) {
      try {
        const data = JSON.parse(readFileSync(join(ENRICHED_CACHE_DIR, f), 'utf8'))
        if (data.name && data.primary && data.positions) {
          const key = normalizeForLookup(data.name)
          if (!ENRICHED_REGISTRY[key]) {
            ENRICHED_REGISTRY[key] = {
              primary: data.primary,
              positions: data.positions,
              base: data.base ?? 'Midfielder'
            }
          }
        }
      } catch {
        // Ignore unparseable or corrupted cache files
      }
    }
  } catch {
    // Cache directory read error
  }
}

function normalizeForLookup(str: string): string {
  return str
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
}

function mapPosition(posText: string, playerName: string = '', shirtNumber: number | null = null): {
  basePosition: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
  positions: string[]
  primaryPosition: string
} {
  const normName = normalizeForLookup(playerName)

  // 1. Direct registry match (including enriched cache)
  if (normName && ENRICHED_REGISTRY[normName]) {
    const reg = ENRICHED_REGISTRY[normName]!
    return {
      basePosition: reg.base,
      positions: [...reg.positions],
      primaryPosition: reg.primary
    }
  }

  // 2. Partial name match in registry
  if (normName && normName.length >= 4) {
    for (const [key, reg] of Object.entries(ENRICHED_REGISTRY)) {
      if (normName === key || normName.includes(key) || key.includes(normName)) {
        return {
          basePosition: reg.base,
          positions: [...reg.positions],
          primaryPosition: reg.primary
        }
      }
    }
  }

  // 3. Fallback to positional analysis based on posText and shirt number
  const p = posText.toUpperCase().trim()
  if (p.includes('GK') || p.includes('GOAL') || p.includes('TOR')) {
    return { basePosition: 'Goalkeeper', positions: ['GK'], primaryPosition: 'GK' }
  }

  if (p.includes('DF') || p.includes('CB') || p.includes('LB') || p.includes('RB') || p.includes('DEF') || p.includes('ABWEHR')) {
    if (p.includes('LB') || p.includes('LEFT') || shirtNumber === 3 || shirtNumber === 13 || shirtNumber === 23) {
      return { basePosition: 'Defender', positions: ['LB', 'CB'], primaryPosition: 'LB' }
    }
    if (p.includes('RB') || p.includes('RIGHT') || shirtNumber === 2 || shirtNumber === 12 || shirtNumber === 22) {
      return { basePosition: 'Defender', positions: ['RB', 'CB'], primaryPosition: 'RB' }
    }
    return { basePosition: 'Defender', positions: ['CB'], primaryPosition: 'CB' }
  }

  if (p.includes('MF') || p.includes('MID') || p.includes('CM') || p.includes('DM') || p.includes('AM') || p.includes('MITTEL')) {
    if (p.includes('DM') || p.includes('DEFENSIVE') || shirtNumber === 6 || shirtNumber === 16) {
      return { basePosition: 'Midfielder', positions: ['CDM', 'CM'], primaryPosition: 'CDM' }
    }
    if (p.includes('AM') || p.includes('ATTACKING') || shirtNumber === 10 || shirtNumber === 20) {
      return { basePosition: 'Midfielder', positions: ['CAM', 'CM'], primaryPosition: 'CAM' }
    }
    if (p.includes('LM') || p.includes('LEFT') || shirtNumber === 11 || shirtNumber === 21) {
      return { basePosition: 'Midfielder', positions: ['LM', 'LW', 'CM'], primaryPosition: 'LM' }
    }
    if (p.includes('RM') || p.includes('RIGHT') || shirtNumber === 7 || shirtNumber === 17) {
      return { basePosition: 'Midfielder', positions: ['RM', 'RW', 'CM'], primaryPosition: 'RM' }
    }
    return { basePosition: 'Midfielder', positions: ['CM', 'CDM', 'CAM'], primaryPosition: 'CM' }
  }

  // FW / Forward
  if (p.includes('LW') || p.includes('LEFT') || shirtNumber === 11 || shirtNumber === 21) {
    return { basePosition: 'Forward', positions: ['LW', 'LM', 'ST', 'RW'], primaryPosition: 'LW' }
  }
  if (p.includes('RW') || p.includes('RIGHT') || shirtNumber === 7 || shirtNumber === 17) {
    return { basePosition: 'Forward', positions: ['RW', 'RM', 'ST', 'LW'], primaryPosition: 'RW' }
  }
  return { basePosition: 'Forward', positions: ['ST', 'CF'], primaryPosition: 'ST' }
}

function calculateOVR(
  basePosition: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward',
  caps: number,
  goals: number,
  _year: number,
  playerName: string = ''
): PlayerStats {
  const normName = normalizeForLookup(playerName)
  let ovr: number

  // 1. Check if player has an authentic star rating in the registry
  let matchedRating: number | undefined
  if (normName && HISTORICAL_PLAYER_REGISTRY[normName]?.baseRating) {
    matchedRating = HISTORICAL_PLAYER_REGISTRY[normName]?.baseRating
  } else if (normName && normName.length >= 4) {
    for (const [key, reg] of Object.entries(HISTORICAL_PLAYER_REGISTRY)) {
      if ((normName === key || normName.includes(key) || key.includes(normName)) && reg.baseRating) {
        matchedRating = reg.baseRating
        break
      }
    }
  }

  if (matchedRating) {
    // Slight nuance based on tournament caps
    if (caps < 10) {
      ovr = matchedRating - 2 // Young emerging star
    } else if (caps > 80) {
      ovr = Math.max(matchedRating - 1, 86) // Experienced legend
    } else {
      ovr = matchedRating // Peak prime
    }
  } else {
    // 2. Standard international tournament player formula
    const baseByPos = { Goalkeeper: 77, Defender: 77, Midfielder: 78, Forward: 78 }
    ovr = baseByPos[basePosition]

    // Caps experience bonus (up to +6)
    ovr += Math.min(6, Math.floor((caps || 10) / 15))

    // Goal scoring bonus (up to +5)
    const goalWeight = basePosition === 'Forward' ? 0.2 : basePosition === 'Midfielder' ? 0.3 : 0.45
    ovr += Math.min(5, Math.floor((goals || 0) * goalWeight))

    ovr = Math.min(87, Math.max(73, ovr))
  }

  const seed = ((caps || 5) * 7 + (goals || 2) * 13) % 5

  if (basePosition === 'Goalkeeper') {
    return {
      overall: ovr,
      pace: 52 + seed,
      shooting: 30 + seed,
      passing: Math.min(88, ovr - 12 + seed),
      dribbling: 45 + seed,
      defending: ovr,
      physical: Math.min(92, ovr - 2)
    }
  }
  if (basePosition === 'Defender') {
    return {
      overall: ovr,
      pace: Math.min(92, Math.max(68, ovr - 4 + seed)),
      shooting: Math.min(75, 45 + seed * 3),
      passing: Math.min(88, ovr - 6 + seed),
      dribbling: Math.min(82, 62 + seed * 2),
      defending: Math.min(95, ovr + 2),
      physical: Math.min(94, ovr)
    }
  }
  if (basePosition === 'Midfielder') {
    return {
      overall: ovr,
      pace: Math.min(92, Math.max(70, ovr - 4 + seed)),
      shooting: Math.min(92, ovr - 5 + seed),
      passing: Math.min(96, ovr + 2),
      dribbling: Math.min(95, ovr + 1),
      defending: Math.min(90, ovr - 8 + seed),
      physical: Math.min(92, ovr - 3)
    }
  }
  // Forward
  return {
    overall: ovr,
    pace: Math.min(96, ovr + 2),
    shooting: Math.min(96, ovr + 2),
    passing: Math.min(90, ovr - 5 + seed),
    dribbling: Math.min(95, ovr + 1),
    defending: Math.min(58, 38 + seed * 2),
    physical: Math.min(92, ovr - 2)
  }
}

async function fetchWikiPage(pageTitle: string): Promise<string | null> {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true })

  const safeFilename = pageTitle.replace(/[^a-zA-Z0-9_-]/g, '_') + '.html'
  const cachePath = join(CACHE_DIR, safeFilename)

  if (existsSync(cachePath)) {
    return readFile(cachePath, 'utf8')
  }

  await sleep(750) // Respect Wikipedia API rate limit

  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EuroDraft/1.0 (https://github.com/dstN/EuroDraft; contact@eurodraft.app; non-commercial educational open-source)'
      }
    })
    if (!res.ok) return null
    const json = (await res.json()) as { parse?: { text?: { '*'?: string } } }
    const html = json.parse?.text?.['*']
    if (html) {
      await writeFile(cachePath, html, 'utf8')
      return html
    }
  } catch (e) {
    console.warn(`Fetch error for ${pageTitle}:`, e)
  }
  return null
}

const SQUAD_PAGES: Record<number, { format: '4-teams' | '8-teams' | '16-teams' | '24-teams', pages: string[] }> = {
  2024: { format: '24-teams', pages: ['UEFA_Euro_2024_squads'] },
  2020: { format: '24-teams', pages: ['UEFA_Euro_2020_squads'] },
  2016: { format: '24-teams', pages: ['UEFA_Euro_2016_squads'] },
  2012: { format: '16-teams', pages: ['UEFA_Euro_2012_squads'] },
  2008: { format: '16-teams', pages: ['UEFA_Euro_2008_squads'] },
  2004: { format: '16-teams', pages: ['UEFA_Euro_2004_squads'] },
  2000: { format: '16-teams', pages: ['UEFA_Euro_2000_squads'] },
  1996: { format: '16-teams', pages: ['UEFA_Euro_1996_squads'] },
  1992: { format: '8-teams', pages: ['UEFA_Euro_1992_squads'] },
  1988: { format: '8-teams', pages: ['UEFA_Euro_1988_squads'] },
  1984: { format: '8-teams', pages: ['UEFA_Euro_1984_squads'] },
  1980: { format: '8-teams', pages: ['UEFA_Euro_1980_squads'] },
  1976: { format: '4-teams', pages: ['UEFA_Euro_1976_squads', '1976 European Football Championship squads'] },
  1972: { format: '4-teams', pages: ['UEFA_Euro_1972_squads', '1972 European Football Championship squads'] },
  1968: { format: '4-teams', pages: ['UEFA_Euro_1968_squads', '1968 European Football Championship squads'] },
  1964: { format: '4-teams', pages: ['1964 European Nations\' Cup squads'] },
  1960: { format: '4-teams', pages: ['1960 European Nations\' Cup squads'] }
}

async function scrapeTournament(year: number, config: { format: '4-teams' | '8-teams' | '16-teams' | '24-teams', pages: string[] }) {
  console.log(`\n🏆 Scraping Euro ${year}...`)
  let html: string | null = null

  for (const page of config.pages) {
    html = await fetchWikiPage(page)
    if (html) break
  }

  if (!html) {
    console.warn(`Could not load Wikipedia page for ${year}`)
    return { players: [], teams: [] }
  }

  const $ = cheerio.load(html)
  $('sup, .reference, style, script').remove()

  const tournamentPlayers: ScrapedPlayer[] = []
  const teamsFound: Set<string> = new Set()
  const processedHeadings = new Set<string>()

  // Handle both standard headings and mw-heading wrappers
  $('h2, h3, .mw-heading2, .mw-heading3').each((_, headingElem) => {
    const rawHeadingText = $(headingElem).text().replace(/\[edit\]/g, '').trim()
    const country = resolveCountry(rawHeadingText)
    if (!country || processedHeadings.has(`${country.code}-${year}`)) return

    // Find the next table sibling
    const container = $(headingElem).is('.mw-heading') ? $(headingElem) : $(headingElem).closest('.mw-heading')
    const target = container.length ? container : $(headingElem)

    let table: cheerio.Cheerio<cheerio.Element> | null = null
    let next = target.next()

    while (next.length && !next.is('h2, h3, .mw-heading')) {
      if (next.is('table')) {
        table = next
        break
      }
      next = next.next()
    }

    if (!table || !table.length) return
    processedHeadings.add(`${country.code}-${year}`)
    teamsFound.add(country.code)

    let shirtCount = 1

    table.find('tr').each((_, row) => {
      const cells = $(row).find('td, th')
      if (cells.length < 3) return

      let name = ''
      let shirtNumber: number | null = null
      let posText = ''
      let caps = 0
      let goals = 0

      cells.each((idx, cell) => {
        const text = $(cell).text().trim()
        const links = $(cell).find('a')

        // Shirt number
        const num = parseInt(text)
        if (!isNaN(num) && num > 0 && num <= 99 && idx <= 1 && shirtNumber === null) {
          shirtNumber = num
        }

        // Position text (matches 1GK, 2DF, 3MF, 4FW, GK, DF, MF, FW, etc.)
        const posMatch = text.match(/(GK|DF|MF|FW|Torwart|Abwehr|Mittelfeld|Sturm|Goalkeeper|Defender|Midfielder|Forward)/i)
        if (posMatch && !posText) {
          posText = posMatch[1]!
        }

        // Player name (find valid link that isn't position abbreviation or club)
        links.each((_, link) => {
          const linkText = $(link).text().trim()
          if (!name && linkText.length > 2
            && !linkText.match(/^(GK|DF|MF|FW|\d+)$/i)
            && !linkText.includes('FC') && !linkText.includes('Real') && !linkText.includes('Athletic')
            && !linkText.includes('19') && !linkText.includes('20')) {
            name = linkText
          }
        })

        if (!name && text.length > 3 && idx >= 1 && idx <= 3
          && !text.match(/^(GK|DF|MF|FW|\d+)$/i) && !text.includes('(')) {
          name = text.split('\n')[0]!.trim()
        }

        // Caps & Goals
        if (idx >= 3) {
          const val = parseInt(text)
          if (!isNaN(val) && val >= 0 && val < 250) {
            if (caps === 0) caps = val
            else if (goals === 0) goals = val
          }
        }
      })

      // Clean name
      name = name.replace(/\(c\)/i, '').replace(/\[.*\]/g, '').trim()
      const lower = name.toLowerCase()
      const isHeader = ['pos.', 'pos', 'player', 'spieler', 'name', 'no.', 'nat.', 'caps', 'goals', 'club', 'date of birth', 'age'].includes(lower)

      if (name && name.length >= 3 && !isHeader && !lower.includes('captain') && !lower.includes('coach') && !lower.includes('manager')) {
        const finalShirtNum = shirtNumber ?? shirtCount
        const fallbackPos = finalShirtNum === 1 ? 'GK' : finalShirtNum <= 4 ? 'DF' : finalShirtNum <= 8 ? 'MF' : 'FW'
        const mappedPos = mapPosition(posText || fallbackPos, name, finalShirtNum)
        const stats = calculateOVR(mappedPos.basePosition, caps, goals, year, name)

        const norm = normalizeName(name)
        const id = `${country.code}-${year}-${norm.replace(/\s+/g, '-')}`

        tournamentPlayers.push({
          id,
          name,
          nameNormalized: norm,
          country: country.code,
          countryName: country.name,
          year,
          shirtNumber: shirtNumber ?? shirtCount,
          basePosition: mappedPos.basePosition,
          positions: mappedPos.positions,
          primaryPosition: mappedPos.primaryPosition,
          caps,
          goals,
          stats,
          enrichmentSource: 'wikipedia'
        })
        shirtCount++
      }
    })
  })

  console.log(`  ✓ Found ${teamsFound.size} teams, ${tournamentPlayers.length} real players.`)
  return { players: tournamentPlayers, teams: Array.from(teamsFound) }
}

async function main() {
  console.log('🚀 EuroDraft — Scraping Real Historical Players & Building Database...\n')

  const allPlayers: ScrapedPlayer[] = []
  const tournaments = []

  const years = Object.keys(SQUAD_PAGES).map(Number).sort((a, b) => a - b)

  for (const year of years) {
    const config = SQUAD_PAGES[year]!
    const { players, teams } = await scrapeTournament(year, config)

    allPlayers.push(...players)

    tournaments.push({
      year,
      hostCountry: teams[0] ?? 'de',
      winner: teams[0] ?? 'de',
      runnerUp: teams[1] ?? 'es',
      format: config.format,
      teams: teams
    })
  }

  // Deduplicate IDs
  const seen = new Set<string>()
  const finalPlayers = allPlayers.filter((p) => {
    if (seen.has(p.id)) {
      p.id = `${p.id}-${Math.random().toString(36).slice(2, 5)}`
    }
    seen.add(p.id)
    return true
  })

  const db = {
    meta: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalPlayers: finalPlayers.length,
      totalTeams: tournaments.reduce((acc, t) => acc + t.teams.length, 0)
    },
    tournaments,
    players: finalPlayers
  }

  if (!existsSync(join(ROOT, 'public'))) {
    await mkdir(join(ROOT, 'public'), { recursive: true })
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(db, null, 2), 'utf8')

  console.log(`\n🎉 EuroDraft Database Build Complete!`)
  console.log(`   Real Players: ${finalPlayers.length}`)
  console.log(`   Total Teams:  ${db.meta.totalTeams}`)
  console.log(`   Output:       ${OUTPUT_PATH}\n`)
}

main().catch(console.error)
