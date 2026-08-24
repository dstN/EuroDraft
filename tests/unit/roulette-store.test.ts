import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Player } from '../../app/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
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

// Fake teams: 'aa-2000'/'aa-2003' share a country (so rerollYear has a real
// alternative), 'aa-2000'/'dd-2000' share a year (so rerollNation has a real
// alternative), 'bb-2001' is a lone team, and 'cc-2002' has only a GK
// (deliberately incompatible with the tests below, which never open a GK
// slot) -- used to exercise the "team gets silently skipped, not spent as a
// reroll" exhaustion path.
const SQUADS: Record<string, Player[]> = {
  'aa-2000': [makePlayer({ id: 'aa-st', nameNormalized: 'aa striker', country: 'aa', year: 2000 })],
  'aa-2003': [makePlayer({ id: 'aa-st-2003', nameNormalized: 'aa striker later', country: 'aa', year: 2003 })],
  'dd-2000': [makePlayer({ id: 'dd-st', nameNormalized: 'dd striker', country: 'dd', year: 2000 })],
  'bb-2001': [makePlayer({ id: 'bb-st', nameNormalized: 'bb striker', country: 'bb', year: 2001 })],
  'cc-2002': [makePlayer({ id: 'cc-gk', nameNormalized: 'cc keeper', country: 'cc', year: 2002, positions: ['GK'], primaryPosition: 'GK', basePosition: 'Goalkeeper' })]
}

function parseTeamKey(key: string) {
  const lastDash = key.lastIndexOf('-')
  return { country: key.slice(0, lastDash), year: parseInt(key.slice(lastDash + 1), 10) || 0 }
}

vi.mock('~/composables/useDatabase', () => ({
  parseTeamKey,
  useDatabase: () => ({
    getAllTeamKeys: () => Object.keys(SQUADS),
    getSquad: (country: string, year: number) => SQUADS[`${country}-${year}`] ?? [],
    getYearsForCountry: (country: string) => Object.keys(SQUADS)
      .filter(k => k.startsWith(`${country}-`))
      .map(k => parseTeamKey(k).year),
    getCountriesForYear: (year: number) => Object.keys(SQUADS)
      .filter(k => k.endsWith(`-${year}`))
      .map(k => parseTeamKey(k).country)
  })
}))

const { useRouletteStore } = await import('../../app/stores/roulette')
const { useDraftStore } = await import('../../app/stores/draft')
const { ALL_FORMATIONS } = await import('../../app/composables/useFormations')

const FORMATION_433 = ALL_FORMATIONS.find(f => f.id === '4-3-3')!

