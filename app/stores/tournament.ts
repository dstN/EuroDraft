import { defineStore } from 'pinia'
import type {
  TournamentTeam, Group, GroupStanding, KnockoutBracket,
  MatchResult, TournamentPhase, Player,
  TournamentRunStats, PlayerTournamentStats
} from '~/types'
import { useDatabase } from '~/composables/useDatabase'
import { useDraftStore } from '~/stores/draft'
import { useMatchEngine, calculateSectionRatings } from '~/composables/useMatchEngine'

// ============================================================
// Tournament Store — with progressive simulation & custom team
// ============================================================

function buildTournamentTeam(
  country: string,
  year: number,
  squad: Player[],
  isPlayerTeam: boolean,
  customName?: string,
  customEmblem?: string
): TournamentTeam {
  const ratings = calculateSectionRatings(squad)
  return {
    id: isPlayerTeam ? 'player-team' : `${country}-${year}`,
    country: isPlayerTeam ? (customEmblem || 'eu') : country,
    year: isPlayerTeam ? 2024 : year,
    countryName: isPlayerTeam ? (customName || 'Dream XI') : (squad[0]?.countryName ?? country.toUpperCase()),
    squad,
    isPlayerTeam,
    ...ratings
  }
}

function buildGroupStandings(teams: TournamentTeam[], matches: MatchResult[]): GroupStanding[] {
  const standings: Map<string, GroupStanding> = new Map(
    teams.map(t => [t.id, {
      team: t, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0
    }])
  )

  for (const match of matches) {
    const a = standings.get(match.teamA.team.id)
    const b = standings.get(match.teamB.team.id)
    if (!a || !b) continue

    a.played++
    b.played++
    a.goalsFor += match.teamA.goals
    a.goalsAgainst += match.teamB.goals
    b.goalsFor += match.teamB.goals
    b.goalsAgainst += match.teamA.goals

    if (match.teamA.goals > match.teamB.goals) {
      a.won++
      a.points += 3
      b.lost++
    } else if (match.teamA.goals < match.teamB.goals) {
      b.won++
      b.points += 3
      a.lost++
    } else {
      a.drawn++
      a.points++
      b.drawn++
      b.points++
    }
  }

  return [...standings.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    return b.goalsFor - a.goalsFor
  })
}

