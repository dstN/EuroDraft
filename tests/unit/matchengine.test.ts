import { describe, it, expect } from 'vitest'
import { useMatchEngine, calculateFormationShape, calculateChemistryBonus } from '../../app/composables/useMatchEngine'
import type { Player, TournamentTeam } from '../../app/types'

function makePlayer(id: string, position: Player['primaryPosition'], overall = 75, opts: { country?: string, year?: number } = {}): Player {
  return {
    id,
    name: `Player ${id}`,
    nameNormalized: `player ${id}`,
    country: opts.country ?? 'eu',
    countryName: 'Europe',
    year: opts.year ?? 2000,
    shirtNumber: 1,
    basePosition: 'Midfielder',
    positions: [position],
    primaryPosition: position,
    stats: {
      overall,
      pace: overall,
      shooting: overall,
      passing: overall,
      dribbling: overall,
      defending: overall,
      physical: overall
    },
    enrichmentSource: 'fallback'
  }
}

function makeTeam(id: string, countryName: string, positions: Player['primaryPosition'][] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST']): TournamentTeam {
  const squad: Player[] = positions.map((pos, i) => makePlayer(`${id}-${pos}-${i}`, pos))

  return {
    id,
    country: id,
    year: 2000,
    countryName,
    squad,
    isPlayerTeam: false,
    averageOVR: 75,
    attackRating: 75,
    midfieldRating: 75,
    defenseRating: 75,
    goalkeepingRating: 75
  }
}

describe('useMatchEngine', () => {
  const { simulateMatch } = useMatchEngine()
  const teamA = makeTeam('a', 'Team A')
  const teamB = makeTeam('b', 'Team B')

  it('group stage matches never go to extra time or penalties, even when level', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const match = simulateMatch(teamA, teamB, 'group', seed)
      expect(match.extraTime).toBe(false)
      expect(match.penalties).toBeUndefined()
    }
  })

  it('knockout matches can go to extra time and be decided there', () => {
    let found: ReturnType<typeof simulateMatch> | null = null
    for (let seed = 1; seed <= 2000 && !found; seed++) {
      const match = simulateMatch(teamA, teamB, 'quarter-final', seed)
      if (match.extraTime && !match.penalties) found = match
    }

    expect(found).not.toBeNull()
    const match = found!

    // Regulation full-time event exists at minute 90 and notes the tie
    const regFulltime = match.events.find(e => e.type === 'fulltime' && e.minute === 90)
    expect(regFulltime).toBeDefined()
    expect(regFulltime!.scoreA).toBe(regFulltime!.scoreB)

    // Extra time is announced
    expect(match.events.some(e => e.type === 'extra-time')).toBe(true)

    // AET full-time event exists at minute 120 and matches the final result
    const aetFulltime = match.events.find(e => e.type === 'fulltime' && e.minute === 120)
    expect(aetFulltime).toBeDefined()
    expect(aetFulltime!.scoreA).toBe(match.teamA.goals)
    expect(aetFulltime!.scoreB).toBe(match.teamB.goals)
    expect(aetFulltime!.scoreA).not.toBe(aetFulltime!.scoreB)

    // No penalty shootout when the tie was broken in extra time
    expect(match.events.some(e => e.type === 'penalty-shootout')).toBe(false)

    // All goal events fall within valid windows (regulation 3-90, extra time 92-120)
    for (const ev of match.events) {
      if (ev.type === 'goal') {
        expect(ev.minute >= 3 && (ev.minute <= 90 || (ev.minute >= 92 && ev.minute <= 120))).toBe(true)
      }
    }

    // Events are chronologically ordered
    for (let i = 1; i < match.events.length; i++) {
      expect(match.events[i]!.minute).toBeGreaterThanOrEqual(match.events[i - 1]!.minute)
    }
  })

  it('knockout matches still level after extra time go to a penalty shootout', () => {
    let found: ReturnType<typeof simulateMatch> | null = null
    for (let seed = 1; seed <= 5000 && !found; seed++) {
      const match = simulateMatch(teamA, teamB, 'semi-final', seed)
      if (match.penalties) found = match
    }

    expect(found).not.toBeNull()
    const match = found!

    expect(match.extraTime).toBe(true)
    expect(match.teamA.goals).toBe(match.teamB.goals)

    const aetFulltime = match.events.find(e => e.type === 'fulltime' && e.minute === 120)
    expect(aetFulltime).toBeDefined()
    expect(aetFulltime!.scoreA).toBe(aetFulltime!.scoreB)

    const shootout = match.events.find(e => e.type === 'penalty-shootout')
    expect(shootout).toBeDefined()
    expect(shootout!.minute).toBeGreaterThan(120)

    // The narrated winner matches the team with more penalty goals
    const teamAWon = match.penalties!.teamA > match.penalties!.teamB
    expect(shootout!.team).toBe(teamAWon ? 'A' : 'B')
    expect(match.penalties!.teamA).not.toBe(match.penalties!.teamB)
  })

  it('regulation-time goals never appear after minute 90 for matches with no extra time', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const match = simulateMatch(teamA, teamB, 'group', seed)
      for (const ev of match.events) {
        if (ev.type === 'goal') {
          expect(ev.minute).toBeLessThanOrEqual(90)
        }
      }
    }
  })
})

