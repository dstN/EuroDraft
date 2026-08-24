import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDraftStore } from '../../app/stores/draft'
import { ALL_FORMATIONS } from '../../app/composables/useFormations'
import type { Player } from '../../app/types'

const FORMATION_433 = ALL_FORMATIONS.find(f => f.id === '4-3-3')!

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    name: 'Test Player',
    nameNormalized: 'test player',
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

describe('useDraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('selectFormation', () => {
    it('expands the formation into 11 empty slots and resets draft state', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)

      expect(draft.slots).toHaveLength(11)
      expect(draft.slots.every(s => s.player === null)).toBe(true)
      expect(draft.draftPhase).toBe('drafting')
      expect(draft.rerollsRemaining).toBe(3)
      expect(draft.draftedPlayerKeys.size).toBe(0)
      expect(draft.isChallengeMode).toBe(false)
      expect(draft.isLegendMode).toBe(false)
    })

    it('re-selecting a formation clears any in-progress draft', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const gkSlot = draft.slots.find(s => s.position === 'GK')!
      draft.draftPlayer(gkSlot.id, makePlayer({ positions: ['GK'], primaryPosition: 'GK', nameNormalized: 'gk one' }))
      expect(draft.filledSlots).toHaveLength(1)

      draft.selectFormation(FORMATION_433)
      expect(draft.filledSlots).toHaveLength(0)
    })
  })

  describe('draftPlayer', () => {
    it('fills the slot and records the player as drafted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const slot = draft.slots.find(s => s.position === 'ST')!
      const player = makePlayer({ nameNormalized: 'striker one' })

      draft.draftPlayer(slot.id, player)

      expect(slot.player?.name).toBe('Test Player')
      expect(slot.player?.draftedPosition).toBe('ST')
      expect(draft.draftedPlayerKeys.has('striker one|de')).toBe(true)
    })

    it('throws for an unknown slot id', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      expect(() => draft.draftPlayer('not-a-real-slot', makePlayer())).toThrow('not found')
    })

    it('throws when the slot is already filled', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const slot = draft.slots.find(s => s.position === 'ST')!
      draft.draftPlayer(slot.id, makePlayer({ nameNormalized: 'first striker' }))

      expect(() => draft.draftPlayer(slot.id, makePlayer({ nameNormalized: 'second striker' })))
        .toThrow('already filled')
    })

    it('throws when the same player (by normalized name + country) is drafted twice, even to a different slot', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const cbSlots = draft.slots.filter(s => s.position === 'CB')
      const versatilePlayer = makePlayer({ nameNormalized: 'versatile defender', positions: ['CB'] })

      draft.draftPlayer(cbSlots[0]!.id, versatilePlayer)

      expect(() => draft.draftPlayer(cbSlots[1]!.id, versatilePlayer)).toThrow('already drafted')
    })

    it('throws when the player cannot play the slot position', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const gkSlot = draft.slots.find(s => s.position === 'GK')!
      const outfieldPlayer = makePlayer({ positions: ['ST'], nameNormalized: 'cannot keep goal' })

      expect(() => draft.draftPlayer(gkSlot.id, outfieldPlayer)).toThrow('cannot play')
    })

    it('flips draftPhase to complete only once all 11 slots are filled', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)

      draft.slots.forEach((slot, i) => {
        draft.draftPlayer(slot.id, makePlayer({
          positions: [slot.position],
          primaryPosition: slot.position,
          nameNormalized: `player ${i}`
        }))
        if (i < draft.slots.length - 1) {
          expect(draft.draftPhase).toBe('drafting')
        }
      })

      expect(draft.draftPhase).toBe('complete')
      expect(draft.isComplete).toBe(true)
      expect(draft.draftProgress).toBe('11/11')
    })
  })

  describe('canDraftToAnySlot / getCompatibleSlots', () => {
    it('a player compatible with an open slot can be drafted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const striker = makePlayer({ positions: ['ST'] })

      expect(draft.canDraftToAnySlot(striker)).toBe(true)
      expect(draft.getCompatibleSlots(striker).map(s => s.position)).toEqual(['ST'])
    })

    it('a player with no matching open position cannot be drafted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      // 4-3-3 has no CAM slot
      const camOnly = makePlayer({ positions: ['CAM'] })

      expect(draft.canDraftToAnySlot(camOnly)).toBe(false)
      expect(draft.getCompatibleSlots(camOnly)).toEqual([])
    })

    it('an already-drafted player becomes ineligible even for a still-open matching slot', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const cbSlots = draft.slots.filter(s => s.position === 'CB')
      const defender = makePlayer({ positions: ['CB'], nameNormalized: 'drafted defender' })
      draft.draftPlayer(cbSlots[0]!.id, defender)

      // Second CB slot is still open, but this exact player is already drafted
      expect(draft.canDraftToAnySlot(defender)).toBe(false)
      expect(draft.getCompatibleSlots(defender)).toEqual([])
    })

    it('Legend Mode excludes players rated below 90 overall, even if position-compatible', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      draft.isLegendMode = true

      const goodButNotLegend = makePlayer({ positions: ['ST'], stats: { ...makePlayer().stats, overall: 89 } })
      const legend = makePlayer({ positions: ['ST'], nameNormalized: 'a legend', stats: { ...makePlayer().stats, overall: 90 } })

      expect(draft.canDraftToAnySlot(goodButNotLegend)).toBe(false)
      expect(draft.canDraftToAnySlot(legend)).toBe(true)
    })
  })

  describe('teamOVR', () => {
    it('is 0 with no players drafted', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      expect(draft.teamOVR).toBe(0)
    })

    it('is the rounded average overall of drafted players only', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const stSlot = draft.slots.find(s => s.position === 'ST')!
      const cbSlot = draft.slots.find(s => s.position === 'CB')!

      draft.draftPlayer(stSlot.id, makePlayer({
        positions: ['ST'],
        nameNormalized: 'p1',
        stats: { ...makePlayer().stats, overall: 90 }
      }))
      draft.draftPlayer(cbSlot.id, makePlayer({
        positions: ['CB'],
        nameNormalized: 'p2',
        stats: { ...makePlayer().stats, overall: 81 }
      }))

      // (90 + 81) / 2 = 85.5 -> rounds to 86
      expect(draft.teamOVR).toBe(86)
    })
  })

  describe('resetDraft', () => {
    it('clears formation, slots and drafted state back to formation-select', () => {
      const draft = useDraftStore()
      draft.selectFormation(FORMATION_433)
      const slot = draft.slots.find(s => s.position === 'ST')!
      draft.draftPlayer(slot.id, makePlayer())
      draft.rerollsRemaining = 1

      draft.resetDraft()

      expect(draft.formation).toBeNull()
      expect(draft.slots).toEqual([])
      expect(draft.draftedPlayerKeys.size).toBe(0)
      expect(draft.rerollsRemaining).toBe(3)
      expect(draft.draftPhase).toBe('formation-select')
    })
  })
})
