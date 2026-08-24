import type { EuroDraftDB, Player, Tournament } from '~/types'

// ============================================================
// useDatabase — loads and queries the static /eurodraft_db.json
// ============================================================
//
// Fetched as a plain static asset rather than through a custom API route:
//
// 1. A custom route reading the file from disk has to resolve a path, and
//    `process.cwd()` is not reliable for that -- it depends on how the
//    process was launched, and the deploy runbook only uploads `.output/`,
//    never the source `public/` dir the old route read from (see
//    DEPLOYMENT.md). Nitro's own static-asset handler resolves relative to
//    the running server module instead, which is correct under any deploy
//    layout -- `$fetch` routes through that handler in-process on the
//    server, and through a real (cacheable, brotli-negotiated, ETag'd)
//    HTTP request in the browser.
// 2. Wrapping the fetch in `useAsyncData` would embed the full ~2.8MB
//    payload into the SSR-rendered HTML on every request that (re)builds
//    the index. A plain `$fetch` keeps SSR HTML size stable regardless of
//    server-side caching state.
//
// Caching is intentionally module-scoped on both sides: the dataset is an
// immutable per-deploy artifact (it only changes via a rebuild + redeploy),
// so persisting the parsed indexes for the lifetime of a server worker (or
// a client SPA session) is correct and avoids re-parsing 2.8MB of JSON on
// every request. `_loadPromise` dedupes concurrent cold-cache callers.

let _db: EuroDraftDB | null = null
let _playersByCountryYear: Map<string, Player[]> | null = null
let _countryYearKeys: string[] | null = null
let _loadPromise: Promise<void> | null = null

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

function buildIndexes(db: EuroDraftDB) {
  _playersByCountryYear = new Map()
  _countryYearKeys = []

  for (const player of db.players) {
    const key = `${player.country}-${player.year}`
    if (!_playersByCountryYear.has(key)) {
      _playersByCountryYear.set(key, [])
      _countryYearKeys.push(key)
    }
    _playersByCountryYear.get(key)!.push(player)
  }
}

export function useDatabase() {
  /**
   * Load the database (called once in route middleware). Deduped across
   * concurrent callers; a no-op once already loaded.
   */
  async function load() {
    if (_db) return
    if (_loadPromise) return _loadPromise

    // A relative $fetch during SSR normally takes Nitro's "local fetch"
    // shortcut (dispatch straight into the server's own request pipeline,
    // no real network round-trip) -- but that shortcut only traverses
    // Nitro's own route handlers, not Vite's dev-mode static-file
    // middleware that actually serves public/ in `nuxt dev`. The result
    // (verified): local fetch resolves relative paths correctly against
    // the production build's compiled asset manifest, but 404s them in
    // dev, which crashed SSR for every /draft/** and /tournament/** route.
    // An absolute URL forces a real request instead, which both Vite's
    // dev middleware and the production static handler answer correctly
    // -- verified: identical ~2ms overhead in production, and dev works.
    const url = import.meta.server ? `${useRequestURL().origin}/eurodraft_db.json` : '/eurodraft_db.json'

    _loadPromise = $fetch<EuroDraftDB>(url)
      .then((db) => {
        _db = db
        buildIndexes(db)
      })
      .finally(() => {
        _loadPromise = null
      })

    return _loadPromise
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
