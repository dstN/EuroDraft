import type { EuroDraftDB, Player, Tournament } from '~/types'

// ============================================================
// useDatabase — loads and queries the static eurodraft_db.json
// ============================================================

let _db: EuroDraftDB | null = null
let _playersByCountryYear: Map<string, Player[]> | null = null
let _countryYearKeys: string[] | null = null

export function parseTeamKey(key: string): { country: string, year: number } {
  const lastDash = key.lastIndexOf('-')
  if (lastDash === -1) {
    return { country: key, year: 0 }
  }
  return {
    country: key.slice(0, lastDash),
    year: parseInt(key.slice(lastDash + 1), 10) || 0
  }
}

export function useDatabase() {
  /**
   * Load the database (called once in a layout or app.vue)
   * Uses Nuxt's useAsyncData so it's deduped and cached.
   */
  async function load() {
    const { data: db } = await useAsyncData<EuroDraftDB>('eurodraft-db', () =>
      $fetch<EuroDraftDB>('/api/db')
    )

    if (db.value) {
      _db = db.value
      _buildIndexes()
    }

    return db
  }

  function _buildIndexes() {
    if (!_db) return
    _playersByCountryYear = new Map()
    _countryYearKeys = []

    for (const player of _db.players) {
      const key = `${player.country}-${player.year}`
      if (!_playersByCountryYear.has(key)) {
        _playersByCountryYear.set(key, [])
        _countryYearKeys.push(key)
      }
      _playersByCountryYear.get(key)!.push(player)
    }
  }

  function ensureLoaded() {
    if (!_db) throw new Error('Database not loaded. Call useDatabase().load() first.')
  }

  function getSquad(country: string, year: number): Player[] {
    ensureLoaded()
    return _playersByCountryYear!.get(`${country}-${year}`) ?? []
  }

  function getYearsForCountry(country: string): number[] {
    ensureLoaded()
    return (_countryYearKeys ?? [])
      .filter(k => k.startsWith(`${country}-`))
      .map(k => parseTeamKey(k).year)
      .filter(y => y > 0)
      .sort((a, b) => a - b)
  }

  function getCountriesForYear(year: number): string[] {
    ensureLoaded()
    return (_countryYearKeys ?? [])
      .filter(k => k.endsWith(`-${year}`))
      .map(k => parseTeamKey(k).country)
      .filter(Boolean)
  }

  function getAllTeamKeys(): string[] {
    ensureLoaded()
    return [...(_countryYearKeys ?? [])]
  }

  function getTournament(year: number): Tournament | undefined {
    ensureLoaded()
    return _db!.tournaments.find(t => t.year === year)
  }

  function getAllTournamentYears(): number[] {
    ensureLoaded()
    return _db!.tournaments.map(t => t.year).sort()
  }

  function getRandomTeams(count: number, excludeKeys: string[] = []): { country: string, year: number }[] {
    ensureLoaded()
    const excludeSet = new Set(excludeKeys)
    const available = (_countryYearKeys ?? []).filter(k => !excludeSet.has(k))
    const shuffled = [...available].sort(() => Math.random() - 0.5)

    return shuffled.slice(0, count).map(key => parseTeamKey(key))
  }

  return {
    load,
    getSquad,
    getYearsForCountry,
    getCountriesForYear,
    getAllTeamKeys,
    getTournament,
    getAllTournamentYears,
    getRandomTeams,
    get isLoaded() { return _db !== null },
    get meta() { return _db?.meta }
  }
}
