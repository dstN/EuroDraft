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

// ---- Formation shape & squad chemistry ----
//
// Two small, deliberately capped modifiers on top of the section-rating
// dominance model below, added because a squad's raw ratings alone made the
// simulation feel too close to a coin flip regardless of how the team was
// built -- neither the back-line shape you draft into nor the fact that
// several picks happened to share a nation/year (unusual, since each
// roulette spin normally lands on an unrelated squad) had any effect.
//
// Uses `draftedPosition` when present (the exact slot a player was drafted
// into) and falls back to `primaryPosition` otherwise -- this makes the same
// logic work unmodified for both the player's drafted team (shape reflects
// the formation they picked) and AI historical squads (shape reflects
// whatever back-line size that real squad actually had).
const BACK_LINE_POSITIONS: Player['primaryPosition'][] = ['CB', 'LB', 'RB']

export function calculateFormationShape(squad: Player[]): { attackMult: number, defenseMult: number, backLineSize: number } {
  const backLineSize = squad.filter(p => BACK_LINE_POSITIONS.includes(p.draftedPosition ?? p.primaryPosition)).length
  // Back-5: sturdier defensively, blunter going forward.
  if (backLineSize >= 5) return { attackMult: 0.95, defenseMult: 1.08, backLineSize }
  // Back-3 (or fewer): more attacking width and numbers up top, thinner cover at the back.
  if (backLineSize <= 3) return { attackMult: 1.08, defenseMult: 0.93, backLineSize }
  // Back-4: the balanced baseline, no modifier.
  return { attackMult: 1, defenseMult: 1, backLineSize }
}

// 1% expected-goals boost per squad member who shares a nation or a
// tournament year with at least one teammate, capped at 11% (one per
// starting XI slot) -- a squad that happens to click on paper plays a
// little better together than 11 unconnected picks.
export function calculateChemistryBonus(squad: Player[]): number {
  const linkedCount = squad.filter(p =>
    squad.some(other => other.id !== p.id && (other.country === p.country || other.year === p.year))
  ).length
  return Math.min(11, linkedCount) * 0.01
}

// A simpler, cruder lever alongside the per-line dominance model below: a
// team with a meaningfully higher average overall rating should just feel
// stronger, on its own, independent of exactly how that rating breaks down
// per line. 3% more expected goals per point of OVR gap (within the
// suggested 2-5% range), capped so a large gap can't swamp every other
// factor on its own.
const OVR_BONUS_PER_POINT = 0.03
const OVR_BONUS_CAP = 0.3

export function calculateOverallRatingBonus(ownOvr: number, opponentOvr: number): number {
  const bonus = (ownOvr - opponentOvr) * OVR_BONUS_PER_POINT
  return Math.max(-OVR_BONUS_CAP, Math.min(OVR_BONUS_CAP, bonus))
}

// A rated-90+ ("legend") player lifts their own row (attack/midfield/
// defense) by 2%, and each of the *other* two rows by 1% -- deliberately
// small and capped (a squad with many legends gets no bigger a boost than
// a handful) so this stays a flourish on top of the already-large effect a
// legend-stacked squad has via its own attack/defense ratings and
// averageOVR (and, by extension, calculateOverallRatingBonus above), not
// another dominant lever. Not gated to isPlayerTeam -- a genuine legend in
// a historical AI squad (e.g. peak Van Basten in a Dutch 1988 lineup) is a
// real, variable fact about that squad, unlike chemistry (see above),
// which every AI squad has 100% of by construction.
//
// Goalkeepers are excluded -- this models attack/midfield/defense working
// better together with elite talent in the mix, not the goalkeeper's own
// output, which is already just their personal rating (goalkeepingRating).
const LEGEND_RATING_THRESHOLD = 90
const LEGEND_OWN_ROW_BONUS = 0.02
const LEGEND_OTHER_ROW_BONUS = 0.01
const LEGEND_ROW_BONUS_CAP = 0.15

type OutfieldRow = 'attack' | 'midfield' | 'defense'

