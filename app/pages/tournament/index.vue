<script setup lang="ts">
import type { MatchResult, Player } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import LiveMatchBroadcast from '~/components/tournament/LiveMatchBroadcast.vue'
import TournamentShareModal from '~/components/tournament/TournamentShareModal.vue'
import PlayerStatCardModal from '~/components/draft/PlayerStatCardModal.vue'

definePageMeta({ layout: 'default' })

const tournament = useTournamentStore()
const draft = useDraftStore()
const appLoading = useAppLoading()

// Player stat inspection modal state
const inspectedPlayer = ref<Player | null>(null)
const isStatModalOpen = ref(false)

function inspectPlayer(player: Player) {
  inspectedPlayer.value = player
  isStatModalOpen.value = true
}

// Group table collapse state: closed initially so user decides when to open
const isGroupTableOpen = ref(false)

// Match event breakdowns: closed initially
const expandedMatchIds = ref<Set<string>>(new Set())

// Share modal state
const isShareModalOpen = ref(false)

// Auto-init tournament on mount if draft is complete
onMounted(() => {
  if (!draft.isComplete) {
    navigateTo('/draft/formation')
    return
  }
  if (tournament.groups.length === 0) {
    tournament.initTournament()
  }
})

// Current player match being simulated live
const activePlayerMatch = computed<MatchResult | null>(() => {
  return tournament.currentLiveMatch
})

// Is the entire tournament run simulation completed?
const isSimulationCompleted = computed(() => {
  return tournament.tournamentPhase === 'complete' || (tournament.simulationStep >= 3 && tournament.currentLiveMatch === null)
})

// All completed matches so far
const completedPlayerMatches = computed<MatchResult[]>(() => {
  return tournament.playerMatches
})

// Completed group stage matches
const completedGroupMatches = computed<MatchResult[]>(() => {
  return tournament.playerMatches.filter(m => m.phase === 'group')
})

// Completed knockout matches
const completedKnockoutMatches = computed<MatchResult[]>(() => {
  return tournament.playerMatches.filter(m => m.phase !== 'group')
})

// Called when active match broadcast finishes
function onLiveMatchCompleted() {
  tournament.advanceSimulationStep()
}

function skipAllToResults() {
  appLoading.show(undefined, 500)
  setTimeout(() => {
    tournament.skipAllSimulation()
    isGroupTableOpen.value = false
  }, 120)
}

function toggleMatchExpanded(matchId: string) {
  if (expandedMatchIds.value.has(matchId)) {
    expandedMatchIds.value.delete(matchId)
  } else {
    expandedMatchIds.value.add(matchId)
  }
}

// Filter notable key match events (eliminates empty timeline lines)
function getNotableMatchEvents(match: MatchResult) {
  return match.events
    .filter(e => ['goal', 'yellow-card', 'red-card', 'penalty-shootout'].includes(e.type))
    .sort((a, b) => a.minute - b.minute)
}

function matchResultLabel(match: MatchResult): string {
  if (!tournament.playerTeam) return ''
  const pid = tournament.playerTeam.id
  const isTeamA = match.teamA.team.id === pid
  const myGoals = isTeamA ? match.teamA.goals : match.teamB.goals
  const theirGoals = isTeamA ? match.teamB.goals : match.teamA.goals

  if (match.penalties) {
    const myPens = isTeamA ? match.penalties.teamA : match.penalties.teamB
    const theirPens = isTeamA ? match.penalties.teamB : match.penalties.teamA
    const won = myPens > theirPens
    return `${myGoals}–${theirGoals} (${myPens}–${theirPens} pens) ${won ? '✓ Won' : '✗ Lost'}`
  }

  if (myGoals > theirGoals) return `${myGoals}–${theirGoals} ✓ Won`
  if (myGoals < theirGoals) return `${myGoals}–${theirGoals} ✗ Lost`
  return `${myGoals}–${theirGoals} Draw`
}

function matchResultColor(match: MatchResult): 'success' | 'error' | 'warning' | 'neutral' {
  if (!tournament.playerTeam) return 'neutral'
  const pid = tournament.playerTeam.id
  const isTeamA = match.teamA.team.id === pid
  const myGoals = isTeamA ? match.teamA.goals : match.teamB.goals
  const theirGoals = isTeamA ? match.teamB.goals : match.teamA.goals
  const myPens = match.penalties ? (isTeamA ? match.penalties.teamA : match.penalties.teamB) : null
  const theirPens = match.penalties ? (isTeamA ? match.penalties.teamB : match.penalties.teamA) : null

  if (myGoals > theirGoals || (myPens !== null && myPens > theirPens!)) return 'success'
  if (myGoals < theirGoals || (myPens !== null && myPens < theirPens!)) return 'error'
  return 'warning'
}

