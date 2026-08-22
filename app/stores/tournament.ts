import { defineStore } from 'pinia'
import type {
  TournamentTeam, Group, GroupStanding, KnockoutBracket,
  MatchResult, TournamentPhase, Player
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
    simulationStep,
    isSimulating,
    initTournament,
    advanceSimulationStep,
    skipAllSimulation,
    reset
  }
})