function playerRow(p: Player): OutfieldRow | null {
  const pos = p.draftedPosition ?? p.primaryPosition
  if (['ST', 'CF', 'LW', 'RW'].includes(pos)) return 'attack'
  if (['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(pos)) return 'midfield'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'defense'
  return null
}

export function calculateRowLegendBonuses(squad: Player[]): Record<OutfieldRow, number> {
  const totals: Record<OutfieldRow, number> = { attack: 0, midfield: 0, defense: 0 }
  for (const p of squad) {
    if (p.stats.overall < LEGEND_RATING_THRESHOLD) continue
    const row = playerRow(p)
    if (!row) continue
    for (const r of ['attack', 'midfield', 'defense'] as const) {
      totals[r] += r === row ? LEGEND_OWN_ROW_BONUS : LEGEND_OTHER_ROW_BONUS
    }
  }
  return {
    attack: Math.min(totals.attack, LEGEND_ROW_BONUS_CAP),
    midfield: Math.min(totals.midfield, LEGEND_ROW_BONUS_CAP),
    defense: Math.min(totals.defense, LEGEND_ROW_BONUS_CAP)
  }
}

// The doubling/exponential part of the legend bonus is scoped to that
// specific player's own chance of being the one who scores, not the team's
// expected-goals total -- see pickWeighted() and its use in
// _generateGoalEvents() below. Ranked by rating among the squad's own
// legends: the squad's best legend gets +1%, the second +2%, third +4%,
// fourth +8%, and so on -- an escalating personal spotlight for stacking
// multiple legends, deliberately kept in the same small percentage scale
// as the row bonuses above even though, unlike those, it only shifts *who*
// gets credit for a goal the team was already going to score, not how many.
function legendScorerWeight(player: Player, squad: Player[]): number {
  if (player.stats.overall < LEGEND_RATING_THRESHOLD) return 1
  const legends = [...squad]
    .filter(p => p.stats.overall >= LEGEND_RATING_THRESHOLD)
    .sort((a, b) => b.stats.overall - a.stats.overall)
  const rank = legends.findIndex(p => p.id === player.id)
  if (rank === -1) return 1
  return 1 + 2 ** rank * 0.01
}

function pickWeighted<T>(items: T[], weightFn: (item: T) => number, rng: () => number): T | undefined {
  if (!items || items.length === 0) return undefined
  const weights = items.map(weightFn)
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return items[Math.floor(rng() * items.length)]
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// ---- Match simulation ----

export function useMatchEngine() {
  const { t } = useI18n()
  const countryName = useCountryName()

  // Randomly picked for commentary variety, purely for flavor -- see
  // _generateGoalEvents()/_generateEvents() below for the selection logic.
  // Split into with/no-assist variants rather than conditional interpolation
  // inside a single message, since assist-clause word order/grammar isn't
  // safely expressible as a single template across all 10 locales.
  function goalDescription(player: string, assist: string | null, minute: number, teamAName: string, scoreA: number, scoreB: number, teamBName: string, rng: () => number): string {
    const variants: (() => string)[] = [
      () => t('matchEvents.goal_variant_1', { minute, player, teamA: teamAName, scoreA, scoreB, teamB: teamBName }),
      () => assist
        ? t('matchEvents.goal_variant_2_with_assist', { assist, player })
        : t('matchEvents.goal_variant_2_no_assist', { player }),
      () => t('matchEvents.goal_variant_3', { player }),
      () => assist
        ? t('matchEvents.goal_variant_4_with_assist', { player, assist })
        : t('matchEvents.goal_variant_4_no_assist', { player }),
      () => t('matchEvents.goal_variant_5', { player })
    ]
    return (pickRandom(variants, rng) ?? variants[0]!)()
  }

  function chanceDescription(player: string, rng: () => number): string {
    const variants: (() => string)[] = [
      () => t('matchEvents.chance_variant_1', { player }),
      () => t('matchEvents.chance_variant_2', { player }),
      () => t('matchEvents.chance_variant_3', { player }),
      () => t('matchEvents.chance_variant_4', { player })
    ]
    return (pickRandom(variants, rng) ?? variants[0]!)()
  }

  function simulateMatch(
    teamA: TournamentTeam,
    teamB: TournamentTeam,
    phase: MatchResult['phase'],
    seed: number
  ): MatchResult {
    const rng = mulberry32(seed)

    // Formation shape modifies each team's own attack/defense output; squad
    // chemistry then boosts (or leaves untouched) the resulting lambda --
    // see calculateFormationShape/calculateChemistryBonus above.
    //
    // Chemistry is gated to the player's own team (isPlayerTeam) -- an AI
    // opponent is always a single real historical squad (one nation, one
    // year, see buildTournamentTeam() in stores/tournament.ts), so *every*
    // one of its players always shares country and year with all 10
    // teammates. Applying the same formula to them wouldn't reward a lucky
    // draft the way it does for the player -- it would just hand every AI
    // team a permanent +11%, which is the opposite of the intent.
    const shapeA = calculateFormationShape(teamA.squad)
    const shapeB = calculateFormationShape(teamB.squad)
    const chemistryA = teamA.isPlayerTeam ? calculateChemistryBonus(teamA.squad) : 0
    const chemistryB = teamB.isPlayerTeam ? calculateChemistryBonus(teamB.squad) : 0
    const ovrBonusA = calculateOverallRatingBonus(teamA.averageOVR, teamB.averageOVR)
    const ovrBonusB = calculateOverallRatingBonus(teamB.averageOVR, teamA.averageOVR)
    // Legend Mode restricts drafting to 90+ rated players only, so every
    // single player in that squad is trivially a "legend" -- the whole
    // point of these bonuses (a rare, earned edge) would be meaningless
    // there, maxed out every single run. Never set for AI opponents, so
    // this only ever suppresses the bonus for the player's own team.
    const rowLegendA = teamA.isLegendMode ? { attack: 0, midfield: 0, defense: 0 } : calculateRowLegendBonuses(teamA.squad)
    const rowLegendB = teamB.isLegendMode ? { attack: 0, midfield: 0, defense: 0 } : calculateRowLegendBonuses(teamB.squad)

    const effAttackA = teamA.attackRating * shapeA.attackMult * (1 + rowLegendA.attack)
    const effDefenseA = teamA.defenseRating * shapeA.defenseMult * (1 + rowLegendA.defense)
    const effMidfieldA = teamA.midfieldRating * (1 + rowLegendA.midfield)
    const effAttackB = teamB.attackRating * shapeB.attackMult * (1 + rowLegendB.attack)
    const effDefenseB = teamB.defenseRating * shapeB.defenseMult * (1 + rowLegendB.defense)
    const effMidfieldB = teamB.midfieldRating * (1 + rowLegendB.midfield)

    // Midfield differential gets its own small kicker on top of already
    // being 40% of the attack blend below -- winning the midfield battle
    // means creating more chances, not just contributing to attack output.
    const midfieldDomA = effMidfieldA - effMidfieldB

    // Section comparison determines expected goals
    const attackDomA = (effAttackA * 0.6 + effMidfieldA * 0.4)
      - (effDefenseB * 0.6 + teamB.goalkeepingRating * 0.4) * 0.8
      + midfieldDomA * 0.15
    const attackDomB = (effAttackB * 0.6 + effMidfieldB * 0.4)
      - (effDefenseA * 0.6 + teamA.goalkeepingRating * 0.4) * 0.8
      - midfieldDomA * 0.15

    // Lambda: base 1.15 goals per game, adjusted by dominance (which already
    // reflects the per-row legend bonuses baked into effAttack/effMidfield/
    // effDefense above), then scaled by squad chemistry (0-11%) and the flat
    // overall-rating gap bonus (+/-30% cap).
    const lambdaA = Math.max(0.25, (1.15 + attackDomA * 0.03) * (1 + chemistryA) * (1 + ovrBonusA))
    const lambdaB = Math.max(0.25, (1.15 + attackDomB * 0.03) * (1 + chemistryB) * (1 + ovrBonusB))

    const regGoalsA = poissonRandom(lambdaA, rng)
    const regGoalsB = poissonRandom(lambdaB, rng)

    let extraTime = false
    let etGoalsA = 0
    let etGoalsB = 0
    let penalties: { teamA: number, teamB: number } | undefined = undefined

    // Knockout matches (never group stage) that are level after 90' go to extra time
    if (phase !== 'group' && regGoalsA === regGoalsB) {
      extraTime = true
      etGoalsA = rng() > 0.6 ? 1 : 0
      etGoalsB = rng() > 0.6 ? 1 : 0

      if (regGoalsA + etGoalsA === regGoalsB + etGoalsB) {
        // Still level after extra time — penalty shootout
        const pensA = randomInt(3, 5, rng)
        const pensB = pensA === 5 ? (rng() > 0.5 ? 4 : 3) : (pensA + (rng() > 0.5 ? 1 : -1))
        penalties = {
          teamA: pensA,
          teamB: Math.max(0, pensB === pensA ? pensA + 1 : pensB)
        }
      }
    }

    const goalsA = regGoalsA + etGoalsA
    const goalsB = regGoalsB + etGoalsB

    const events = _generateEvents(teamA, teamB, regGoalsA, regGoalsB, etGoalsA, etGoalsB, extraTime, penalties, rng)

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
      name: t('matchEvents.fallback_player_name', { country: countryName(team.country) }),
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

  /** Generate goal events for a stretch of the match, continuing from a running score baseline */
  function _generateGoalEvents(
    teamA: TournamentTeam,
    teamB: TournamentTeam,
    goalsA: number,
    goalsB: number,
    minMinute: number,
    maxMinute: number,
    baseScoreA: number,
    baseScoreB: number,
    rng: () => number
  ): { events: MatchEvent[], scoreA: number, scoreB: number } {
    const events: MatchEvent[] = []
    let scoreA = baseScoreA
    let scoreB = baseScoreB

    const totalGoals = goalsA + goalsB
    const goalMinutes = Array.from({ length: totalGoals }, () => randomInt(minMinute, maxMinute, rng)).sort((a, b) => a - b)
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
      const scorerPool = scorers.length > 0 ? scorers : scoringTeam.squad
      // In Legend Mode every player is 90+ already, so ranking "the" legends
      // among them is meaningless -- weight stays uniform there.
      const scorerWeight = scoringTeam.isLegendMode ? () => 1 : (p: Player) => legendScorerWeight(p, scoringTeam.squad)
      const scorer = pickWeighted(scorerPool, scorerWeight, rng) ?? defaultScorer

      const otherSquad = scoringTeam.squad.filter(p => p.id !== scorer.id)
      const maybeAssist = rng() > 0.4 && otherSquad.length > 0
        ? pickRandom(otherSquad, rng)
        : null

      if (team === 'A') scoreA++
      else scoreB++

      const description = goalDescription(
        scorer.name,
        maybeAssist?.name ?? null,
        minute,
        countryName(teamA.country),
        scoreA,
        scoreB,
        countryName(teamB.country),
        rng
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

    return { events, scoreA, scoreB }
  }

  function _generateEvents(
    teamA: TournamentTeam,
    teamB: TournamentTeam,
    regGoalsA: number,
    regGoalsB: number,
    etGoalsA: number,
    etGoalsB: number,
    extraTime: boolean,
    penalties: { teamA: number, teamB: number } | undefined,
    rng: () => number
  ): MatchEvent[] {
    const events: MatchEvent[] = []

    // Kickoff
    events.push({ minute: 1, type: 'kickoff', team: null, description: t('matchEvents.kickoff'), scoreA: 0, scoreB: 0 })

    // Regulation time goals (minutes 3-90)
    const reg = _generateGoalEvents(teamA, teamB, regGoalsA, regGoalsB, 3, 90, 0, 0, rng)
    events.push(...reg.events)

    // Halftime — score at the 45' mark
    const goalsBeforeHalf = reg.events.filter(e => e.minute <= 45)
    const halfScoreA = goalsBeforeHalf.length > 0 ? goalsBeforeHalf[goalsBeforeHalf.length - 1]!.scoreA : 0
    const halfScoreB = goalsBeforeHalf.length > 0 ? goalsBeforeHalf[goalsBeforeHalf.length - 1]!.scoreB : 0
    events.push({
      minute: 45,
      type: 'halftime',
      team: null,
      description: t('matchEvents.halftime', { teamA: countryName(teamA.country), scoreA: halfScoreA, scoreB: halfScoreB, teamB: countryName(teamB.country) }),
      scoreA: halfScoreA,
      scoreB: halfScoreB
    })

    // Random close chances (regulation time)
    const numChances = randomInt(2, 4, rng)
    for (let i = 0; i < numChances; i++) {
      const team = rng() > 0.5 ? 'A' : 'B'
      const chanceTeam = team === 'A' ? teamA : teamB
      const player = (chanceTeam.squad.length > 0 ? pickRandom(chanceTeam.squad, rng) : null) ?? _getFallbackPlayer(chanceTeam, 'chance')
      const minute = randomInt(5, 89, rng)
      events.push({
        minute,
        type: 'chance',
        team,
        playerId: player.id,
        playerName: player.name,
        description: chanceDescription(player.name, rng),
        scoreA: reg.scoreA,
        scoreB: reg.scoreB
      })
    }

    // Random cards (regulation time)
    const numCards = randomInt(1, 3, rng)
    for (let i = 0; i < numCards; i++) {
      const team = rng() > 0.5 ? 'A' : 'B'
      const cardTeam = team === 'A' ? teamA : teamB
      const player = (cardTeam.squad.length > 0 ? pickRandom(cardTeam.squad, rng) : null) ?? _getFallbackPlayer(cardTeam, 'card')
      const minute = randomInt(10, 88, rng)
      const isRed = rng() < 0.1
      events.push({
        minute,
        type: isRed ? 'red-card' : 'yellow-card',
        team,
        playerId: player.id,
        playerName: player.name,
        description: isRed ? t('matchEvents.card_red', { player: player.name }) : t('matchEvents.card_yellow', { player: player.name }),
        scoreA: reg.scoreA,
        scoreB: reg.scoreB
      })
    }

    // Full-time (regulation)
    events.push({
      minute: 90,
      type: 'fulltime',
      team: null,
      description: extraTime
        ? t('matchEvents.fulltime_to_extra_time', { teamA: countryName(teamA.country), scoreA: reg.scoreA, scoreB: reg.scoreB, teamB: countryName(teamB.country) })
        : t('matchEvents.fulltime', { teamA: countryName(teamA.country), scoreA: reg.scoreA, scoreB: reg.scoreB, teamB: countryName(teamB.country) }),
      scoreA: reg.scoreA,
      scoreB: reg.scoreB
    })

    if (extraTime) {
      events.push({
        minute: 91,
        type: 'extra-time',
        team: null,
        description: t('matchEvents.extra_time_begins'),
        scoreA: reg.scoreA,
        scoreB: reg.scoreB
      })

      // Extra time goals (minutes 92-120), continuing the running score
      const et = _generateGoalEvents(teamA, teamB, etGoalsA, etGoalsB, 92, 120, reg.scoreA, reg.scoreB, rng)
      events.push(...et.events)

      const decidedInExtraTime = et.scoreA !== et.scoreB
      events.push({
        minute: 120,
        type: 'fulltime',
        team: null,
        description: decidedInExtraTime
          ? t('matchEvents.fulltime_aet', { teamA: countryName(teamA.country), scoreA: et.scoreA, scoreB: et.scoreB, teamB: countryName(teamB.country) })
          : t('matchEvents.fulltime_aet_to_penalties', { teamA: countryName(teamA.country), scoreA: et.scoreA, scoreB: et.scoreB, teamB: countryName(teamB.country) }),
        scoreA: et.scoreA,
        scoreB: et.scoreB
      })

      if (penalties) {
        const teamAWins = penalties.teamA > penalties.teamB
        const winnerName = teamAWins ? countryName(teamA.country) : countryName(teamB.country)
        events.push({
          minute: 121,
          type: 'penalty-shootout',
          team: teamAWins ? 'A' : 'B',
          description: t('matchEvents.penalty_shootout_result', { winner: winnerName, max: Math.max(penalties.teamA, penalties.teamB), min: Math.min(penalties.teamA, penalties.teamB) }),
          scoreA: et.scoreA,
          scoreB: et.scoreB
        })
      }
    }

    return events.sort((a, b) => a.minute - b.minute)
  }

  return { simulateMatch, calculateSectionRatings }
}
