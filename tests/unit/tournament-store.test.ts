import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Player, PositionCode, TournamentTeam, MatchResult } from '../../app/types'

function makePlayer(id: string, position: PositionCode, overrides: Partial<Player> = {}): Player {
  const overall = 75
  return {
    id,
    name: `Player ${id}`,
    nameNormalized: `player ${id}`,
    country: 'xx',
    countryName: 'Xxland',
    year: 2000,
    shirtNumber: 1,
    basePosition: 'Midfielder',
    positions: [position],
    primaryPosition: position,
    stats: { overall, pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall },
    enrichmentSource: 'fallback',
    ...overrides
  }
}

// 15 single-player CPU squads. Squad content beyond "has a first player" is
// irrelevant here since simulateMatch is mocked below and the real match
// engine (which reads formation ratings etc.) is never invoked.
const CPU_TEAMS: Record<string, Player[]> = {}
for (let i = 0; i < 15; i++) {
  CPU_TEAMS[`cc${i}-2000`] = [makePlayer(`cpu-${i}`, 'ST', { country: `cc${i}`, countryName: `CC${i}`, year: 2000 })]
}

vi.mock('~/composables/useDatabase', () => ({
  useDatabase: () => ({
    getRandomTeams: (count: number) => Object.keys(CPU_TEAMS).slice(0, count).map((k) => {
      const idx = k.lastIndexOf('-')
      return { country: k.slice(0, idx), year: parseInt(k.slice(idx + 1), 10) }
    }),
    getSquad: (country: string, year: number) => CPU_TEAMS[`${country}-${year}`] ?? []
  })
}))

// simulateMatch is mocked so bracket-advancement and stats aggregation can be
// asserted deterministically: whichever team is passed as the *first*
// argument to a given call always wins 2-0, with both goals scored by its
// first squad player. This mirrors the issue's suggested approach (assert on
// orchestration invariants, not exact score outcomes) while still exercising
// the store's real winner-selection (`getWinner`) and stats-aggregation logic.
function mockSimulateMatch(teamA: TournamentTeam, teamB: TournamentTeam, phase: MatchResult['phase'], seed: number): MatchResult {
  const scorer = teamA.squad[0]
  return {
    id: `${phase}-${teamA.id}-vs-${teamB.id}-${seed}`,
    phase,
    teamA: { team: teamA, goals: 2 },
    teamB: { team: teamB, goals: 0 },
    extraTime: false,
    events: scorer
      ? [
          { minute: 10, type: 'goal', team: 'A', playerId: scorer.id, playerName: scorer.name, description: 'Goal', scoreA: 1, scoreB: 0 },
          { minute: 60, type: 'goal', team: 'A', playerId: scorer.id, playerName: scorer.name, description: 'Goal', scoreA: 2, scoreB: 0 }
        ]
      : []
  }
}

vi.mock('~/composables/useMatchEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/composables/useMatchEngine')>()
  return {
    ...actual,
    useMatchEngine: () => ({ simulateMatch: mockSimulateMatch })
  }
})

const { useTournamentStore } = await import('../../app/stores/tournament')
const { useDraftStore } = await import('../../app/stores/draft')
const { ALL_FORMATIONS } = await import('../../app/composables/useFormations')

const FORMATION_433 = ALL_FORMATIONS.find(f => f.id === '4-3-3')!

function completeDraft() {
  const draft = useDraftStore()
  draft.selectFormation(FORMATION_433)
  for (const slot of draft.slots) {
    draft.draftPlayer(slot.id, makePlayer(`draft-${slot.id}`, slot.position, { country: 'pp', countryName: 'Playerland', year: 2024 }))
  }
  return draft
}