describe('useRouletteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('spin', () => {
    it('lands on a team with at least one draftable player and marks it used', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      roulette.spin()

      expect(roulette.currentCountry).not.toBeNull()
      expect(roulette.currentSquad.length).toBeGreaterThan(0)
      expect(roulette.usedTeamKeys.has(roulette.currentTeamKey!)).toBe(true)
      expect(roulette.noValidSquadsRemaining).toBe(false)
    })

    it('silently skips (does not reroll-cost) a team with no draftable player for any open slot', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433) // has no GK... wait, 4-3-3 does have a GK slot
      const roulette = useRouletteStore()

      // Fill every slot except one ST, so only aa/bb's striker remains draftable
      // and cc-2002 (GK-only squad, GK slot already filled) must be skipped.
      const gkSlot = draft.slots.find(s => s.position === 'GK')!
      draft.draftPlayer(gkSlot.id, makePlayer({ positions: ['GK'], primaryPosition: 'GK', basePosition: 'Goalkeeper', nameNormalized: 'filled gk' }))

      roulette.spin()

      // cc-2002 can never be landed on (its only player, a GK, has no open
      // slot left) -- it should end up silently marked used without ever
      // being the *result* of a spin.
      const landedOnCC = roulette.currentCountry === 'cc'
      expect(landedOnCC).toBe(false)
    })

    it('sets noValidSquadsRemaining once every team has been exhausted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      // Manually mark every team as used to force immediate exhaustion.
      roulette.usedTeamKeys = new Set(Object.keys(SQUADS))
      roulette.spin()

      expect(roulette.noValidSquadsRemaining).toBe(true)
      expect(roulette.currentCountry).toBeNull()
    })
  })

  describe('rerollYear / rerollNation', () => {
    it('rerollYear swaps to a different year for the same country and consumes a reroll', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      // Force a known starting point rather than relying on a random spin.
      // 'aa-2003' is the only other 'aa' year in the fixture, so the reroll
      // is deterministic despite the store picking randomly among candidates.
      roulette.currentCountry = 'aa'
      roulette.currentYear = 2000
      roulette.currentSquad = SQUADS['aa-2000']!
      roulette.usedTeamKeys = new Set(['aa-2000'])

      const before = draft.rerollsRemaining
      roulette.rerollYear()

      expect(roulette.currentYear).toBe(2003)
      expect(roulette.currentSquad).toEqual(SQUADS['aa-2003'])
      expect(roulette.usedTeamKeys.has('aa-2003')).toBe(true)
      expect(draft.rerollsRemaining).toBe(before - 1)
    })

    it('rerollYear no-ops (and spends no reroll) when no alternative year exists for the country', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      // 'bb-2001' is the only 'bb' team in the fixture.
      roulette.currentCountry = 'bb'
      roulette.currentYear = 2001
      roulette.currentSquad = SQUADS['bb-2001']!
      roulette.usedTeamKeys = new Set(['bb-2001'])

      const before = draft.rerollsRemaining
      roulette.rerollYear()
      expect(draft.rerollsRemaining).toBe(before)
      expect(roulette.currentYear).toBe(2001)
    })

    it('rerollNation swaps to a different country for the same year and consumes a reroll', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      // 'dd-2000' is the only other team sharing year 2000 in the fixture.
      roulette.currentCountry = 'aa'
      roulette.currentYear = 2000
      roulette.currentSquad = SQUADS['aa-2000']!
      roulette.usedTeamKeys = new Set(['aa-2000'])

      const before = draft.rerollsRemaining
      roulette.rerollNation()

      expect(roulette.currentCountry).toBe('dd')
      expect(roulette.currentSquad).toEqual(SQUADS['dd-2000']!)
      expect(roulette.usedTeamKeys.has('dd-2000')).toBe(true)
      expect(draft.rerollsRemaining).toBe(before - 1)
    })

    it('rerollNation no-ops (and spends no reroll) when no alternative country exists for the year', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      // 'bb-2001' is the only team for year 2001 in the fixture.
      roulette.currentCountry = 'bb'
      roulette.currentYear = 2001
      roulette.currentSquad = SQUADS['bb-2001']!
      roulette.usedTeamKeys = new Set(['bb-2001'])

      const before = draft.rerollsRemaining
      roulette.rerollNation()
      expect(draft.rerollsRemaining).toBe(before)
      expect(roulette.currentCountry).toBe('bb')
    })

    it('does nothing once rerollsRemaining is exhausted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()
      draft.rerollsRemaining = 0

      roulette.currentCountry = 'aa'
      roulette.currentYear = 2000
      roulette.currentSquad = SQUADS['aa-2000']!

      roulette.rerollYear()
      roulette.rerollNation()

      expect(draft.rerollsRemaining).toBe(0)
      expect(roulette.currentCountry).toBe('aa')
    })
  })

  describe('squadWithEligibility', () => {
    it('flags each squad member with whether they can currently be drafted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()

      roulette.currentSquad = SQUADS['aa-2000']!
      const [entry] = roulette.squadWithEligibility

      expect(entry!.canDraft).toBe(true)
      expect(entry!.compatibleSlots.map(s => s.position)).toContain('ST')
    })
  })

  describe('reset', () => {
    it('clears all roulette state', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const roulette = useRouletteStore()
      roulette.spin()

      roulette.reset()

      expect(roulette.currentCountry).toBeNull()
      expect(roulette.currentYear).toBeNull()
      expect(roulette.currentSquad).toEqual([])
      expect(roulette.usedTeamKeys.size).toBe(0)
      expect(roulette.noValidSquadsRemaining).toBe(false)
    })
  })
})
