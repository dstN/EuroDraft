import { describe, expect, it } from 'vitest'
import { buildGroupStandings } from '../../app/stores/tournament'
import type { MatchResult, TournamentTeam } from '../../app/types'

function makeTeam(id: string): TournamentTeam {
  return {
    id,
    country: id,
    year: 2024,
    countryName: id.toUpperCase(),
    squad: [],
    isPlayerTeam: false,
    averageOVR: 80,
    attackRating: 80,
    midfieldRating: 80,
    defenseRating: 80,
    goalkeepingRating: 80
  }
}

function makeMatch(teamA: TournamentTeam, goalsA: number, teamB: TournamentTeam, goalsB: number): MatchResult {
  return {
    id: `${teamA.id}-vs-${teamB.id}`,
    teamA: { team: teamA, goals: goalsA },
    teamB: { team: teamB, goals: goalsB },
    events: [],
    extraTime: false,
    phase: 'group'
  }
}

describe('buildGroupStandings', () => {
  it('returns every team at 0 played/points when there are no matches yet', () => {
    const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c'), makeTeam('d')]

    const standings = buildGroupStandings(teams, [])

    expect(standings).toHaveLength(4)
    expect(standings.every(s => s.played === 0 && s.points === 0)).toBe(true)
  })

  it('awards 3 points for a win, 0 for a loss, and tallies goals for/against', () => {
    const a = makeTeam('a')
    const b = makeTeam('b')
    const standings = buildGroupStandings([a, b], [makeMatch(a, 3, b, 1)])

    const sa = standings.find(s => s.team.id === 'a')!
    const sb = standings.find(s => s.team.id === 'b')!

    expect(sa).toMatchObject({ played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 1, points: 3 })
    expect(sb).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 3, points: 0 })
  })

  it('awards 1 point each for a draw', () => {
    const a = makeTeam('a')
    const b = makeTeam('b')
    const standings = buildGroupStandings([a, b], [makeMatch(a, 2, b, 2)])

    expect(standings.every(s => s.points === 1 && s.drawn === 1)).toBe(true)
  })

  it('accumulates across multiple matches for the same team', () => {
    const a = makeTeam('a')
    const b = makeTeam('b')
    const c = makeTeam('c')
    const standings = buildGroupStandings([a, b, c], [
      makeMatch(a, 2, b, 0), // a: W
      makeMatch(a, 1, c, 1), // a: D
      makeMatch(b, 0, c, 3) // c: W
    ])

    const sa = standings.find(s => s.team.id === 'a')!
    expect(sa).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 4, goalsFor: 3, goalsAgainst: 1 })
  })

  it('sorts by points first, then by goal difference among equal-points teams', () => {
    const x = makeTeam('x') // 3 pts, GD +3
    const y = makeTeam('y') // 3 pts, GD +1
    const z = makeTeam('z') // 0 pts
    const standings = buildGroupStandings([x, y, z], [
      makeMatch(x, 4, z, 1),
      makeMatch(y, 2, z, 1)
    ])

    expect(standings.map(s => s.team.id)).toEqual(['x', 'y', 'z'])
  })

  it('ties broken by goal difference before goals scored, both same GD falls back to goals scored', () => {
    const p = makeTeam('p') // 3-1 win: GD +2, GF 3
    const q = makeTeam('q') // 5-3 win: GD +2, GF 5
    const r = makeTeam('r')
    const s = makeTeam('s')
    const standings = buildGroupStandings([p, q, r, s], [
      makeMatch(p, 3, r, 1),
      makeMatch(q, 5, s, 3)
    ])

    expect(standings[0]!.team.id).toBe('q')
    expect(standings[1]!.team.id).toBe('p')
  })

  it('ignores a match referencing a team not in the provided team list', () => {
    const a = makeTeam('a')
    const ghost = makeTeam('ghost')
    const standings = buildGroupStandings([a], [makeMatch(a, 2, ghost, 0)])

    expect(standings).toHaveLength(1)
    expect(standings[0]).toMatchObject({ played: 0, points: 0 })
  })
})
