import type { TournamentTeam, MatchResult, MatchEvent, Player } from '~/types'

// ============================================================
// Match Engine — seeded RNG Poisson-based simulation
// ============================================================

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function poissonRandom(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[], rng: () => number, fallback?: T): T | undefined {
  if (!arr || arr.length === 0) return fallback
  return arr[Math.floor(rng() * arr.length)] ?? fallback
}

// ---- Section rating calculation ----

export function calculateSectionRatings(squad: Player[]) {
  const attackers = squad.filter(p =>
    ['ST', 'CF', 'LW', 'RW'].includes(p.primaryPosition)
  )
  const midfielders = squad.filter(p =>
    ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.primaryPosition)
  )
  const defenders = squad.filter(p =>
    ['CB', 'LB', 'RB'].includes(p.primaryPosition)
  )
  const goalkeepers = squad.filter(p => p.primaryPosition === 'GK')

  const avg = (players: Player[], fn: (p: Player) => number) => {
    if (players.length === 0) return 65
    return Math.round(players.reduce((sum, p) => sum + fn(p), 0) / players.length)
  }

  return {
    averageOVR: squad.length > 0 ? Math.round(squad.reduce((s, p) => s + p.stats.overall, 0) / squad.length) : 75,
    attackRating: avg(attackers, p =>
      p.stats.shooting * 0.35 + p.stats.pace * 0.25 + p.stats.dribbling * 0.25 + p.stats.passing * 0.15
    ),
    midfieldRating: avg(midfielders, p =>
      p.stats.passing * 0.35 + p.stats.dribbling * 0.25 + p.stats.shooting * 0.15
      + p.stats.defending * 0.15 + p.stats.physical * 0.10
    ),
    defenseRating: avg(defenders, p =>
      p.stats.defending * 0.40 + p.stats.physical * 0.25 + p.stats.pace * 0.20 + p.stats.passing * 0.15
    ),
    goalkeepingRating: goalkeepers.length > 0 ? goalkeepers[0]!.stats.overall : 65
  }
}

// ---- Goal/event templates ----

const GOAL_TEMPLATES = [
  (player: string, _assist: string | null, minute: number, teamA: string, scoreA: number, scoreB: number, teamB: string) =>
    `${minute}' ⚽ GOAL! ${player} fires it into the net! ${teamA} ${scoreA}–${scoreB} ${teamB}`,
  (player: string, assist: string | null) =>
    `${assist ? `${assist} with the through ball — ` : ''}${player} rounds the keeper and slots it home!`,
  (player: string) => `What a strike from ${player}! Top corner!`,
  (player: string, assist: string | null) =>
    `${player} heads it in! ${assist ? `Brilliant cross from ${assist}.` : ''}`,
  (player: string) => `${player} breaks through the defense... GOAL!`
]

const CHANCE_TEMPLATES = [
  (player: string) => `${player} goes close but the keeper makes a stunning save!`,
  (player: string) => `${player} hits the post! So close!`,
  (player: string) => `${player} fires over from a great position.`,
  (player: string) => `Chance! ${player} curls it just wide.`
]

const CARD_TEMPLATES = {
  yellow: (player: string) => `🟨 ${player} picks up a yellow card.`,
  red: (player: string) => `🟥 ${player} is sent off! Down to 10 men.`
}

// ---- Match simulation ----