function matchResultBadgeClass(match: MatchResult): string {
  const color = matchResultColor(match)
  if (color === 'success') return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-300'
  if (color === 'error') return 'bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-300'
  return 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-300'
}

function opponentTeam(match: MatchResult) {
  const pid = tournament.playerTeam?.id
  return match.teamA.team.id === pid ? match.teamB.team : match.teamA.team
}

const playerGroup = computed(() => {
  return tournament.playerGroup
})

// Player team position in group
const playerGroupStanding = computed(() => {
  if (!playerGroup.value || !tournament.playerTeam) return null
  const idx = playerGroup.value.standings.findIndex(s => s.team.id === tournament.playerTeam?.id)
  if (idx === -1) return null
  return {
    rank: idx + 1,
    standing: playerGroup.value.standings[idx]!
  }
})

// Positional Line Rating Averages (DEF, MID, ATT, Overall)
const squadLineRatings = computed(() => {
  if (!tournament.playerTeam) return { def: 0, mid: 0, att: 0, overall: 0 }
  const squad = tournament.playerTeam.squad

  const defGk = squad.filter(p => p.primaryPosition === 'GK' || ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.primaryPosition) || p.basePosition === 'Defender')
  const mid = squad.filter(p => ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(p.primaryPosition) || p.basePosition === 'Midfielder')
  const att = squad.filter(p => ['ST', 'CF', 'LW', 'RW'].includes(p.primaryPosition) || p.basePosition === 'Forward')

  const calcAvg = (list: Player[]) => list.length > 0 ? Math.round(list.reduce((sum, p) => sum + p.stats.overall, 0) / list.length) : 0

  return {
    def: calcAvg(defGk),
    mid: calcAvg(mid),
    att: calcAvg(att),
    overall: draft.teamOVR || calcAvg(squad)
  }
})

