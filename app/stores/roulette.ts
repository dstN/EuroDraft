import { defineStore } from 'pinia'
import type { Player } from '~/types'
import { useDatabase } from '~/composables/useDatabase'
import { useDraftStore } from '~/stores/draft'

// ============================================================
// Roulette Store — manages the team spin and reroll mechanics
// ============================================================

export const useRouletteStore = defineStore('roulette', () => {
  const db = useDatabase()
  const draft = useDraftStore()

  // ---- State ----
  const currentCountry = ref<string | null>(null)
  const currentYear = ref<number | null>(null)
  const currentSquad = ref<Player[]>([])
  const usedTeamKeys = ref<Set<string>>(new Set())
  const isSpinning = ref(false)

  // ---- Getters ----
  const currentTeamKey = computed(() =>
    currentCountry.value && currentYear.value
      ? `${currentCountry.value}-${currentYear.value}`
      : null
  )

  const CATEGORY_ORDER: Record<string, number> = {
    Goalkeeper: 1,
    Defender: 2,
    Midfielder: 3,
    Forward: 4
  }

  const POSITION_ORDER: Record<string, number> = {
    GK: 1,
    CB: 2,
    LB: 3,
    RB: 4,
    CDM: 5,
    CM: 6,
    CAM: 7,
    LM: 8,
    RM: 9,
    LW: 10,
    RW: 11,
    ST: 12,
    CF: 13
  }

  const squadWithEligibility = computed(() => {
    const list = currentSquad.value.map(player => ({
      player,
      canDraft: draft.canDraftToAnySlot(player),
      compatibleSlots: draft.getCompatibleSlots(player)
    }))

    return list.sort((a, b) => {
      // 1. Sort by Position Category (Goalkeepers -> Defenders -> Midfielders -> Forwards)
      const catA = CATEGORY_ORDER[a.player.basePosition] ?? 99
      const catB = CATEGORY_ORDER[b.player.basePosition] ?? 99
      if (catA !== catB) return catA - catB

      // 2. Sort by Specific Primary Position (GK -> CB -> LB -> RB -> CDM -> CM -> CAM -> LM -> RM -> LW -> RW -> ST)
      const posA = POSITION_ORDER[a.player.primaryPosition] ?? 99
      const posB = POSITION_ORDER[b.player.primaryPosition] ?? 99
      if (posA !== posB) return posA - posB

      // 3. Within same position, sort by OVR descending (highest rated first)
      if (b.player.stats.overall !== a.player.stats.overall) {
        return b.player.stats.overall - a.player.stats.overall
      }

      // 4. Fallback to shirt number or name
      return (a.player.shirtNumber ?? 99) - (b.player.shirtNumber ?? 99)
    })
  })

  const hasAnyCandidates = computed(() =>
    squadWithEligibility.value.some(e => e.canDraft)
  )

  // ---- Internal: find a valid team with at least 1 draftable player ----
  function _findValidTeam(excludeKey?: string): { country: string, year: number } | null {
    const allKeys = db.getAllTeamKeys()
    const exclude = new Set([...usedTeamKeys.value])
    if (excludeKey) exclude.add(excludeKey)

    const available = allKeys.filter(k => !exclude.has(k))
    if (available.length === 0) return null

    // Shuffle and find first with a draftable player
    const shuffled = [...available].sort(() => Math.random() - 0.5)

    for (const key of shuffled) {
      const parts = key.split('-')
      const country = parts[0]!
      const year = parseInt(parts[1]!)
      const squad = db.getSquad(country, year)

      const hasDraftable = squad.some(p => draft.canDraftToAnySlot(p))
      if (hasDraftable) {
        return { country, year }
      }
      // Skip this team silently (no reroll cost)
      usedTeamKeys.value.add(key)
    }

    return null // All remaining teams exhausted
  }

  // ---- Actions ----
  function spin() {
    isSpinning.value = true

    try {
      const result = _findValidTeam()
      if (!result) {
        // Extremely rare edge case — no teams left with draftable players
        console.warn('[Roulette] No valid teams remaining')
        return
      }

      const key = `${result.country}-${result.year}`
      usedTeamKeys.value.add(key)
      currentCountry.value = result.country
      currentYear.value = result.year
      currentSquad.value = db.getSquad(result.country, result.year)
    } finally {
      isSpinning.value = false
    }
  }

  function rerollYear() {
    if (draft.rerollsRemaining <= 0) return
    if (!currentCountry.value) return

    const country = currentCountry.value
    const availableYears = db.getYearsForCountry(country)
      .filter(y => !usedTeamKeys.value.has(`${country}-${y}`))

    if (availableYears.length === 0) return // No alternative years available

    const newYear = availableYears[Math.floor(Math.random() * availableYears.length)]!
    const newKey = `${country}-${newYear}`

    usedTeamKeys.value.add(newKey)
    currentYear.value = newYear
    currentSquad.value = db.getSquad(country, newYear)
    draft.rerollsRemaining--
  }

  function rerollNation() {
    if (draft.rerollsRemaining <= 0) return
    if (!currentYear.value) return

    const year = currentYear.value
    const availableCountries = db.getCountriesForYear(year)
      .filter(c => !usedTeamKeys.value.has(`${c}-${year}`))

    if (availableCountries.length === 0) return // No alternative nations available

    const newCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)]!
    const newKey = `${newCountry}-${year}`

    usedTeamKeys.value.add(newKey)
    currentCountry.value = newCountry
    currentSquad.value = db.getSquad(newCountry, year)
    draft.rerollsRemaining--
  }

  function reset() {
    currentCountry.value = null
    currentYear.value = null
    currentSquad.value = []
    usedTeamKeys.value = new Set()
    isSpinning.value = false
  }

  return {
    currentCountry,
    currentYear,
    currentSquad,
    usedTeamKeys,
    isSpinning,
    currentTeamKey,
    squadWithEligibility,
    hasAnyCandidates,
    spin,
    rerollYear,
    rerollNation,
    reset
  }
})
