import type { Formation, FormationSlots, PositionCode } from '~/types'

// ============================================================
// All valid EuroDraft formations
// Each has exactly 1 GK slot + 10 outfield positions = 11 total
// ============================================================

const defineFormation = (id: string, label: string, slots: FormationSlots): Formation => ({
  id,
  label,
  slots
})

export const ALL_FORMATIONS: Formation[] = [
  // --- Balanced ---
  defineFormation('4-4-2', '4-4-2', { GK: 1, CB: 2, LB: 1, RB: 1, LM: 1, CM: 2, RM: 1, ST: 2 }),
  defineFormation('4-3-3', '4-3-3', { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 1, CM: 2, LW: 1, RW: 1, ST: 1 }),
  defineFormation('4-2-3-1', '4-2-3-1', { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 2, CAM: 1, LW: 1, RW: 1, ST: 1 }),
  defineFormation('4-1-4-1', '4-1-4-1', { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 1, LM: 1, CM: 2, RM: 1, ST: 1 }),
  defineFormation('4-4-1-1', '4-4-1-1', { GK: 1, CB: 2, LB: 1, RB: 1, LM: 1, CM: 2, RM: 1, CAM: 1, ST: 1 }),
  defineFormation('4-1-2-1-2', '4-1-2-1-2 (Diamond)', { GK: 1, CB: 2, LB: 1, RB: 1, CDM: 1, LM: 1, RM: 1, CAM: 1, ST: 2 }),
  // --- Defensive ---
  defineFormation('5-3-2', '5-3-2', { GK: 1, CB: 3, LB: 1, RB: 1, CM: 2, CAM: 1, ST: 2 }),
  defineFormation('5-4-1', '5-4-1', { GK: 1, CB: 3, LB: 1, RB: 1, LM: 1, CM: 2, RM: 1, ST: 1 }),
  // --- Attacking ---
  defineFormation('3-5-2', '3-5-2', { GK: 1, CB: 3, LM: 1, CDM: 1, CM: 1, RM: 1, CAM: 1, ST: 2 }),
  defineFormation('3-4-3', '3-4-3', { GK: 1, CB: 3, LM: 1, CM: 2, RM: 1, LW: 1, RW: 1, ST: 1 }),
  defineFormation('4-3-2-1', '4-3-2-1 (Christmas Tree)', { GK: 1, CB: 2, LB: 1, RB: 1, CM: 3, CAM: 2, ST: 1 })
]

/** Pick 3 unique random formations from the full list */
export function pickRandomFormations(count = 3): Formation[] {
  const shuffled = [...ALL_FORMATIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/** Expand slots map to an ordered flat list of position codes */
export function expandFormationToSlots(formation: Formation): PositionCode[] {
  const order: PositionCode[] = [
    'GK',
    'CB', 'LB', 'RB',
    'CDM',
    'CM', 'LM', 'RM',
    'CAM',
    'LW', 'RW', 'CF', 'ST'
  ]

  const result: PositionCode[] = []
  for (const pos of order) {
    const count = formation.slots[pos] ?? 0
    for (let i = 0; i < count; i++) {
      result.push(pos)
    }
  }
  return result
}

/** Total slot count for a formation (should always be 11) */
export function countFormationSlots(formation: Formation): number {
  return Object.values(formation.slots).reduce((sum, n) => sum + (n ?? 0), 0)
}