export const useTournamentStore = defineStore('tournament', () => {
  const db = useDatabase()
  const draft = useDraftStore()
  const { simulateMatch } = useMatchEngine()

  const groups = ref<Group[]>([])
  const knockoutBracket = ref<KnockoutBracket>({ quarterFinals: [], semiFinals: [], final: null })
  const tournamentPhase = ref<TournamentPhase>('group')
  const playerTeam = ref<TournamentTeam | null>(null)

  // Progressive simulation steps: 0 = not started, 1 = MD1, 2 = MD2, 3 = MD3, 4 = QF, 5 = SF, 6 = Final (Complete)
  const simulationStep = ref<number>(0)
  const isSimulating = ref<boolean>(false)

  /** Player's team journey */
  const playerMatches = computed((): MatchResult[] => {
    if (!playerTeam.value) return []
    const pid = playerTeam.value.id
    const allMatches = [
      ...groups.value.flatMap(g => g.matches),
      ...knockoutBracket.value.quarterFinals,
      ...knockoutBracket.value.semiFinals,
      ...(knockoutBracket.value.final ? [knockoutBracket.value.final] : [])
    ]
    return allMatches.filter(m =>
      m.teamA.team.id === pid || m.teamB.team.id === pid
    )
  })

  const isChampion = computed(() => {
    const final = knockoutBracket.value.final
    if (!final || !playerTeam.value) return false
    const pid = playerTeam.value.id
    const winner = final.penalties
      ? (final.penalties.teamA > final.penalties.teamB ? final.teamA.team.id : final.teamB.team.id)
      : (final.teamA.goals > final.teamB.goals ? final.teamA.team.id : final.teamB.team.id)
    return winner === pid
  })

  /** Detailed Tournament Run Performance Statistics for the Drafted Squad */
  const runStats = computed((): TournamentRunStats | null => {
    if (!playerTeam.value) return null
    const pid = playerTeam.value.id
    const matches = playerMatches.value
    if (matches.length === 0) return null

    const statsMap = new Map<string, PlayerTournamentStats>()
    for (const player of playerTeam.value.squad) {
      statsMap.set(player.id, {
        player,
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        ga: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        gaPer90: 0,
        rating: 6.0
      })
    }

    let totalGoalsFor = 0
    let totalGoalsAgainst = 0
    let cleanSheets = 0
    let totalYellowCards = 0
    let totalRedCards = 0

    for (const match of matches) {
      const isTeamA = match.teamA.team.id === pid
      const myGoals = isTeamA ? match.teamA.goals : match.teamB.goals
      const theirGoals = isTeamA ? match.teamB.goals : match.teamA.goals
      const isCleanSheet = theirGoals === 0

      totalGoalsFor += myGoals
      totalGoalsAgainst += theirGoals
      if (isCleanSheet) cleanSheets++

      const matchDuration = match.extraTime ? 120 : 90

      // Add appearances and minutes for all starters
      for (const player of playerTeam.value.squad) {
        const pStats = statsMap.get(player.id)!
        pStats.matches++
        pStats.minutes += matchDuration
        if (isCleanSheet && (player.primaryPosition === 'GK' || ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(player.primaryPosition))) {
          pStats.cleanSheets++
        }
      }

      // Process events from this match
      for (const ev of match.events) {
        const isMyTeam = (isTeamA && ev.team === 'A') || (!isTeamA && ev.team === 'B')
        if (!isMyTeam) continue

        if (ev.type === 'goal' && ev.playerId && statsMap.has(ev.playerId)) {
          statsMap.get(ev.playerId)!.goals++
        }
        if (ev.type === 'goal' && ev.assistPlayerId && statsMap.has(ev.assistPlayerId)) {
          statsMap.get(ev.assistPlayerId)!.assists++
        }
        if (ev.type === 'yellow-card') {
          totalYellowCards++
          if (ev.playerId && statsMap.has(ev.playerId)) {
            statsMap.get(ev.playerId)!.yellowCards++
          }
        }
        if (ev.type === 'red-card') {
          totalRedCards++
          if (ev.playerId && statsMap.has(ev.playerId)) {
            statsMap.get(ev.playerId)!.redCards++
          }
        }
      }
    }

    // Calculate G+A, G+A per 90, and match rating
    const playerStatsList = [...statsMap.values()].map((p) => {
      p.ga = p.goals + p.assists
      p.gaPer90 = p.minutes > 0 ? Number(((p.ga / p.minutes) * 90).toFixed(2)) : 0
      const rawRating = 6.2 + (p.goals * 0.85) + (p.assists * 0.55) + (p.cleanSheets * 0.4) - (p.yellowCards * 0.4) - (p.redCards * 1.5)
      p.rating = Number(Math.min(9.9, Math.max(5.5, rawRating)).toFixed(1))
      return p
    })

    // Sort by G+A desc, then Goals desc, then Rating desc
    playerStatsList.sort((a, b) => b.ga !== a.ga ? b.ga - a.ga : (b.goals !== a.goals ? b.goals - a.goals : b.rating - a.rating))

    // Top Scorer
    const scorers = [...playerStatsList].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)
    const topScorer = scorers[0] ?? null

    // Top Assister
    const assisters = [...playerStatsList].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists)
    const topAssister = assisters[0] ?? null

    // MVP (Highest G+A or highest rated player)
    const topGA = playerStatsList[0]
    const mvp: PlayerTournamentStats | null = (topGA && topGA.ga > 0)
      ? topGA
      : (playerStatsList.length > 0 ? [...playerStatsList].sort((a, b) => b.rating - a.rating)[0] ?? null : null)

    // Best G+A per 90
    const gaContributors = [...playerStatsList].filter(p => p.ga > 0).sort((a, b) => b.gaPer90 - a.gaPer90)
    const bestGAPer90 = gaContributors[0] ?? null

    return {
      totalMatches: matches.length,
      totalGoalsFor,
      totalGoalsAgainst,
      cleanSheets,
      totalYellowCards,
      totalRedCards,
      topScorer,
      topAssister,
      mvp,
      bestGAPer90,
      playerStats: playerStatsList
    }
  })

  // All precalculated matches stored internally to reveal progressively
  const _allGroupMatches = ref<Map<string, MatchResult[]>>(new Map())

  function initTournament() {
    if (!draft.formation || !draft.isComplete) {
      throw new Error('Draft must be complete before initializing tournament')
    }

    const draftedSquad = draft.filledSlots
      .filter(s => s.player !== null)
      .map(s => s.player!)

    playerTeam.value = buildTournamentTeam(
      draft.teamEmblem || 'eu',
      2024,
      draftedSquad,
      true,
      draft.teamName || 'Dream XI',
      draft.teamEmblem || 'eu'
    )

    // Pick 15 CPU teams
    const cpuTeamRefs = db.getRandomTeams(15, ['player-team'])
    const cpuTeams = cpuTeamRefs.map((ref) => {
      const squad = db.getSquad(ref.country, ref.year)
      return buildTournamentTeam(ref.country, ref.year, squad, false)
    })

    const allTeams = [playerTeam.value, ...cpuTeams]
      .sort(() => Math.random() - 0.5) // Random seeding

    // Precalculate group matches
    let matchSeed = Date.now()
    _allGroupMatches.value.clear()

    groups.value = (['A', 'B', 'C', 'D'] as const).map((id, i) => {
      const teamSlice = allTeams.slice(i * 4, i * 4 + 4)
      const groupMatchList: MatchResult[] = []

      // 3 matchdays for 4 teams (6 matches total per group)
      // MD1: 0 vs 1, 2 vs 3
      // MD2: 0 vs 2, 1 vs 3
      // MD3: 0 vs 3, 1 vs 2
      const pairings = [
        [0, 1], [2, 3], // MD1
        [0, 2], [1, 3], // MD2
        [0, 3], [1, 2] // MD3
      ]

      for (const [t1, t2] of pairings) {
        groupMatchList.push(
          simulateMatch(teamSlice[t1!]!, teamSlice[t2!]!, 'group', matchSeed++)
        )
      }

      _allGroupMatches.value.set(id, groupMatchList)
      return { id, teams: teamSlice, matches: [], standings: buildGroupStandings(teamSlice, []) }
    })

    knockoutBracket.value = { quarterFinals: [], semiFinals: [], final: null }
    simulationStep.value = 0
    tournamentPhase.value = 'group'
  }

  // Advance simulation by 1 step (Matchday 1 -> 2 -> 3 -> QF -> SF -> Final)
  function advanceSimulationStep() {
    if (simulationStep.value >= 6) return

    simulationStep.value++

    if (simulationStep.value <= 3) {
      // Reveal group matchday
      const matchLimit = simulationStep.value * 2 // 2 matches per matchday
      for (const group of groups.value) {
        const fullList = _allGroupMatches.value.get(group.id) ?? []
        group.matches = fullList.slice(0, matchLimit)
        group.standings = buildGroupStandings(group.teams, group.matches)
      }
    } else if (simulationStep.value === 4) {
      // Simulate Quarter-Finals
      const [groupA, groupB, groupC, groupD] = groups.value
      if (groupA && groupB && groupC && groupD) {
        let seed = Date.now() + 2000
        const qf1 = simulateMatch(groupA.standings[0]!.team, groupB.standings[1]!.team, 'quarter-final', seed++)
        const qf2 = simulateMatch(groupC.standings[0]!.team, groupD.standings[1]!.team, 'quarter-final', seed++)
        const qf3 = simulateMatch(groupB.standings[0]!.team, groupA.standings[1]!.team, 'quarter-final', seed++)
        const qf4 = simulateMatch(groupD.standings[0]!.team, groupC.standings[1]!.team, 'quarter-final', seed)
        knockoutBracket.value.quarterFinals = [qf1, qf2, qf3, qf4]
      }
    } else if (simulationStep.value === 5) {
      // Simulate Semi-Finals
      const qfs = knockoutBracket.value.quarterFinals
      if (qfs.length === 4) {
        let seed = Date.now() + 3000
        const getWinner = (m: MatchResult): TournamentTeam => {
          if (m.penalties) return m.penalties.teamA > m.penalties.teamB ? m.teamA.team : m.teamB.team
          return m.teamA.goals >= m.teamB.goals ? m.teamA.team : m.teamB.team
        }
        const sf1 = simulateMatch(getWinner(qfs[0]!), getWinner(qfs[1]!), 'semi-final', seed++)
        const sf2 = simulateMatch(getWinner(qfs[2]!), getWinner(qfs[3]!), 'semi-final', seed)
        knockoutBracket.value.semiFinals = [sf1, sf2]
      }
    } else if (simulationStep.value === 6) {
      // Simulate Final
      const sfs = knockoutBracket.value.semiFinals
      if (sfs.length === 2) {
        const seed = Date.now() + 4000
        const getWinner = (m: MatchResult): TournamentTeam => {
          if (m.penalties) return m.penalties.teamA > m.penalties.teamB ? m.teamA.team : m.teamB.team
          return m.teamA.goals >= m.teamB.goals ? m.teamA.team : m.teamB.team
        }
        const final = simulateMatch(getWinner(sfs[0]!), getWinner(sfs[1]!), 'final', seed)
        knockoutBracket.value.final = final
        tournamentPhase.value = 'complete'
      }
    }
  }

  // Fast forward all rounds immediately
  function skipAllSimulation() {
    while (simulationStep.value < 6) {
      advanceSimulationStep()
    }
    tournamentPhase.value = 'complete'
  }

  function reset() {
    groups.value = []
    knockoutBracket.value = { quarterFinals: [], semiFinals: [], final: null }
    tournamentPhase.value = 'group'
    playerTeam.value = null
    simulationStep.value = 0
    isSimulating.value = false
    _allGroupMatches.value.clear()
  }

  return {
    groups,
    knockoutBracket,
    tournamentPhase,
    playerTeam,
    playerMatches,
    isChampion,
    runStats,
    simulationStep,
    isSimulating,
    initTournament,
    advanceSimulationStep,
    skipAllSimulation,
    reset
  }
})