describe('calculateFormationShape', () => {
  const withBackLine = (n: number) => [
    ...Array(n).fill('CB'),
    ...Array(11 - n).fill('ST')
  ].map((pos, i) => makePlayer(`p${i}`, pos as Player['primaryPosition']))

  it('back-5 (or more) gets a defensive bonus and an attacking penalty', () => {
    const shape = calculateFormationShape(withBackLine(5))
    expect(shape.backLineSize).toBe(5)
    expect(shape.defenseMult).toBeGreaterThan(1)
    expect(shape.attackMult).toBeLessThan(1)
  })

  it('back-3 (or fewer) gets an attacking bonus and a defensive penalty', () => {
    const shape = calculateFormationShape(withBackLine(3))
    expect(shape.backLineSize).toBe(3)
    expect(shape.attackMult).toBeGreaterThan(1)
    expect(shape.defenseMult).toBeLessThan(1)
  })

  it('back-4 is the balanced baseline (no modifier)', () => {
    const shape = calculateFormationShape(withBackLine(4))
    expect(shape.backLineSize).toBe(4)
    expect(shape.attackMult).toBe(1)
    expect(shape.defenseMult).toBe(1)
  })

  it('prefers draftedPosition over primaryPosition when both are set', () => {
    const squad = withBackLine(4).map(p => ({ ...p, primaryPosition: 'ST' as const, draftedPosition: p.primaryPosition }))
    // primaryPosition now says everyone is a striker, but draftedPosition still reflects the real back-4
    expect(calculateFormationShape(squad).backLineSize).toBe(4)
  })
})

describe('calculateChemistryBonus', () => {
  it('is 0 when no two players share a country or a year', () => {
    const squad = Array.from({ length: 11 }, (_, i) => makePlayer(`p${i}`, 'CM', 75, { country: `c${i}`, year: 1990 + i }))
    expect(calculateChemistryBonus(squad)).toBe(0)
  })

  it('is capped at 11% even if every player is linked', () => {
    const squad = Array.from({ length: 11 }, (_, i) => makePlayer(`p${i}`, 'CM', 75, { country: 'nl', year: 2008 }))
    expect(calculateChemistryBonus(squad)).toBe(0.11)
  })

  it('counts only players who actually share a link with a teammate', () => {
    // 3 players share NL/2008, the other 8 are all unique -- only the 3 linked ones count
    const squad = [
      ...Array.from({ length: 3 }, (_, i) => makePlayer(`nl${i}`, 'CM', 75, { country: 'nl', year: 2008 })),
      ...Array.from({ length: 8 }, (_, i) => makePlayer(`u${i}`, 'CM', 75, { country: `c${i}`, year: 1980 + i }))
    ]
    expect(calculateChemistryBonus(squad)).toBeCloseTo(0.03)
  })
})

describe('formation shape and chemistry influence match outcomes', () => {
  const { simulateMatch } = useMatchEngine()

  it('against the same neutral opponent, a back-3 team scores more and a back-5 team concedes less than a back-4 baseline', () => {
    // Isolate the shape effect on one side by holding the opponent (back-4,
    // neutral) fixed -- pitting two differently-shaped teams directly against
    // each other instead would partly cancel the effect out, since each
    // side's attack boost/penalty is then also tested against a defense
    // that's boosted/penalized in the same direction.
    const backline = (n: number): Player['primaryPosition'][] => ['GK', ...Array(n).fill('CB'), ...Array(10 - n).fill('ST')] as Player['primaryPosition'][]
    const neutralOpponent = makeTeam('opp', 'Opponent', backline(4))
    const back3Team = makeTeam('b3', 'Back-3', backline(3))
    const back4Team = makeTeam('b4', 'Back-4', backline(4))
    const back5Team = makeTeam('b5', 'Back-5', backline(5))

    function totalsAgainstOpponent(team: TournamentTeam, runs = 400) {
      let scored = 0
      let conceded = 0
      for (let seed = 1; seed <= runs; seed++) {
        const match = simulateMatch(team, neutralOpponent, 'group', seed)
        scored += match.teamA.goals
        conceded += match.teamB.goals
      }
      return { scored, conceded }
    }

    const back3 = totalsAgainstOpponent(back3Team)
    const back4 = totalsAgainstOpponent(back4Team)
    const back5 = totalsAgainstOpponent(back5Team)

    expect(back3.scored).toBeGreaterThan(back4.scored)
    expect(back4.scored).toBeGreaterThan(back5.scored)
    expect(back5.conceded).toBeLessThan(back4.conceded)
    expect(back4.conceded).toBeLessThan(back3.conceded)
  })

  it('a squad with full chemistry outscores an otherwise-identical squad with none, on average', () => {
    const positions: Player['primaryPosition'][] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST']
    const linkedSquad = positions.map((pos, i) => makePlayer(`linked-${i}`, pos, 75, { country: 'nl', year: 2008 }))
    const unlinkedSquad = positions.map((pos, i) => makePlayer(`unlinked-${i}`, pos, 75, { country: `c${i}`, year: 1980 + i }))

    const teamLinked: TournamentTeam = { ...makeTeam('linked', 'Linked'), squad: linkedSquad }
    const teamUnlinked: TournamentTeam = { ...makeTeam('unlinked', 'Unlinked'), squad: unlinkedSquad }

    let linkedGoalsTotal = 0
    let unlinkedGoalsTotal = 0
    const runs = 400
    for (let seed = 1; seed <= runs; seed++) {
      const match = simulateMatch(teamLinked, teamUnlinked, 'group', seed)
      linkedGoalsTotal += match.teamA.goals
      unlinkedGoalsTotal += match.teamB.goals
    }

    expect(linkedGoalsTotal).toBeGreaterThan(unlinkedGoalsTotal)
  })
})
