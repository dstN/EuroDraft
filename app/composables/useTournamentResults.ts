import type { MatchResult, Player } from '~/types'

// ============================================================
// useTournamentResults — presentation-layer derived state for
// tournament/index.vue: outcome classification, squad/player
// rating rollups, and match-result display helpers. Split out of
// the page so that page and its child components (group table,
// match lists, outcome banner, stats dashboards) can each pull in
// only what they need instead of everything living in one
// 1200+ line script block.
// ============================================================
export function useTournamentResults() {
  const tournament = useTournamentStore()
  const draft = useDraftStore()

  // Tournament Finish Outcome Classification
  const tournamentOutcome = computed<'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'>(() => {
    if (!tournament.playerTeam) return 'group_stage'
    const pid = tournament.playerTeam.id

    if (tournament.isChampion) return 'winner'

    const final = tournament.knockoutBracket.final
    if (final && (final.teamA.team.id === pid || final.teamB.team.id === pid)) {
      return 'runner_up'
    }

    const sf = tournament.knockoutBracket.semiFinals.find(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
    if (sf) {
      return 'semi_final'
    }

    const qf = tournament.knockoutBracket.quarterFinals.find(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
    if (qf) {
      return 'quarter_final'
    }

    return 'group_stage'
  })

  // Positional Line Rating Averages (DEF, MID, ATT, Overall)
  const squadLineRatings = computed(() => {
    if (!tournament.playerTeam) return { def: 0, mid: 0, att: 0, overall: 0 }
    const squad = tournament.playerTeam.squad

    const defGk = squad.filter(p => p.primaryPosition === 'GK' || ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.primaryPosition) || p.basePosition === 'Defender')
    const mid = squad.filter(p => ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.primaryPosition) || p.basePosition === 'Midfielder')
    const att = squad.filter(p => ['ST', 'CF', 'LW', 'RW'].includes(p.primaryPosition) || p.basePosition === 'Forward')

    const calcAvg = (list: Player[]) => list.length > 0 ? Math.round(list.reduce((sum, p) => sum + p.stats.overall, 0) / list.length) : 0

    return {
      def: calcAvg(defGk),
      mid: calcAvg(mid),
      att: calcAvg(att),
      overall: draft.teamOVR || calcAvg(squad)
    }
  })

  const playerGroup = computed(() => tournament.playerGroup)

  // Player team position in group
  const playerGroupStanding = computed(() => {
    if (!playerGroup.value || !tournament.playerTeam) return null
    const idx = playerGroup.value.standings.findIndex(s => s.team.id === tournament.playerTeam?.id)
    if (idx === -1) return null
    return {
      rank: idx + 1,
      standing: playerGroup.value.standings[idx]!
    }
  })

  // Sorting state for player stats table
  type SortField = 'name' | 'primaryPosition' | 'overall' | 'matches' | 'minutes' | 'goals' | 'assists' | 'ga' | 'rating'
  const sortField = ref<SortField>('ga')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  function setSort(field: SortField) {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
    } else {
      sortField.value = field
      sortOrder.value = 'desc'
    }
  }

  const sortedPlayerStats = computed(() => {
    const list = tournament.runStats?.playerStats ? [...tournament.runStats.playerStats] : []
    return list.sort((a, b) => {
      let valA: string | number = a[sortField.value as keyof typeof a] as number
      let valB: string | number = b[sortField.value as keyof typeof b] as number
      if (sortField.value === 'name') {
        valA = a.player.name
        valB = b.player.name
      } else if (sortField.value === 'primaryPosition') {
        valA = a.player.primaryPosition
        valB = b.player.primaryPosition
      } else if (sortField.value === 'overall') {
        valA = a.player.stats.overall
        valB = b.player.stats.overall
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder.value === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortOrder.value === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
  })

  function opponentTeam(match: MatchResult) {
    const pid = tournament.playerTeam?.id
    return match.teamA.team.id === pid ? match.teamB.team : match.teamA.team
  }

  function matchResultLabel(match: MatchResult): string {
    if (!tournament.playerTeam) return ''
    const pid = tournament.playerTeam.id
    const isTeamA = match.teamA.team.id === pid
    const myGoals = isTeamA ? match.teamA.goals : match.teamB.goals
    const theirGoals = isTeamA ? match.teamB.goals : match.teamA.goals

    if (match.penalties) {
      const myPens = isTeamA ? match.penalties.teamA : match.penalties.teamB
      const theirPens = isTeamA ? match.penalties.teamB : match.penalties.teamA
      const won = myPens > theirPens
      return `${myGoals}–${theirGoals} (${myPens}–${theirPens} pens) ${won ? '✓ Won' : '✗ Lost'}`
    }

    const aetSuffix = match.extraTime ? ' (AET)' : ''
    if (myGoals > theirGoals) return `${myGoals}–${theirGoals}${aetSuffix} ✓ Won`
    if (myGoals < theirGoals) return `${myGoals}–${theirGoals}${aetSuffix} ✗ Lost`
    return `${myGoals}–${theirGoals} Draw`
  }

  function matchResultColor(match: MatchResult): 'success' | 'error' | 'warning' | 'neutral' {
    if (!tournament.playerTeam) return 'neutral'
    const pid = tournament.playerTeam.id
    const isTeamA = match.teamA.team.id === pid
    const myGoals = isTeamA ? match.teamA.goals : match.teamB.goals
    const theirGoals = isTeamA ? match.teamB.goals : match.teamA.goals
    const myPens = match.penalties ? (isTeamA ? match.penalties.teamA : match.penalties.teamB) : null
    const theirPens = match.penalties ? (isTeamA ? match.penalties.teamB : match.penalties.teamA) : null

    if (myGoals > theirGoals || (myPens !== null && myPens > theirPens!)) return 'success'
    if (myGoals < theirGoals || (myPens !== null && myPens < theirPens!)) return 'error'
    return 'warning'
  }

  function matchResultBadgeClass(match: MatchResult): string {
    const color = matchResultColor(match)
    if (color === 'success') return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-300'
    if (color === 'error') return 'bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-300'
    return 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-300'
  }

  // Filter notable key match events (eliminates empty timeline lines)
  function getNotableMatchEvents(match: MatchResult) {
    return match.events
      .filter(e => ['goal', 'yellow-card', 'red-card', 'penalty-shootout'].includes(e.type))
      .sort((a, b) => a.minute - b.minute)
  }

  return {
    tournamentOutcome,
    squadLineRatings,
    playerGroup,
    playerGroupStanding,
    sortField,
    sortOrder,
    setSort,
    sortedPlayerStats,
    opponentTeam,
    matchResultLabel,
    matchResultColor,
    matchResultBadgeClass,
    getNotableMatchEvents
  }
}
