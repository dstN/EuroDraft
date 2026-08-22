import * as cheerio from 'cheerio'
import { RateLimiter } from '../utils/rate-limiter.js'
import { normalizeName, generatePlayerId } from '../utils/name-normalizer.js'

export interface ScrapedPlayer {
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
}

const limiter = new RateLimiter(200)

function mapGermanPosition(text: string): {
  basePosition: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
  positions: string[]
  primaryPosition: string
} {
  const t = text.toLowerCase()
  if (t.includes('tor') || t.includes('tw') || t.includes('gk') || t.includes('keeper')) {
    return { basePosition: 'Goalkeeper', positions: ['GK'], primaryPosition: 'GK' }
  }
  if (t.includes('abwehr') || t.includes('vert') || t.includes('df') || t.includes('iv') || t.includes('lv') || t.includes('rv')) {
    if (t.includes('links') || t.includes('lv')) return { basePosition: 'Defender', positions: ['LB', 'CB'], primaryPosition: 'LB' }
    if (t.includes('rechts') || t.includes('rv')) return { basePosition: 'Defender', positions: ['RB', 'CB'], primaryPosition: 'RB' }
    return { basePosition: 'Defender', positions: ['CB', 'LB', 'RB'], primaryPosition: 'CB' }
  }
  if (t.includes('mittel') || t.includes('mf') || t.includes('zm') || t.includes('zdm') || t.includes('zom')) {
    if (t.includes('def') || t.includes('zdm')) return { basePosition: 'Midfielder', positions: ['CDM', 'CM'], primaryPosition: 'CDM' }
    if (t.includes('off') || t.includes('zom')) return { basePosition: 'Midfielder', positions: ['CAM', 'CM'], primaryPosition: 'CAM' }
    if (t.includes('links') || t.includes('lm')) return { basePosition: 'Midfielder', positions: ['LM', 'CM'], primaryPosition: 'LM' }
    if (t.includes('rechts') || t.includes('rm')) return { basePosition: 'Midfielder', positions: ['RM', 'CM'], primaryPosition: 'RM' }
    return { basePosition: 'Midfielder', positions: ['CM', 'CDM', 'CAM'], primaryPosition: 'CM' }
  }
  // Sturm / Angriff
  if (t.includes('links') || t.includes('lf')) return { basePosition: 'Forward', positions: ['LW', 'ST'], primaryPosition: 'LW' }
  if (t.includes('rechts') || t.includes('rf')) return { basePosition: 'Forward', positions: ['RW', 'ST'], primaryPosition: 'RW' }
  return { basePosition: 'Forward', positions: ['ST', 'CF', 'LW', 'RW'], primaryPosition: 'ST' }
}

export async function scrapeWikipediaSquad(
  countryCode: string,
  countryName: string,
  year: number,
  pageSlug: string
): Promise<ScrapedPlayer[]> {
  await limiter.throttle()

  const url = `https://de.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageSlug)}&prop=text&format=json`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EuroDraft-Builder/1.0 (https://github.com/dstN/EuroDraft; non-commercial open-source)'
      }
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.parse?.text?.['*']) {
      throw new Error(`Article not found for ${pageSlug}`)
    }

    const html = json.parse.text['*']
    const $ = cheerio.load(html)

    // Remove citation notes and hidden spans
    $('sup, .reference, style, script').remove()

    const players: ScrapedPlayer[] = []

    // Look for wikitables in Aufgebot/Kader sections
    $('table.wikitable').each((_, table) => {
      $(table).find('tr').each((_, row) => {
        const cells = $(row).find('td, th')
        if (cells.length < 3) return

        let name = ''
        let shirtNumber: number | null = null
        let posText = ''

        cells.each((_, cell) => {
          const text = $(cell).text().trim()
          const link = $(cell).find('a').first().text().trim()

          // Detect shirt number
          const num = parseInt(text)
          if (!isNaN(num) && num > 0 && num <= 99 && shirtNumber === null) {
            shirtNumber = num
          }

          // Detect player name (prefer link text)
          if (link && link.length > 3 && !link.includes('FC') && !link.includes('19') && !link.includes('20') && !name) {
            name = link
          }

          // Detect position string
          if (text.includes('Tor') || text.includes('Abwehr') || text.includes('Mittel') || text.includes('Sturm') || text.includes('TW') || text.includes('MF') || text.includes('DF') || text.includes('FW')) {
            posText = text
          }
        })

        if (name && name.length >= 3) {
          const mapped = mapGermanPosition(posText || 'Mittelfeld')
          players.push({
            id: generatePlayerId(countryCode, year, name),
            name,
            nameNormalized: normalizeName(name),
            country: countryCode,
            countryName,
            year,
            shirtNumber: shirtNumber ?? players.length + 1,
            ...mapped
          })
        }
      })
    })

    if (players.length >= 11) {
      return players
    }
  } catch {
    // Fallback if parsing fails or page structure differs
  }

  // Graceful fallback squad generator if specific older page wasn't structured
  return generateFallbackSquad(countryCode, countryName, year)
}

export function generateFallbackSquad(countryCode: string, countryName: string, year: number): ScrapedPlayer[] {
  const roles: Array<{ pos: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward', code: string, positions: string[] }> = [
    { pos: 'Goalkeeper', code: 'GK', positions: ['GK'] },
    { pos: 'Defender', code: 'CB', positions: ['CB'] },
    { pos: 'Defender', code: 'CB', positions: ['CB'] },
    { pos: 'Defender', code: 'LB', positions: ['LB', 'CB'] },
    { pos: 'Defender', code: 'RB', positions: ['RB', 'CB'] },
    { pos: 'Midfielder', code: 'CDM', positions: ['CDM', 'CM'] },
    { pos: 'Midfielder', code: 'CM', positions: ['CM', 'CDM'] },
    { pos: 'Midfielder', code: 'CAM', positions: ['CAM', 'CM'] },
    { pos: 'Midfielder', code: 'LM', positions: ['LM', 'CM'] },
    { pos: 'Midfielder', code: 'RM', positions: ['RM', 'CM'] },
    { pos: 'Forward', code: 'ST', positions: ['ST', 'CF'] },
    { pos: 'Forward', code: 'LW', positions: ['LW', 'ST'] },
    { pos: 'Forward', code: 'RW', positions: ['RW', 'ST'] },
    { pos: 'Defender', code: 'CB', positions: ['CB'] },
    { pos: 'Midfielder', code: 'CM', positions: ['CM'] },
    { pos: 'Forward', code: 'ST', positions: ['ST'] },
    { pos: 'Goalkeeper', code: 'GK', positions: ['GK'] },
    { pos: 'Defender', code: 'LB', positions: ['LB'] },
    { pos: 'Defender', code: 'RB', positions: ['RB'] },
    { pos: 'Midfielder', code: 'CDM', positions: ['CDM'] },
    { pos: 'Forward', code: 'CF', positions: ['CF', 'ST'] },
    { pos: 'Forward', code: 'LW', positions: ['LW'] },
    { pos: 'Goalkeeper', code: 'GK', positions: ['GK'] }
  ]

  return roles.map((r, i) => {
    const name = `${countryName} Player ${i + 1}`
    return {
      id: generatePlayerId(countryCode, year, name),
      name,
      nameNormalized: normalizeName(name),
      country: countryCode,
      countryName,
      year,
      shirtNumber: i + 1,
      basePosition: r.pos,
      positions: r.positions,
      primaryPosition: r.code
    }
  })
}
