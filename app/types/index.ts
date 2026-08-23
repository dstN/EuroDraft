// ============================================================
// EuroDraft — Core Type Definitions
// ============================================================

// ------- Position System -------

export type PositionCode
  = | 'GK'
    | 'CB' | 'LB' | 'RB'
    | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
    | 'LW' | 'RW' | 'ST' | 'CF'

export type PositionCategory = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'

export interface PositionDefinition {
  code: PositionCode
  category: PositionCategory
  label: string
  /** Coordinates on the visual pitch as percentage [x, y] from top-left */
  pitchCoords: [number, number]
}

// ------- Player Stats -------

export interface PlayerStats {
  overall: number // 0-99
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

// ------- Player -------

export type EnrichmentSource = 'wikidata' | 'curated' | 'historical' | 'gemini' | 'fallback'

export interface Player {
  id: string // e.g. "es-2024-pedri"
  name: string // Display name
  nameNormalized: string // For cross-year uniqueness check
  country: string // ISO 3166-1 alpha-2 (or historical code: su, yu, cs)
  countryName: string // "Spain"
  year: number // Euro year (1960, 1964, ..., 2024)
  shirtNumber: number | null
  basePosition: PositionCategory // From Wikipedia: broad category
  positions: PositionCode[] // Granular — all playable positions
  primaryPosition: PositionCode // Best/most common position
  draftedPosition?: PositionCode // Exact slot position picked during draft
  stats: PlayerStats
  enrichmentSource: EnrichmentSource
}

// ------- Tournament -------

export type TournamentFormat = '4-teams' | '8-teams' | '16-teams' | '24-teams'

export interface Tournament {
  year: number
  hostCountry: string
  winner: string // country code
  runnerUp: string
  format: TournamentFormat
  teams: string[] // country codes
}

// ------- Database (the static JSON) -------

export interface EuroDraftDB {
  meta: {
    version: string
    generatedAt: string
    totalPlayers: number
    totalTeams: number
  }
  tournaments: Tournament[]
  players: Player[]
}

// ------- Formation -------

export type FormationSlots = Partial<Record<PositionCode, number>>

export interface Formation {
  id: string // e.g. "4-3-3"
  label: string // Display label
  slots: FormationSlots
}

// ------- Draft State -------

export interface DraftSlot {
  id: string // e.g. "CB-0", "ST-1"
  position: PositionCode
  player: Player | null
}

// ------- Tournament Simulation -------

export interface TournamentTeam {
  id: string
  country: string
  year: number
  countryName: string
  squad: Player[]
  isPlayerTeam: boolean
  // Computed section ratings (0-99)
  averageOVR: number
  attackRating: number
  midfieldRating: number
  defenseRating: number
  goalkeepingRating: number
}

export interface MatchEvent {
  minute: number
  type: 'kickoff' | 'goal' | 'yellow-card' | 'red-card' | 'chance' | 'save' | 'halftime' | 'fulltime'
  team: 'A' | 'B' | null
  playerId?: string
  playerName?: string
  assistPlayerId?: string
  assistPlayerName?: string
  description: string
  // Running score at this moment
  scoreA: number
  scoreB: number
}

export interface PlayerTournamentStats {
  player: Player
  matches: number
  minutes: number
  goals: number
  assists: number
  ga: number
  yellowCards: number
  redCards: number
  cleanSheets: number
  gaPer90: number
  rating: number
}

export interface TournamentRunStats {
  totalMatches: number
  totalGoalsFor: number
  totalGoalsAgainst: number
  cleanSheets: number
  totalYellowCards: number
  totalRedCards: number
  topScorer: PlayerTournamentStats | null
  topAssister: PlayerTournamentStats | null
  mvp: PlayerTournamentStats | null
  bestGAPer90: PlayerTournamentStats | null
  playerStats: PlayerTournamentStats[]
}

export interface MatchResult {
  id: string
  teamA: { team: TournamentTeam, goals: number }
  teamB: { team: TournamentTeam, goals: number }
  events: MatchEvent[]
  extraTime: boolean
  penalties?: { teamA: number, teamB: number }
  phase: 'group' | 'quarter-final' | 'semi-final' | 'final'
  groupId?: string
}

export interface GroupStanding {
  team: TournamentTeam
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface Group {
  id: 'A' | 'B' | 'C' | 'D'
  teams: TournamentTeam[]
  matches: MatchResult[]
  standings: GroupStanding[]
}

export interface KnockoutBracket {
  quarterFinals: MatchResult[]
  semiFinals: MatchResult[]
  final: MatchResult | null
}

export type GamePhase
  = | 'landing'
    | 'formation-select'
    | 'drafting'
    | 'draft-complete'
    | 'tournament'
    | 'champion'

export type TournamentPhase = 'group' | 'quarter-final' | 'semi-final' | 'final' | 'complete'