describe('useTournamentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initTournament', () => {
    it('throws if the draft is not complete', () => {
      const tournament = useTournamentStore()
      expect(() => tournament.initTournament()).toThrow('Draft must be complete')
    })

    it('builds the player team from the completed draft', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()

      expect(tournament.playerTeam).not.toBeNull()
      expect(tournament.playerTeam!.id).toBe('player-team')
      expect(tournament.playerTeam!.isPlayerTeam).toBe(true)
      expect(tournament.playerTeam!.squad).toHaveLength(11)
    })

    it('creates 4 groups of 4 teams each, including the player team exactly once', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()

      expect(tournament.groups).toHaveLength(4)
      for (const g of tournament.groups) expect(g.teams).toHaveLength(4)

      const allTeamIds = tournament.groups.flatMap(g => g.teams.map(t => t.id))
      expect(allTeamIds).toHaveLength(16)
      expect(new Set(allTeamIds).size).toBe(16)
      expect(allTeamIds.filter(id => id === 'player-team')).toHaveLength(1)
    })

    it('resets simulation progress to the group stage', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()

      expect(tournament.simulationStep).toBe(0)
      expect(tournament.tournamentPhase).toBe('group')
      expect(tournament.knockoutBracket).toEqual({ quarterFinals: [], semiFinals: [], final: null })
    })
  })

  describe('advanceSimulationStep', () => {
    it('reveals group matches 2 at a time, keeping standings in sync with revealed matches only', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()

      tournament.advanceSimulationStep()
      expect(tournament.simulationStep).toBe(1)
      for (const g of tournament.groups) {
        expect(g.matches).toHaveLength(2)
        expect(g.standings.reduce((sum, s) => sum + s.played, 0)).toBe(4)
      }

      tournament.advanceSimulationStep()
      expect(tournament.simulationStep).toBe(2)
      for (const g of tournament.groups) expect(g.matches).toHaveLength(4)
    })

    it('is a no-op once the tournament is complete', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()
      tournament.skipAllSimulation()
      expect(tournament.simulationStep).toBe(6)

      const bracketBefore = tournament.knockoutBracket
      tournament.advanceSimulationStep()
      expect(tournament.simulationStep).toBe(6)
      expect(tournament.knockoutBracket).toBe(bracketBefore)
    })

    it('seeds the QF bracket from group standings[0]/[1] with the documented pairing scheme', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()
      tournament.advanceSimulationStep()
      tournament.advanceSimulationStep()
      tournament.advanceSimulationStep()

      for (const g of tournament.groups) expect(g.matches).toHaveLength(6)

      const [groupA, groupB, groupC, groupD] = tournament.groups
      const qfs = tournament.knockoutBracket.quarterFinals
      expect(qfs).toHaveLength(4)
      expect(qfs[0]!.teamA.team.id).toBe(groupA!.standings[0]!.team.id)
      expect(qfs[0]!.teamB.team.id).toBe(groupB!.standings[1]!.team.id)
      expect(qfs[1]!.teamA.team.id).toBe(groupC!.standings[0]!.team.id)
      expect(qfs[1]!.teamB.team.id).toBe(groupD!.standings[1]!.team.id)
      expect(qfs[2]!.teamA.team.id).toBe(groupB!.standings[0]!.team.id)
      expect(qfs[2]!.teamB.team.id).toBe(groupA!.standings[1]!.team.id)
      expect(qfs[3]!.teamA.team.id).toBe(groupD!.standings[0]!.team.id)
      expect(qfs[3]!.teamB.team.id).toBe(groupC!.standings[1]!.team.id)
    })

    it('auto-simulates the rest of the tournament the moment the player is eliminated in the group stage', () => {
      // Whether the player qualifies depends on the random group shuffle in
      // initTournament(), so retry with fresh state until a non-qualifying
      // draw turns up (mirrors the seed-search pattern in matchengine.test.ts).
      let tournament: ReturnType<typeof useTournamentStore> | null = null
      let eliminated = false

      for (let attempt = 0; attempt < 30 && !eliminated; attempt++) {
        setActivePinia(createPinia())
        completeDraft()
        tournament = useTournamentStore()
        tournament.initTournament()
        tournament.advanceSimulationStep()
        tournament.advanceSimulationStep()
        tournament.advanceSimulationStep()

        const pid = tournament.playerTeam!.id
        const qfs = tournament.knockoutBracket.quarterFinals
        eliminated = !qfs.some(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
      }

      expect(eliminated).toBe(true)
      expect(tournament!.simulationStep).toBe(6)
      expect(tournament!.tournamentPhase).toBe('complete')
      expect(tournament!.knockoutBracket.semiFinals).toHaveLength(2)
      expect(tournament!.knockoutBracket.final).not.toBeNull()
    })

    it('keeps stepping through the knockout rounds live when the player does qualify for the QF', () => {
      let tournament: ReturnType<typeof useTournamentStore> | null = null
      let qualified = false

      for (let attempt = 0; attempt < 30 && !qualified; attempt++) {
        setActivePinia(createPinia())
        completeDraft()
        tournament = useTournamentStore()
        tournament.initTournament()
        tournament.advanceSimulationStep()
        tournament.advanceSimulationStep()
        tournament.advanceSimulationStep()

        const pid = tournament.playerTeam!.id
        qualified = tournament.knockoutBracket.quarterFinals.some(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
      }

      expect(qualified).toBe(true)
      expect(tournament!.simulationStep).toBe(3)
      expect(tournament!.tournamentPhase).toBe('group')
      expect(tournament!.knockoutBracket.semiFinals).toHaveLength(0)
    })
  })

  describe('skipAllSimulation', () => {
    it('completes every round of the tournament in one call', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()
      tournament.skipAllSimulation()

      expect(tournament.simulationStep).toBe(6)
      expect(tournament.tournamentPhase).toBe('complete')
      for (const g of tournament.groups) {
        expect(g.matches).toHaveLength(6)
        expect(g.standings.reduce((sum, s) => sum + s.played, 0)).toBe(12)
      }
      expect(tournament.knockoutBracket.quarterFinals).toHaveLength(4)
      expect(tournament.knockoutBracket.semiFinals).toHaveLength(2)
      expect(tournament.knockoutBracket.final).not.toBeNull()
    })
  })

  describe('computed getters, with the player forced to top its group', () => {
    // Math.random() is stubbed to a constant so `allTeams.sort(() => Math.random() - 0.5)`
    // becomes a no-op: the comparator always returns exactly 0, and
    // Array.prototype.sort is spec-guaranteed stable, so the pre-shuffle
    // order (player team first) survives untouched. That deterministically
    // puts the player at group-internal position 0, which — under the
    // "first call argument always wins" mock above — means it is the "teamA"
    // argument at every single stage (group, QF, SF, final) and wins the
    // whole tournament outright.
    function initAsGuaranteedChampion() {
      completeDraft()
      const tournament = useTournamentStore()
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      try {
        tournament.initTournament()
      } finally {
        randomSpy.mockRestore()
      }
      tournament.skipAllSimulation()
      return tournament
    }

    it('isChampion is true and playerMatches contains all 6 matches played', () => {
      const tournament = initAsGuaranteedChampion()

      expect(tournament.isChampion).toBe(true)
      expect(tournament.playerMatches).toHaveLength(6)
      expect(tournament.playerGroup?.teams.some(t => t.id === 'player-team')).toBe(true)
    })

    it('runStats aggregates goals from every match the player team won as the mocked scorer', () => {
      const tournament = initAsGuaranteedChampion()
      const stats = tournament.runStats!

      expect(stats.totalMatches).toBe(6)
      expect(stats.totalGoalsFor).toBe(12) // 2 goals * 6 matches
      expect(stats.totalGoalsAgainst).toBe(0)
      expect(stats.cleanSheets).toBe(6)

      // The mock always credits both goals to teamA.squad[0], which for the
      // player team is whichever player was drafted into the first slot.
      const scorerId = tournament.playerTeam!.squad[0]!.id
      expect(stats.topScorer?.player.id).toBe(scorerId)
      expect(stats.topScorer?.goals).toBe(12)
      expect(stats.mvp?.player.id).toBe(scorerId)
    })

    it('currentLiveMatch reflects the live match for the current step, and null once complete', () => {
      completeDraft()
      const tournament = useTournamentStore()
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      try {
        tournament.initTournament()
      } finally {
        randomSpy.mockRestore()
      }

      tournament.advanceSimulationStep()
      expect(tournament.currentLiveMatch).not.toBeNull()
      expect(
        tournament.currentLiveMatch!.teamA.team.id === 'player-team'
        || tournament.currentLiveMatch!.teamB.team.id === 'player-team'
      ).toBe(true)

      tournament.skipAllSimulation()
      expect(tournament.currentLiveMatch).toBeNull()
    })
  })

  describe('reset', () => {
    it('clears all tournament state back to defaults', () => {
      completeDraft()
      const tournament = useTournamentStore()
      tournament.initTournament()
      tournament.skipAllSimulation()

      tournament.reset()

      expect(tournament.groups).toEqual([])
      expect(tournament.knockoutBracket).toEqual({ quarterFinals: [], semiFinals: [], final: null })
      expect(tournament.tournamentPhase).toBe('group')
      expect(tournament.playerTeam).toBeNull()
      expect(tournament.simulationStep).toBe(0)
      expect(tournament.isSimulating).toBe(false)
    })
  })
})