export function useMatchEngine() {
  function simulateMatch(
    teamA: TournamentTeam,
    teamB: TournamentTeam,
    phase: MatchResult['phase'],
    seed: number
  ): MatchResult {
    const rng = mulberry32(seed)

    // Section comparison determines expected goals
    const attackDomA = (teamA.attackRating * 0.6 + teamA.midfieldRating * 0.4)
      - (teamB.defenseRating * 0.6 + teamB.goalkeepingRating * 0.4) * 0.8
    const attackDomB = (teamB.attackRating * 0.6 + teamB.midfieldRating * 0.4)
      - (teamA.defenseRating * 0.6 + teamA.goalkeepingRating * 0.4) * 0.8

    // Lambda: base 1.15 goals per game, adjusted by dominance
    const lambdaA = Math.max(0.25, 1.15 + attackDomA * 0.03)
    const lambdaB = Math.max(0.25, 1.15 + attackDomB * 0.03)

    let goalsA = poissonRandom(lambdaA, rng)
    let goalsB = poissonRandom(lambdaB, rng)

    let extraTime = false
    let penalties: { teamA: number, teamB: number } | undefined = undefined
    if (phase !== 'group' && goalsA === goalsB) {
      extraTime = true
      // Extra time goal check
      const extraGoalA = rng() > 0.6 ? 1 : 0
      const extraGoalB = rng() > 0.6 ? 1 : 0
      goalsA += extraGoalA
      goalsB += extraGoalB

      if (goalsA === goalsB) {
        // Penalty shootout
        const pensA = randomInt(3, 5, rng)
        const pensB = pensA === 5 ? (rng() > 0.5 ? 4 : 3) : (pensA + (rng() > 0.5 ? 1 : -1))
        penalties = {
          teamA: pensA,
          teamB: Math.max(0, pensB === pensA ? pensA + 1 : pensB)
        }
      }
    }

    const events = _generateEvents(teamA, teamB, goalsA, goalsB, rng)

    return {
      id: `${phase}-${teamA.id}-vs-${teamB.id}-${seed}`,
      phase,
      teamA: { team: teamA, goals: goalsA },
      teamB: { team: teamB, goals: goalsB },
      extraTime,
      penalties,
      events
    }
  }

  function _getFallbackPlayer(team: TournamentTeam, role: string): Player {
    return {
      id: `${team.id}-p-${role}`,
      name: `${team.countryName} Player`,
      nameNormalized: 'player',
      country: team.country,
      countryName: team.countryName,
      year: team.year,
      shirtNumber: 9,
      basePosition: 'Forward',
      positions: ['ST'],
      primaryPosition: 'ST',
      stats: { overall: 75, pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75 },
      enrichmentSource: 'fallback'
    }
  }

  function _generateEvents(
    teamA: TournamentTeam,
    teamB: TournamentTeam,
    goalsA: number,
    goalsB: number,
    rng: () => number
  ): MatchEvent[] {
    const events: MatchEvent[] = []
    let scoreA = 0
    let scoreB = 0

    // Kickoff
    events.push({ minute: 1, type: 'kickoff', team: null, description: '⚽ Kick-off!', scoreA: 0, scoreB: 0 })

    // Generate goal minutes (distributed across 90')
    const totalGoals = goalsA + goalsB
    const goalMinutes = Array.from({ length: totalGoals }, () => randomInt(3, 90, rng)).sort((a, b) => a - b)
    const goalAssignment = [
      ...Array(goalsA).fill('A'),
      ...Array(goalsB).fill('B')
    ].sort(() => rng() - 0.5)

    for (let i = 0; i < goalMinutes.length; i++) {
      const minute = goalMinutes[i]!
      const team = goalAssignment[i] as 'A' | 'B'
      const scoringTeam = team === 'A' ? teamA : teamB
      const scorers = scoringTeam.squad.filter(p =>
        ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'].includes(p.primaryPosition)
      )
      const defaultScorer = scoringTeam.squad[0] ?? _getFallbackPlayer(scoringTeam, 'scorer')
      const scorer = (scorers.length > 0 ? pickRandom(scorers, rng) : pickRandom(scoringTeam.squad, rng)) ?? defaultScorer

      const otherSquad = scoringTeam.squad.filter(p => p.id !== scorer.id)
      const maybeAssist = rng() > 0.4 && otherSquad.length > 0
        ? pickRandom(otherSquad, rng)
        : null

      if (team === 'A') scoreA++
      else scoreB++

      const template = pickRandom(GOAL_TEMPLATES, rng) ?? GOAL_TEMPLATES[0]!
      const description = template(
        scorer.name,
        maybeAssist?.name ?? null,
        minute,
        teamA.countryName,
        scoreA,
        scoreB,
        teamB.countryName
      )

      events.push({
        minute,
        type: 'goal',
        team,
        playerId: scorer.id,
        playerName: scorer.name,
        assistPlayerId: maybeAssist?.id,
        assistPlayerName: maybeAssist?.name,
        description,
        scoreA,
        scoreB
      })
    }

    // Halftime
    const halfScoreA = events.filter(e => e.type === 'goal' && e.minute <= 45).length > 0
      ? events.filter(e => e.type === 'goal').find(e => e.minute > 45)?.scoreA ?? scoreA
      : scoreA
    events.push({
      minute: 45,
      type: 'halftime',
      team: null,
      description: `Half-time: ${teamA.countryName} ${halfScoreA}–${scoreB} ${teamB.countryName}`,
      scoreA: halfScoreA,
      scoreB
    })

    // Random close chances
    const numChances = randomInt(2, 4, rng)
    for (let i = 0; i < numChances; i++) {
      const team = rng() > 0.5 ? 'A' : 'B'
      const t = team === 'A' ? teamA : teamB
      const player = (t.squad.length > 0 ? pickRandom(t.squad, rng) : null) ?? _getFallbackPlayer(t, 'chance')
      const minute = randomInt(5, 89, rng)
      const chanceTpl = pickRandom(CHANCE_TEMPLATES, rng) ?? CHANCE_TEMPLATES[0]!
      events.push({
        minute,
        type: 'chance',
        team,
        playerId: player.id,
        playerName: player.name,
        description: chanceTpl(player.name),
        scoreA,
        scoreB
      })
    }

    // Random cards
    const numCards = randomInt(1, 3, rng)
    for (let i = 0; i < numCards; i++) {
      const team = rng() > 0.5 ? 'A' : 'B'
      const t = team === 'A' ? teamA : teamB
      const player = (t.squad.length > 0 ? pickRandom(t.squad, rng) : null) ?? _getFallbackPlayer(t, 'card')
      const minute = randomInt(10, 88, rng)
      const isRed = rng() < 0.1
      events.push({
        minute,
        type: isRed ? 'red-card' : 'yellow-card',
        team,
        playerId: player.id,
        playerName: player.name,
        description: isRed ? CARD_TEMPLATES.red(player.name) : CARD_TEMPLATES.yellow(player.name),
        scoreA,
        scoreB
      })
    }

    // Full time
    events.push({
      minute: 90,
      type: 'fulltime',
      team: null,
      description: `Full-time: ${teamA.countryName} ${scoreA}–${scoreB} ${teamB.countryName}`,
      scoreA,
      scoreB
    })

    return events.sort((a, b) => a.minute - b.minute)
  }

  return { simulateMatch, calculateSectionRatings }
}
