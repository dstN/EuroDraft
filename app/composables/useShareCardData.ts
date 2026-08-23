import type { Player, PositionCode, TournamentRunStats } from '~/types'

// ============================================================
// useShareCardData — derived squad/performer data shared by both
// tabs of TournamentShareModal.vue (the text summary and the
// canvas-rendered image both need the same sorted lineup and top
// performers, computed from the same drafted-slot lookup).
// ============================================================

// Positional Pitch Order Priority (GK -> LB/LWB -> CB -> RB/RWB -> LM -> CDM/CM/CAM -> RM -> LW -> CF/ST -> RW)
export const POS_PRIORITY: Record<string, number> = {
  GK: 1,
  LB: 10,
  LWB: 11,
  CB: 12,
  RWB: 13,
  RB: 14,
  LM: 20,
  CDM: 21,
  CM: 22,
  CAM: 23,
  RM: 24,
  LW: 30,
  CF: 31,
  ST: 32,
  RW: 33
}

export function useShareCardData(props: {
  squad: Player[]
  runStats: TournamentRunStats | null
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  groupStandingRank?: number
  groupPoints?: number
}) {
  const draftStore = useDraftStore()

  function getPlayerPickedPosition(player: Player): PositionCode {
    if (player.draftedPosition) return player.draftedPosition
    const slot = draftStore.slots.find(s => s.player?.id === player.id || (s.player?.nameNormalized === player.nameNormalized && s.player?.country === player.country))
    if (slot?.position) return slot.position
    return player.primaryPosition || 'CM'
  }

  // 11 Starters ordered by GK > DEF > MID > ATT with actual picked positions
  const sortedSquad = computed(() => {
    return [...props.squad].map(player => ({
      ...player,
      pickedPosition: getPlayerPickedPosition(player)
    })).sort((a, b) => {
      const pA = a.pickedPosition
      const pB = b.pickedPosition
      const prioA = POS_PRIORITY[pA] ?? (a.basePosition === 'Goalkeeper' ? 1 : a.basePosition === 'Defender' ? 2 : a.basePosition === 'Midfielder' ? 3 : 4)
      const prioB = POS_PRIORITY[pB] ?? (b.basePosition === 'Goalkeeper' ? 1 : b.basePosition === 'Defender' ? 2 : b.basePosition === 'Midfielder' ? 3 : 4)
      if (prioA !== prioB) return prioA - prioB
      return b.stats.overall - a.stats.overall
    })
  })

  // Top 3 Scorers & Playmakers (G/A contributors)
  const topPerformers = computed(() => {
    if (!props.runStats?.playerStats) return []
    return [...props.runStats.playerStats]
      .filter(p => (p.goals > 0 || p.assists > 0))
      .sort((a, b) => {
        const gaA = a.goals + a.assists
        const gaB = b.goals + b.assists
        if (gaB !== gaA) return gaB - gaA
        return b.goals - a.goals
      })
      .slice(0, 3)
  })

  const outcomeTitle = computed(() => {
    switch (props.outcome) {
      case 'winner': return '🏆 Continental Champions'
      case 'runner_up': return '🥈 Tournament Runner-Up (Finalist)'
      case 'semi_final': return '🥉 Semi-Finalist (Top 4)'
      case 'quarter_final': return 'Quarter-Finalist (Top 8)'
      default: return `Group Stage Exit${props.groupStandingRank ? ` (${props.groupStandingRank}. Place · ${props.groupPoints ?? 0} pts)` : ''}`
    }
  })

  const outcomeBadge = computed(() => {
    switch (props.outcome) {
      case 'winner': return '🏆 CHAMPION'
      case 'runner_up': return '🥈 RUNNER-UP'
      case 'semi_final': return '🥉 TOP 4'
      case 'quarter_final': return 'TOP 8'
      default: return 'GROUP STAGE'
    }
  })

  return {
    getPlayerPickedPosition,
    sortedSquad,
    topPerformers,
    outcomeTitle,
    outcomeBadge
  }
}
