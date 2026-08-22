import { defineStore } from 'pinia'
import type {
  TournamentTeam, Group, GroupStanding, KnockoutBracket,
  MatchResult, TournamentPhase, Player
} from '~/types'
import { useDatabase } from '~/composables/useDatabase'
import { useDraftStore } from '~/stores/draft'
import { useMatchEngine, calculateSectionRatings } from '~/composables/useMatchEngine'

// ============================================================
// Tournament Store
// ============================================================

function buildTournamentTeam(
  country: string,
  year: number,
  squad: Player[],
  isPlayerTeam: boolean
): TournamentTeam {
  const ratings = calculateSectionRatings(squad)
  return {
    id: `${country}-${year}`,
    country,
    year,
    countryName: squad[0]?.countryName ?? country.toUpperCase(),
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

  /** Player's team journey — for the mobile stacked view */
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

  function initTournament() {
    if (!draft.formation || !draft.isComplete) {
      throw new Error('Draft must be complete before initializing tournament')
    }

    const draftedSquad = draft.filledSlots
      .filter(s => s.player !== null)
      .map(s => s.player!)

    playerTeam.value = buildTournamentTeam('player', 0, draftedSquad, true)

    // Pick 15 CPU teams
    const cpuTeamRefs = db.getRandomTeams(15, [`player-0`])
    const cpuTeams = cpuTeamRefs.map((ref) => {
      const squad = db.getSquad(ref.country, ref.year)
      return buildTournamentTeam(ref.country, ref.year, squad, false)
    })

    const allTeams = [playerTeam.value, ...cpuTeams]
      .sort(() => Math.random() - 0.5) // Random seeding

    // Split into 4 groups of 4
    groups.value = (['A', 'B', 'C', 'D'] as const).map((id, i) => {
      const teamSlice = allTeams.slice(i * 4, i * 4 + 4)
      return { id, teams: teamSlice, matches: [], standings: [] }
    })

    simulateGroupStage()
  }

  function simulateGroupStage() {
    let matchSeed = Date.now()

    for (const group of groups.value) {
      group.matches = []
      // Round-robin: each pair plays once
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          const match = simulateMatch(
            group.teams[i]!, group.teams[j]!, 'group', matchSeed++
          )
          group.matches.push(match)
        }
      }
      group.standings = buildGroupStandings(group.teams, group.matches)
    }

    simulateKnockouts()
    tournamentPhase.value = 'complete'
  }

  function simulateKnockouts() {
    // Quarter-finals: 1st of A vs 2nd of B, etc.
    const [groupA, groupB, groupC, groupD] = groups.value
    if (!groupA || !groupB || !groupC || !groupD) return

    let seed = Date.now() + 1000

    const qf1 = simulateMatch(groupA.standings[0]!.team, groupB.standings[1]!.team, 'quarter-final', seed++)
    const qf2 = simulateMatch(groupC.standings[0]!.team, groupD.standings[1]!.team, 'quarter-final', seed++)
    const qf3 = simulateMatch(groupB.standings[0]!.team, groupA.standings[1]!.team, 'quarter-final', seed++)
    const qf4 = simulateMatch(groupD.standings[0]!.team, groupC.standings[1]!.team, 'quarter-final', seed++)
    knockoutBracket.value.quarterFinals = [qf1, qf2, qf3, qf4]

    const getWinner = (m: MatchResult): TournamentTeam => {
      if (m.penalties) {
        return m.penalties.teamA > m.penalties.teamB ? m.teamA.team : m.teamB.team
      }
      return m.teamA.goals >= m.teamB.goals ? m.teamA.team : m.teamB.team
    }

    const sf1 = simulateMatch(getWinner(qf1), getWinner(qf2), 'semi-final', seed++)
    const sf2 = simulateMatch(getWinner(qf3), getWinner(qf4), 'semi-final', seed++)
    knockoutBracket.value.semiFinals = [sf1, sf2]

    const final = simulateMatch(getWinner(sf1), getWinner(sf2), 'final', seed)
    knockoutBracket.value.final = final
    tournamentPhase.value = 'complete'
  }

  function reset() {
    groups.value = []
    knockoutBracket.value = { quarterFinals: [], semiFinals: [], final: null }
    tournamentPhase.value = 'group'
    playerTeam.value = null
  }

  return {
    groups,
    knockoutBracket,
    tournamentPhase,
    playerTeam,
    playerMatches,
    isChampion,
    initTournament,
    reset
  }
})