// Tournament Finish Outcome Classification
const tournamentOutcome = computed<'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'>(() => {
  if (!tournament.playerTeam) return 'group_stage'
  const pid = tournament.playerTeam.id

  if (tournament.isChampion) return 'winner'

  const final = tournament.knockoutBracket.final
  if (final && (final.teamA.team.id === pid || final.teamB.team.id === pid)) {
    return 'runner_up'
  }

  const sf = tournament.knockoutBracket.semiFinals.find(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
  if (sf) {
    return 'semi_final'
  }

  const qf = tournament.knockoutBracket.quarterFinals.find(m => m.teamA.team.id === pid || m.teamB.team.id === pid)
  if (qf) {
    return 'quarter_final'
  }

  return 'group_stage'
})

// Sorting state for player stats table
type SortField = 'name' | 'primaryPosition' | 'overall' | 'matches' | 'minutes' | 'goals' | 'assists' | 'ga' | 'rating'
const sortField = ref<SortField>('ga')
const sortOrder = ref<'asc' | 'desc'>('desc')

function setSort(field: SortField) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const sortedPlayerStats = computed(() => {
  const list = tournament.runStats?.playerStats ? [...tournament.runStats.playerStats] : []
  return list.sort((a, b) => {
    let valA: string | number = a[sortField.value as keyof typeof a] as number
    let valB: string | number = b[sortField.value as keyof typeof b] as number
    if (sortField.value === 'name') {
      valA = a.player.name
      valB = b.player.name
    } else if (sortField.value === 'primaryPosition') {
      valA = a.player.primaryPosition
      valB = b.player.primaryPosition
    } else if (sortField.value === 'overall') {
      valA = a.player.stats.overall
      valB = b.player.stats.overall
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder.value === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    return sortOrder.value === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
  })
})

function restartDraft() {
  tournament.reset()
  draft.resetDraft()
  navigateTo('/draft/formation')
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1 text-left">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
          Continental Tournament Simulation
        </div>
        <h1 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
          <CountryFlag
            :country="draft.teamEmblem || 'eu'"
            size="md"
          />
          <span>{{ draft.teamName || 'Dream XI' }}</span>
        </h1>
        <p class="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold">
          {{ draft.formation?.label }} Formation · Squad Rating: <strong class="font-mono text-emerald-700 dark:text-emerald-400 font-black">{{ draft.teamOVR }} OVR</strong>
        </p>
      </div>

      <!-- Skip to Results Button -->
      <div v-if="!isSimulationCompleted">
        <button
          type="button"
          class="rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white cursor-pointer shadow-md inline-flex items-center gap-2 transition-all"
          @click="skipAllToResults"
        >
          <UIcon
            name="i-lucide-fast-forward"
            class="size-4 text-white"
            aria-hidden="true"
          />
          <span>Skip to Final Results</span>
        </button>
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- 1. GROUP STAGE TABLE / TABLEAU (Collapsible, closed initially)       -->
    <!-- ==================================================================== -->
    <div
      v-if="playerGroup"
      class="surface-card overflow-hidden shadow-lg"
    >
      <!-- Collapsible Header Banner -->
      <button
        type="button"
        class="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-white/[0.02] transition-colors select-none"
        @click="isGroupTableOpen = !isGroupTableOpen"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <UIcon
              name="i-lucide-table"
              class="size-4 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div class="min-w-0">
            <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 truncate">
              <span>Group {{ playerGroup.id }} Standings</span>
              <span
                v-if="playerGroupStanding"
                class="text-xs font-mono px-2 py-0.5 rounded-md font-bold"
                :class="playerGroupStanding.rank <= 2 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'"
              >
                {{ playerGroupStanding.rank }}. Place · {{ playerGroupStanding.standing.points }} Pts
              </span>
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              {{ isGroupTableOpen ? 'Top 2 teams advance to the knockout stage' : 'Click to expand group table' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hidden sm:inline">
            {{ isGroupTableOpen ? 'Collapse' : 'Expand' }}
          </span>
          <UIcon
            :name="isGroupTableOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="size-5 text-zinc-700 dark:text-zinc-300"
          />
        </div>
      </button>

      <!-- Table Body -->
      <div
        v-if="isGroupTableOpen"
        class="p-4 sm:p-5 pt-2 border-t border-zinc-200 dark:border-white/5 space-y-1"
      >
        <!-- Table Column Headers -->
        <div class="flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200/60 dark:border-white/5 select-none">
          <span class="w-4 text-center shrink-0">#</span>
          <span class="w-5 shrink-0" />
          <span class="flex-1 min-w-0">Team</span>
          <div class="flex gap-2 sm:gap-4 shrink-0 text-right font-bold">
            <span class="w-4 text-center">P</span>
            <span class="w-6 text-center">PTS</span>
            <span class="w-8 text-right">DIFF</span>
          </div>
        </div>

        <div class="space-y-1 pt-1">
          <div
            v-for="(standing, rank) in playerGroup.standings"
            :key="standing.team.id"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-all"
            :class="standing.team.id === tournament.playerTeam?.id
              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-2 border-emerald-500'
              : 'hover:bg-zinc-100/60 dark:hover:bg-white/[0.02] border-l-2 border-transparent'"
          >
            <!-- Rank -->
            <span
              class="w-4 font-mono text-xs font-black shrink-0 text-center"
              :class="rank < 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'"
            >
              {{ rank + 1 }}
            </span>

            <!-- Flag -->
            <CountryFlag
              :country="standing.team.country"
              size="sm"
            />

            <!-- Team Name + Tag (untruncated on mobile) -->
            <div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
              <span class="font-bold text-zinc-900 dark:text-white truncate">
                {{ standing.team.countryName }}
              </span>
              <span
                v-if="standing.team.id === tournament.playerTeam?.id"
                class="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 font-black tracking-wide shrink-0"
              >
                YOU
              </span>
              <span
                v-else
                class="text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold shrink-0"
              >
                '{{ String(standing.team.year).slice(-2) }}
              </span>
            </div>

            <!-- Stats (Compact aligned columns) -->
            <div class="flex gap-2 sm:gap-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold shrink-0 text-right">
              <span class="w-4 text-center">{{ standing.played }}</span>
              <span class="w-6 text-center text-zinc-900 dark:text-white font-black">{{ standing.points }}</span>
              <span class="w-8 text-right">{{ standing.goalsFor }}:{{ standing.goalsAgainst }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- 2. GROUP MATCHES (Chronological MD1, MD2, MD3)                       -->
    <!-- ==================================================================== -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-calendar-days"
            class="size-5 text-emerald-600 dark:text-emerald-400"
          />
          <span>Group Stage Matches</span>
        </h2>
        <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
          Matchday {{ Math.min(3, tournament.simulationStep + (activePlayerMatch?.phase === 'group' ? 1 : 0)) }} of 3
        </span>
      </div>

      <!-- Active Live Match if in Group Stage -->
      <div
        v-if="activePlayerMatch && activePlayerMatch.phase === 'group' && tournament.playerTeam"
        class="space-y-3"
      >
        <LiveMatchBroadcast
          :key="activePlayerMatch.id"
          :match="activePlayerMatch"
          :player-team-id="tournament.playerTeam.id"
          :speed-ms="400"
          @completed="onLiveMatchCompleted"
        />
      </div>

      <!-- Completed Group Matches List (Auto-collapsed with click-to-expand details) -->
      <div
        v-if="completedGroupMatches.length > 0"
        class="space-y-2.5"
      >
        <div
          v-for="(match, mIdx) in completedGroupMatches"
          :key="match.id"
          class="surface-card overflow-hidden transition-all"
        >
          <button
            type="button"
            class="w-full p-3.5 sm:p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors select-none"
            @click="toggleMatchExpanded(match.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase shrink-0">MD{{ mIdx + 1 }}</span>
              <CountryFlag
                :country="opponentTeam(match).country"
                size="sm"
              />
              <div class="min-w-0">
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
                </p>
                <p class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                  {{ match.events.filter(e => e.type === 'goal').length }} Goals · Click for event timeline
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
              <span
                class="font-mono font-black text-xs px-2.5 py-1 rounded-md border shrink-0 leading-none shadow-xs"
                :class="matchResultBadgeClass(match)"
              >
                {{ matchResultLabel(match) }}
              </span>
              <UIcon
                :name="expandedMatchIds.has(match.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 text-zinc-700 dark:text-zinc-300"
              />
            </div>
          </button>

          <!-- Expanded Match Events Breakdown (Eliminates empty placeholder lines) -->
          <div
            v-if="expandedMatchIds.has(match.id)"
            class="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-2 text-xs font-mono"
          >
            <div
              v-if="getNotableMatchEvents(match).length === 0"
              class="text-zinc-700 dark:text-zinc-300 italic py-1"
            >
              No goals or disciplinary cards in this match.
            </div>
            <div
              v-for="(ev, eIdx) in getNotableMatchEvents(match)"
              :key="eIdx"
              class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 py-0.5"
            >
              <span class="font-bold w-7 text-zinc-700 dark:text-zinc-300 shrink-0">{{ ev.minute }}'</span>
              <span v-if="ev.type === 'goal'">
                ⚽ Goal: <strong class="text-emerald-700 dark:text-emerald-400 font-bold">{{ ev.playerName }}</strong>
                <span
                  v-if="ev.assistPlayerName"
                  class="text-zinc-700 dark:text-zinc-300 font-semibold"
                > (assist by {{ ev.assistPlayerName }})</span>
              </span>
              <span v-else-if="ev.type === 'yellow-card'">
                🟨 Yellow Card: <span class="font-semibold">{{ ev.playerName }}</span>
              </span>
              <span v-else-if="ev.type === 'red-card'">
                🟥 Red Card: <strong class="text-rose-600 dark:text-rose-400 font-bold">{{ ev.playerName }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- 3. KNOCKOUT MATCHES (Quarter-Final, Semi-Final, Final)               -->
    <!-- ==================================================================== -->
    <div
      v-if="tournament.simulationStep >= 3 && tournamentOutcome !== 'group_stage'"
      class="space-y-4"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-swords"
            class="size-5 text-amber-500"
          />
          <span>Knockout Stage Matches</span>
        </h2>
      </div>

      <!-- Active Live Match if in Knockout Stage -->
      <div
        v-if="activePlayerMatch && activePlayerMatch.phase !== 'group' && tournament.playerTeam"
        class="space-y-3"
      >
        <LiveMatchBroadcast
          :key="activePlayerMatch.id"
          :match="activePlayerMatch"
          :player-team-id="tournament.playerTeam.id"
          :speed-ms="400"
          @completed="onLiveMatchCompleted"
        />
      </div>

      <!-- Completed Knockout Matches List -->
      <div
        v-if="completedKnockoutMatches.length > 0"
        class="space-y-2.5"
      >
        <div
          v-for="match in completedKnockoutMatches"
          :key="match.id"
          class="surface-card overflow-hidden transition-all"
        >
          <button
            type="button"
            class="w-full p-3.5 sm:p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors select-none"
            @click="toggleMatchExpanded(match.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase shrink-0">
                {{ match.phase === 'quarter-final' ? 'QF' : match.phase === 'semi-final' ? 'SF' : 'Final' }}
              </span>
              <CountryFlag
                :country="opponentTeam(match).country"
                size="sm"
              />
              <div class="min-w-0">
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
                </p>
                <p class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                  {{ match.phase.toUpperCase() }} · Click for event timeline
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
              <span
                class="font-mono font-black text-xs px-2.5 py-1 rounded-md border shrink-0 leading-none shadow-xs"
                :class="matchResultBadgeClass(match)"
              >
                {{ matchResultLabel(match) }}
              </span>
              <UIcon
                :name="expandedMatchIds.has(match.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 text-zinc-700 dark:text-zinc-300"
              />
            </div>
          </button>

          <!-- Expanded Knockout Events Breakdown -->
          <div
            v-if="expandedMatchIds.has(match.id)"
            class="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-2 text-xs font-mono"
          >
            <div
              v-if="getNotableMatchEvents(match).length === 0"
              class="text-zinc-700 dark:text-zinc-300 italic py-1"
            >
              No goals or disciplinary cards in this match.
            </div>
            <div
              v-for="(ev, eIdx) in getNotableMatchEvents(match)"
              :key="eIdx"
              class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 py-0.5"
            >
              <span class="font-bold w-7 text-zinc-700 dark:text-zinc-300 shrink-0">{{ ev.minute }}'</span>
              <span v-if="ev.type === 'goal'">
                ⚽ Goal: <strong class="text-emerald-700 dark:text-emerald-400 font-bold">{{ ev.playerName }}</strong>
                <span
                  v-if="ev.assistPlayerName"
                  class="text-zinc-700 dark:text-zinc-300 font-semibold"
                > (assist by {{ ev.assistPlayerName }})</span>
              </span>
              <span v-else-if="ev.type === 'yellow-card'">
                🟨 Yellow Card: <span class="font-semibold">{{ ev.playerName }}</span>
              </span>
              <span v-else-if="ev.type === 'red-card'">
                🟥 Red Card: <strong class="text-rose-600 dark:text-rose-400 font-bold">{{ ev.playerName }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- 4. TOURNAMENT SIMULATION RESULTS & OUTCOME CELEBRATION CARD          -->
    <!-- ==================================================================== -->
    <div
      v-if="isSimulationCompleted"
      class="space-y-8 animate-fade-in"
    >
      <!-- Dynamic Finish Outcome Banner -->
      <div
        class="surface-card p-6 sm:p-8 text-center space-y-4 relative overflow-hidden"
        :class="tournamentOutcome === 'winner' ? 'bg-gradient-to-b from-amber-500/20 via-transparent to-transparent border-amber-500/50 ring-1 ring-amber-500/40 shadow-2xl' : ''"
      >
        <!-- 1. Winner / Champion -->
        <div
          v-if="tournamentOutcome === 'winner'"
          class="space-y-2"
        >
          <UIcon
            name="i-lucide-trophy"
            class="size-16 mx-auto mb-2 text-amber-400 animate-bounce"
          />
          <h2 class="gold-text text-3xl sm:text-5xl font-black">
            {{ $t('results.champion_title') }}
          </h2>
          <p class="text-zinc-700 dark:text-zinc-300 max-w-md mx-auto text-sm font-medium">
            {{ $t('results.champion_subtitle') }}
          </p>
        </div>

        <!-- 2. Runner-Up / Finalist -->
        <div
          v-else-if="tournamentOutcome === 'runner_up'"
          class="space-y-2"
        >
          <UIcon
            name="i-lucide-medal"
            class="size-14 mx-auto mb-2 text-slate-300"
          />
          <h2 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white">
            Finalist Finish
          </h2>
          <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
            Your squad battled all the way to the Final and finished as proud runners-up!
          </p>
        </div>

        <!-- 3. Semi-Finalist -->
        <div
          v-else-if="tournamentOutcome === 'semi_final'"
          class="space-y-2"
        >
          <UIcon
            name="i-lucide-award"
            class="size-12 mx-auto mb-2 text-amber-600"
          />
          <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Semi-Final Finish
          </h2>
          <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
            A remarkable tournament run that concluded in the Semi-Finals.
          </p>
        </div>

        <!-- 4. Quarter-Finalist -->
        <div
          v-else-if="tournamentOutcome === 'quarter_final'"
          class="space-y-2"
        >
          <UIcon
            name="i-lucide-shield-alert"
            class="size-12 mx-auto mb-2 text-zinc-400"
          />
          <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Quarter-Final Finish
          </h2>
          <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
            Your squad advanced from the group stage and reached the Quarter-Finals.
          </p>
        </div>

        <!-- 5. Group Stage Eliminated -->
        <div
          v-else
          class="space-y-2"
        >
          <UIcon
            name="i-lucide-flag-off"
            class="size-12 mx-auto mb-2 text-zinc-500"
          />
          <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Group Stage Eliminated
          </h2>
          <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
            Your squad fought hard but was unable to qualify for the knockout stage.
          </p>
        </div>

        <!-- Action Buttons (Play Again, Share Results, Exit Home) -->
        <div class="pt-3 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            class="rounded-full px-6 py-2.5 font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-lg inline-flex items-center gap-2 transition-all active:scale-[0.99]"
            @click="restartDraft"
          >
            <UIcon
              name="i-lucide-refresh-cw"
              class="size-4"
            />
            <span>{{ $t('results.play_again') }}</span>
          </button>

          <button
            type="button"
            class="rounded-full px-6 py-2.5 font-bold text-sm bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white cursor-pointer shadow-lg inline-flex items-center gap-2 transition-all active:scale-[0.99]"
            @click="isShareModalOpen = true"
          >
            <UIcon
              name="i-lucide-share-2"
              class="size-4"
            />
            <span>Share Result</span>
          </button>

          <NuxtLink
            to="/"
            class="rounded-full px-5 py-2.5 font-bold text-sm bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white inline-flex items-center gap-2 transition-colors"
          >
            <UIcon
              name="i-lucide-home"
              class="size-4"
            />
            <span>Exit to Home</span>
          </NuxtLink>
        </div>

        <!-- Scroll Notice -->
        <p class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 pt-2 animate-pulse">
          ↓ Scroll down for complete squad line ratings & player statistics
        </p>
      </div>

      <!-- ==================================================================== -->
      <!-- 5. SQUAD STATS DASHBOARD (DEF, MID, ATT, Overall GES & Match Metrics) -->
      <!-- ==================================================================== -->
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
          <h2 class="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <UIcon
              name="i-lucide-shield"
              class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
            <span>Squad Ratings & Overview</span>
          </h2>
          <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider shrink-0 whitespace-nowrap self-start sm:self-auto px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10">
            <span>Formation:</span>
            <strong class="text-emerald-700 dark:text-emerald-400 font-black font-mono">{{ draft.formation?.id }}</strong>
          </span>
        </div>

        <!-- 4 Positional Line Average OVR / GES Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <!-- Defense (GK + Def) Avg GES -->
          <div class="surface-card p-4 space-y-1 text-center">
            <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">DEF (GK+Def)</span>
            <p class="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {{ squadLineRatings.def }} <span class="text-xs text-zinc-500 font-bold">GES</span>
            </p>
          </div>

          <!-- Midfield Avg GES -->
          <div class="surface-card p-4 space-y-1 text-center">
            <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">MID Avg</span>
            <p class="text-2xl font-black font-mono text-sky-700 dark:text-sky-400">
              {{ squadLineRatings.mid }} <span class="text-xs text-zinc-500 font-bold">GES</span>
            </p>
          </div>

          <!-- Attacking Avg GES -->
          <div class="surface-card p-4 space-y-1 text-center">
            <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">ATT Avg</span>
            <p class="text-2xl font-black font-mono text-amber-700 dark:text-amber-400">
              {{ squadLineRatings.att }} <span class="text-xs text-zinc-500 font-bold">GES</span>
            </p>
          </div>

          <!-- Overall GES -->
          <div class="surface-card p-4 space-y-1 text-center">
            <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">Overall GES</span>
            <p class="text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {{ squadLineRatings.overall }} <span class="text-xs text-zinc-500 font-bold">GES</span>
            </p>
          </div>
        </div>

        <!-- Tactical Pitch Lineup View -->
        <div class="surface-card p-5 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
            <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
              Drafted XI Tactical Pitch
            </span>
            <span class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              11 / 11 Starters
            </span>
          </div>

          <div class="w-full max-w-xl mx-auto h-[440px] py-1">
            <FormationPitch
              :slots="draft.slots"
              :interactive="false"
              class="h-full"
              @inspect-player="inspectPlayer"
            />
          </div>
        </div>

        <!-- Tournament Performance Metric Cards (4 Distinct Tiles, No Awkward Wrapping) -->
        <div
          v-if="tournament.runStats"
          class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
            <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              Matches Played
            </p>
            <p class="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {{ tournament.runStats.totalMatches }}
            </p>
          </div>

          <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
            <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              Goals (F : A)
            </p>
            <p class="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {{ tournament.runStats.totalGoalsFor }} : {{ tournament.runStats.totalGoalsAgainst }}
            </p>
          </div>

          <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
            <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              Goals / Match
            </p>
            <p class="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {{ (tournament.runStats.totalGoalsFor / tournament.runStats.totalMatches).toFixed(2) }}
            </p>
          </div>

          <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
            <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              Clean Sheets & Cards
            </p>
            <p class="text-xs sm:text-sm font-black font-mono text-zinc-900 dark:text-white pt-1">
              {{ tournament.runStats.cleanSheets }} 🧤 · {{ tournament.runStats.totalYellowCards }} 🟨 · {{ tournament.runStats.totalRedCards }} 🟥
            </p>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- 6. PLAYER STATS DASHBOARD (Top Performers Spotlight & Extended Table)-->
      <!-- ==================================================================== -->
      <div
        v-if="tournament.runStats"
        class="space-y-6"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
          <h2 class="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <UIcon
              name="i-lucide-bar-chart-2"
              class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
            <span>Player Tournament Performance</span>
          </h2>
          <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider shrink-0 whitespace-nowrap self-start sm:self-auto px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10">
            Top Performers & Stats
          </span>
        </div>

        <!-- 4 Top Performer Spotlight Cards -->
        <!-- 4 Top Performer Spotlight Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- MVP / Most G+A -->
          <div
            class="surface-card p-4 space-y-2 cursor-pointer hover:border-amber-500/40 transition-all"
            @click="tournament.runStats.mvp ? inspectPlayer(tournament.runStats.mvp.player) : null"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">Tournament MVP</span>
              <UIcon
                name="i-lucide-sparkles"
                class="size-4 text-amber-500"
              />
            </div>
            <template v-if="tournament.runStats.mvp">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.mvp.player.country"
                  size="sm"
                />
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {{ tournament.runStats.mvp.player.name }}
                </p>
              </div>
              <p class="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
                {{ tournament.runStats.mvp.ga }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">G+A ({{ tournament.runStats.mvp.goals }}G, {{ tournament.runStats.mvp.assists }}A)</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                —
              </p>
            </template>
          </div>

          <!-- Top Scorer -->
          <div
            class="surface-card p-4 space-y-2 cursor-pointer hover:border-amber-500/40 transition-all"
            @click="tournament.runStats.topScorer ? inspectPlayer(tournament.runStats.topScorer.player) : null"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">Golden Boot</span>
              <UIcon
                name="i-lucide-award"
                class="size-4 text-amber-500"
              />
            </div>
            <template v-if="tournament.runStats.topScorer && tournament.runStats.topScorer.goals > 0">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.topScorer.player.country"
                  size="sm"
                />
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {{ tournament.runStats.topScorer.player.name }}
                </p>
              </div>
              <p class="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
                {{ tournament.runStats.topScorer.goals }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">Goals</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                No goals scored
              </p>
            </template>
          </div>

          <!-- Top Playmaker -->
          <div
            class="surface-card p-4 space-y-2 cursor-pointer hover:border-emerald-500/40 transition-all"
            @click="tournament.runStats.topAssister ? inspectPlayer(tournament.runStats.topAssister.player) : null"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">Top Playmaker</span>
              <UIcon
                name="i-lucide-crosshair"
                class="size-4 text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <template v-if="tournament.runStats.topAssister && tournament.runStats.topAssister.assists > 0">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.topAssister.player.country"
                  size="sm"
                />
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {{ tournament.runStats.topAssister.player.name }}
                </p>
              </div>
              <p class="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {{ tournament.runStats.topAssister.assists }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">Assists</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                No assists recorded
              </p>
            </template>
          </div>

          <!-- Efficiency -->
          <div
            class="surface-card p-4 space-y-2 cursor-pointer hover:border-sky-500/40 transition-all"
            @click="tournament.runStats.bestGAPer90 ? inspectPlayer(tournament.runStats.bestGAPer90.player) : null"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">Efficiency</span>
              <UIcon
                name="i-lucide-gauge"
                class="size-4 text-sky-600 dark:text-sky-400"
              />
            </div>
            <template v-if="tournament.runStats.bestGAPer90">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.bestGAPer90.player.country"
                  size="sm"
                />
                <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                  {{ tournament.runStats.bestGAPer90.player.name }}
                </p>
              </div>
              <p class="text-xl font-black font-mono text-sky-700 dark:text-sky-400">
                {{ tournament.runStats.bestGAPer90.gaPer90 }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">G+A / 90'</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                —
              </p>
            </template>
          </div>
        </div>

        <!-- Extended All-Players Performance Table (with Interactive Sorting) -->
        <div class="surface-card p-4 sm:p-5 space-y-4 overflow-hidden">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
            <h3 class="text-xs sm:text-sm font-bold font-mono uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
              Complete Squad Performance Table
            </h3>
            <span class="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-bold">11 Starters · Click row for full card</span>
          </div>

          <div class="overflow-x-auto custom-scroll -mx-2 sm:mx-0 px-2 sm:px-0">
            <table class="w-full min-w-[620px] text-left text-xs font-mono">
              <thead>
                <tr class="text-zinc-600 dark:text-zinc-400 uppercase border-b border-zinc-200 dark:border-white/10 pb-2 font-bold select-none">
                  <th
                    class="py-2.5 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                    @click="setSort('name')"
                  >
                    Player <span v-if="sortField === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                    @click="setSort('primaryPosition')"
                  >
                    POS <span v-if="sortField === 'primaryPosition'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                    @click="setSort('overall')"
                  >
                    OVR <span v-if="sortField === 'overall'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 text-center cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                    @click="setSort('matches')"
                  >
                    P <span v-if="sortField === 'matches'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 text-center cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                    @click="setSort('minutes')"
                  >
                    MIN <span v-if="sortField === 'minutes'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400 font-black cursor-pointer"
                    @click="setSort('goals')"
                  >
                    G <span v-if="sortField === 'goals'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 text-center text-sky-700 dark:text-sky-400 font-bold cursor-pointer"
                    @click="setSort('assists')"
                  >
                    A <span v-if="sortField === 'assists'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th
                    class="py-2.5 px-2 text-center font-black text-amber-700 dark:text-amber-400 cursor-pointer"
                    @click="setSort('ga')"
                  >
                    G+A <span v-if="sortField === 'ga'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="py-2.5 px-2 text-center text-amber-700 dark:text-amber-300">
                    🟨
                  </th>
                  <th class="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400">
                    🟥
                  </th>
                  <th
                    class="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-400 font-black cursor-pointer"
                    @click="setSort('rating')"
                  >
                    RATING <span v-if="sortField === 'rating'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-white/10">
                <tr
                  v-for="p in sortedPlayerStats"
                  :key="p.player.id"
                  class="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  title="Click to view full player attributes"
                  @click="inspectPlayer(p.player)"
                >
                  <td class="py-2.5 px-2 font-bold text-zinc-900 dark:text-white flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                    <CountryFlag
                      :country="p.player.country"
                      size="sm"
                    />
                    <span class="truncate max-w-[7.5rem] sm:max-w-[12rem]">{{ p.player.name }}</span>
                    <UIcon
                      name="i-lucide-info"
                      class="size-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    />
                  </td>
                  <td class="py-2.5 px-2 text-zinc-600 dark:text-zinc-400 font-semibold">
                    {{ p.player.primaryPosition }}
                  </td>
                  <td
                    class="py-2.5 px-2 font-black"
                    :class="p.player.stats.overall >= 90 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-800 dark:text-zinc-200'"
                  >
                    {{ p.player.stats.overall }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-800 dark:text-zinc-200 font-semibold">
                    {{ p.matches }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                    {{ p.minutes }}'
                  </td>
                  <td class="py-2.5 px-2 text-center font-black text-emerald-700 dark:text-emerald-400">
                    {{ p.goals }}
                  </td>
                  <td class="py-2.5 px-2 text-center font-bold text-sky-700 dark:text-sky-400">
                    {{ p.assists }}
                  </td>
                  <td class="py-2.5 px-2 text-center font-black text-amber-700 dark:text-amber-400">
                    {{ p.ga }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                    {{ p.yellowCards }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                    {{ p.redCards }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-black text-emerald-700 dark:text-emerald-400">
                    {{ p.rating }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Results Modal -->
    <TournamentShareModal
      v-model:open="isShareModalOpen"
      :team-name="draft.teamName || 'Dream XI'"
      :team-emblem="draft.teamEmblem || 'eu'"
      :formation="draft.formation?.id || '4-3-3'"
      :squad="tournament.playerTeam?.squad || []"
      :outcome="tournamentOutcome"
      :line-ratings="squadLineRatings"
      :run-stats="tournament.runStats"
      :matches="tournament.playerMatches"
      :group-standing-rank="playerGroupStanding?.rank"
      :group-points="playerGroupStanding?.standing.points"
    />

    <!-- Player Stat Card Modal -->
    <PlayerStatCardModal
      v-model:open="isStatModalOpen"
      :player="inspectedPlayer"
    />
  </div>
</template>
