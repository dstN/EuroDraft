import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { EuroDraftDB, Player } from '../../app/types'

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'p',
    name: 'Player',
    nameNormalized: 'player',
    country: 'de',
    countryName: 'Germany',
    year: 2020,
    shirtNumber: 9,
    basePosition: 'Forward',
    positions: ['ST'],
    primaryPosition: 'ST',
    stats: { overall: 80, pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80 },
    enrichmentSource: 'curated',
    ...overrides
  }
}

const FAKE_DB: EuroDraftDB = {
  meta: { version: 'test', generatedAt: '2026-01-01', totalPlayers: 3, totalTeams: 2 },
  tournaments: [
    { year: 2020, hostCountry: 'eu', winner: 'it', runnerUp: 'en', format: '24-teams', teams: ['it', 'en', 'de'] },
    { year: 2024, hostCountry: 'de', winner: 'es', runnerUp: 'en', format: '24-teams', teams: ['es', 'en'] }
  ],
  players: [
    makePlayer({ id: 'de-2020-a', nameNormalized: 'de player a', country: 'de', countryName: 'Germany', year: 2020 }),
    makePlayer({ id: 'de-2020-b', nameNormalized: 'de player b', country: 'de', countryName: 'Germany', year: 2020, positions: ['CB'], primaryPosition: 'CB' }),
    makePlayer({ id: 'es-2024-a', nameNormalized: 'es player a', country: 'es', countryName: 'Spain', year: 2024 })
  ]
}

describe('parseTeamKey', async () => {
  const { parseTeamKey } = await import('../../app/composables/useDatabase')

  it('splits a simple country-year key', () => {
    expect(parseTeamKey('de-2020')).toEqual({ country: 'de', year: 2020 })
  })

  it('uses the last dash, so multi-part/historical country codes survive', () => {
    // Historical codes like "su" (Soviet Union) don't contain dashes themselves,
    // but this guards the general contract: only the final "-YYYY" is the year.
    expect(parseTeamKey('csk-1976')).toEqual({ country: 'csk', year: 1976 })
  })

  it('falls back to year 0 when there is no dash at all', () => {
    expect(parseTeamKey('noyear')).toEqual({ country: 'noyear', year: 0 })
  })

  it('falls back to year 0 when the suffix after the last dash is not numeric', () => {
    expect(parseTeamKey('de-abc')).toEqual({ country: 'de', year: 0 })
  })
})

describe('useDatabase', () => {
  describe('before load()', () => {
    it('throws from any query function until load() has resolved', async () => {
      vi.resetModules()
      const { useDatabase } = await import('../../app/composables/useDatabase')
      const db = useDatabase()

      expect(db.isLoaded).toBe(false)
      expect(() => db.getSquad('de', 2020)).toThrow('not loaded')
      expect(() => db.getAllTeamKeys()).toThrow('not loaded')
    })
  })

  describe('after load()', () => {
    let db: ReturnType<Awaited<typeof import('../../app/composables/useDatabase')>['useDatabase']>

    beforeAll(async () => {
      vi.resetModules()
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(FAKE_DB))
      const { useDatabase } = await import('../../app/composables/useDatabase')
      db = useDatabase()
      await db.load()
    })

    it('marks itself loaded and exposes meta', () => {
      expect(db.isLoaded).toBe(true)
      expect(db.meta?.totalPlayers).toBe(3)
    })

    it('is a no-op the second time (module-scoped cache, single $fetch call)', async () => {
      await db.load()
      expect($fetch).toHaveBeenCalledTimes(1)
    })

    it('indexes players by country-year for getSquad', () => {
      expect(db.getSquad('de', 2020)).toHaveLength(2)
      expect(db.getSquad('es', 2024)).toHaveLength(1)
      expect(db.getSquad('fr', 1998)).toEqual([])
    })

    it('getYearsForCountry returns sorted years with players, for that country only', () => {
      expect(db.getYearsForCountry('de')).toEqual([2020])
      expect(db.getYearsForCountry('es')).toEqual([2024])
      expect(db.getYearsForCountry('zz')).toEqual([])
    })

    it('getCountriesForYear returns countries with players, for that year only', () => {
      expect(db.getCountriesForYear(2020)).toEqual(['de'])
      expect(db.getCountriesForYear(2024)).toEqual(['es'])
    })

    it('getAllTeamKeys returns one key per distinct country-year combination present in players', () => {
      expect(db.getAllTeamKeys().sort()).toEqual(['de-2020', 'es-2024'])
    })

    it('getTournament looks up by year, independent of the players index', () => {
      expect(db.getTournament(2020)?.winner).toBe('it')
      expect(db.getTournament(1954)).toBeUndefined()
    })

    it('getAllTournamentYears returns all tournament years sorted', () => {
      expect(db.getAllTournamentYears()).toEqual([2020, 2024])
    })

    it('getRandomTeams returns up to `count` teams, excluding any given keys', () => {
      const excludingBoth = db.getRandomTeams(5, ['de-2020', 'es-2024'])
      expect(excludingBoth).toEqual([])

      const one = db.getRandomTeams(1, ['es-2024'])
      expect(one).toEqual([{ country: 'de', year: 2020 }])
    })
  })
})
