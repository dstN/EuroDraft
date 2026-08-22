import { RateLimiter } from '../utils/rate-limiter.js'
import type { ScrapedPlayer } from '../scrapers/wikipedia-scraper.js'

const limiter = new RateLimiter(300)

/**
 * Wikidata SPARQL endpoint integration
 */
export async function enrichPositionViaWikidata(player: ScrapedPlayer): Promise<string[] | null> {
  // If player already has granular positions, keep them
  if (player.positions.length > 0 && !player.positions.includes('CM')) {
    return player.positions
  }

  await limiter.throttle()

  const sparqlQuery = `
    SELECT ?positionLabel WHERE {
      ?player wdt:P106 wd:Q937857 .
      ?player rdfs:label "${player.name}"@de .
      ?player wdt:P413 ?position .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
    } LIMIT 3
  `

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EuroDraft-Builder/1.0 (https://github.com/dstN/EuroDraft)',
        'Accept': 'application/sparql-results+json'
      }
    })

    if (!res.ok) return null
    const json = await res.json()
    const bindings = json.results?.bindings ?? []

    const positions: string[] = []
    for (const b of bindings) {
      const label = b.positionLabel?.value?.toLowerCase() ?? ''
      if (label.includes('goalkeeper')) positions.push('GK')
      else if (label.includes('centre-back') || label.includes('defender')) positions.push('CB')
      else if (label.includes('left-back')) positions.push('LB')
      else if (label.includes('right-back')) positions.push('RB')
      else if (label.includes('midfielder')) positions.push('CM')
      else if (label.includes('winger') || label.includes('forward')) positions.push('LW', 'RW')
      else if (label.includes('striker')) positions.push('ST')
    }

    return positions.length > 0 ? Array.from(new Set(positions)) : null
  } catch {
    return null
  }
}
