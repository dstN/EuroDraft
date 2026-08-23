import { describe, it, expect } from 'vitest'
import {
  ALL_FORMATIONS,
  expandFormationToSlots,
  countFormationSlots,
  pickRandomFormations
} from '../../app/composables/useFormations'

describe('useFormations', () => {
  describe('ALL_FORMATIONS', () => {
    it('should contain at least 10 formations', () => {
      expect(ALL_FORMATIONS.length).toBeGreaterThanOrEqual(10)
    })

    it('each formation should have exactly 11 slots', () => {
      for (const f of ALL_FORMATIONS) {
        expect(countFormationSlots(f)).toBe(11)
      }
    })

    it('each formation should have exactly 1 GK slot', () => {
      for (const f of ALL_FORMATIONS) {
        expect(f.slots.GK).toBe(1)
      }
    })

    it('each formation should have a unique id', () => {
      const ids = ALL_FORMATIONS.map(f => f.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })
  })

  describe('expandFormationToSlots', () => {
    it('4-3-3 expands to 11 slots in correct order', () => {
      const f433 = ALL_FORMATIONS.find(f => f.id === '4-3-3')!
      const slots = expandFormationToSlots(f433)
      expect(slots).toHaveLength(11)
      expect(slots[0]).toBe('GK')
      expect(slots.filter(p => p === 'GK')).toHaveLength(1)
      expect(slots.filter(p => p === 'CB')).toHaveLength(2)
      expect(slots.filter(p => p === 'LB')).toHaveLength(1)
      expect(slots.filter(p => p === 'RB')).toHaveLength(1)
    })

    it('4-4-2 expands to 11 slots with LM and RM', () => {
      const f442 = ALL_FORMATIONS.find(f => f.id === '4-4-2')!
      const slots = expandFormationToSlots(f442)
      expect(slots).toHaveLength(11)
      expect(slots.filter(p => p === 'LM')).toHaveLength(1)
      expect(slots.filter(p => p === 'RM')).toHaveLength(1)
      expect(slots.filter(p => p === 'ST')).toHaveLength(2)
    })

    it('4-3-2-1 expands to 11 slots with exactly 3 CMs, 2 CAMs, and 1 ST', () => {
      const f4321 = ALL_FORMATIONS.find(f => f.id === '4-3-2-1')!
      const slots = expandFormationToSlots(f4321)
      expect(slots).toHaveLength(11)
      expect(slots.filter(p => p === 'CM')).toHaveLength(3)
      expect(slots.filter(p => p === 'CAM')).toHaveLength(2)
      expect(slots.filter(p => p === 'ST')).toHaveLength(1)
    })
  })

  describe('pickRandomFormations', () => {
    it('returns exactly count unique formations', () => {
      const picked = pickRandomFormations(3)
      expect(picked).toHaveLength(3)
      const ids = picked.map(f => f.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('returned formations are all from ALL_FORMATIONS', () => {
      const picked = pickRandomFormations(3)
      for (const f of picked) {
        expect(ALL_FORMATIONS.some(af => af.id === f.id)).toBe(true)
      }
    })
  })
})
