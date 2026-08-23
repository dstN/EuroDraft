import { describe, it, expect } from 'vitest'
import { useMatchEngine } from '../../app/composables/useMatchEngine'
import type { Player, TournamentTeam } from '../../app/types'

function makePlayer(id: string, position: Player['primaryPosition'], overall = 75): Player {
  return {
    id,
    name: `Player ${id}`,
    nameNormalized: `player ${id}`,
    country: 'eu',
    countryName: 'Europe',
    year: 2000,
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

function makeTeam(id: string, countryName: string): TournamentTeam {
  const squad: Player[] = [
    makePlayer(`${id}-gk`, 'GK'),
    makePlayer(`${id}-cb1`, 'CB'),
    makePlayer(`${id}-cb2`, 'CB'),
    makePlayer(`${id}-lb`, 'LB'),
    makePlayer(`${id}-rb`, 'RB'),
    makePlayer(`${id}-cdm`, 'CDM'),
    makePlayer(`${id}-cm1`, 'CM'),
    makePlayer(`${id}-cm2`, 'CM'),
    makePlayer(`${id}-cam`, 'CAM'),
    makePlayer(`${id}-lw`, 'LW'),
    makePlayer(`${id}-rw`, 'RW'),
    makePlayer(`${id}-st`, 'ST')
  ]

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
