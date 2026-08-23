import { defineStore } from 'pinia'
import type { Formation, DraftSlot, Player, PositionCode } from '~/types'
import { expandFormationToSlots } from '~/composables/useFormations'

// ============================================================
// Draft Store — core draft state
// ============================================================

export const useDraftStore = defineStore('draft', () => {
  // ---- State ----
  const teamName = ref<string>('Dream XI')
  const teamEmblem = ref<string>('eu')
  const formation = ref<Formation | null>(null)
  const slots = ref<DraftSlot[]>([])
  /** Set of "nameNormalized|country" to prevent same player being drafted twice */
  const draftedPlayerKeys = ref<Set<string>>(new Set())
  const rerollsRemaining = ref(3)
  const draftPhase = ref<'formation-select' | 'drafting' | 'complete'>('formation-select')

  // ---- Getters ----
  const filledSlots = computed(() => slots.value.filter(s => s.player !== null))
  const emptySlots = computed(() => slots.value.filter(s => s.player === null))
  const availablePositions = computed((): PositionCode[] => emptySlots.value.map(s => s.position))
  const isComplete = computed(() => filledSlots.value.length === 11)
  const draftProgress = computed(() => `${filledSlots.value.length}/11`)
  const teamOVR = computed(() => {
    if (filledSlots.value.length === 0) return 0
    const sum = filledSlots.value.reduce((acc, s) => acc + (s.player?.stats.overall ?? 0), 0)
    return Math.round(sum / filledSlots.value.length)
  })

  // ---- Actions ----
  function selectFormation(f: Formation) {
    formation.value = f
    const positionList = expandFormationToSlots(f)
    slots.value = positionList.map((pos, index) => ({
      id: `${pos}-${index}`,
      position: pos,
      player: null
    }))
    draftPhase.value = 'drafting'
  }

  function draftPlayer(slotId: string, player: Player) {
    const slot = slots.value.find(s => s.id === slotId)
    if (!slot) throw new Error(`Slot ${slotId} not found`)
    if (slot.player) throw new Error(`Slot ${slotId} already filled`)

    const playerKey = `${player.nameNormalized}|${player.country}`
    if (draftedPlayerKeys.value.has(playerKey)) {
      throw new Error(`Player ${player.name} already drafted`)
    }
    if (!player.positions.includes(slot.position)) {
      throw new Error(`${player.name} cannot play ${slot.position}`)
    }

    slot.player = {
      ...player,
      draftedPosition: slot.position
    }
    draftedPlayerKeys.value.add(playerKey)

    if (isComplete.value) {
      draftPhase.value = 'complete'
    }
  }

  /**
   * Can this player fill at least one remaining open slot?
   * Used by roulette to check eligibility and by UI to grey out players.
   */
  function canDraftToAnySlot(player: Player): boolean {
    const playerKey = `${player.nameNormalized}|${player.country}`
    if (draftedPlayerKeys.value.has(playerKey)) return false
    return emptySlots.value.some(slot => player.positions.includes(slot.position))
  }

  /**
   * Which empty slots can this specific player fill?
   */
  function getCompatibleSlots(player: Player): DraftSlot[] {
    const playerKey = `${player.nameNormalized}|${player.country}`
    if (draftedPlayerKeys.value.has(playerKey)) return []
    return emptySlots.value.filter(slot => player.positions.includes(slot.position))
  }

  function resetDraft() {
    formation.value = null
    slots.value = []
    draftedPlayerKeys.value = new Set()
    rerollsRemaining.value = 3
    draftPhase.value = 'formation-select'
  }

  return {
    // State
    teamName,
    teamEmblem,
    formation,
    slots,
    draftedPlayerKeys,
    rerollsRemaining,
    draftPhase,
    // Getters
    filledSlots,
    emptySlots,
    availablePositions,
    isComplete,
    draftProgress,
    teamOVR,
    // Actions
    selectFormation,
    draftPlayer,
    canDraftToAnySlot,
    getCompatibleSlots,
    resetDraft
  }
})
