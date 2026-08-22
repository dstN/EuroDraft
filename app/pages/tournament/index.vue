<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import PlayerFoilCard from '~/components/draft/PlayerFoilCard.vue'
import LiveMatchBroadcast from '~/components/tournament/LiveMatchBroadcast.vue'

definePageMeta({ layout: 'default' })

const tournament = useTournamentStore()
const draft = useDraftStore()

// Squad view tab: 'pitch' | 'cards'
const squadViewMode = ref<'pitch' | 'cards'>('pitch')

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

// Completed matches so far
const completedPlayerMatches = computed<MatchResult[]>(() => {
  return tournament.playerMatches
})

// Called when active match broadcast finishes
function onLiveMatchCompleted() {
  tournament.advanceSimulationStep()
}

function skipAllToResults() {
  tournament.skipAllSimulation()
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

function opponentTeam(match: MatchResult) {
  const pid = tournament.playerTeam?.id
  return match.teamA.team.id === pid ? match.teamB.team : match.teamA.team
}

const draftedPlayersList = computed(() => {
  return draft.filledSlots.filter(s => s.player !== null).map(s => s.player!)
})

const playerGroup = computed(() => {
  return tournament.playerGroup
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1 text-left">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono tracking-[0.2em] font-bold">
          UEFA European Championship
        </div>
        <h1 class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
          <CountryFlag
            :country="draft.teamEmblem || 'eu'"
            size="md"
          />
          <span>{{ draft.teamName || 'Dream XI' }}</span>
        </h1>
        <p class="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm font-medium">
          {{ draft.formation?.label }} Formation · Squad Rating: <strong class="font-mono text-emerald-500 dark:text-emerald-400">{{ draft.teamOVR }} OVR</strong>
        </p>
      </div>

      <!-- Skip to Results Button -->
      <div v-if="!isSimulationCompleted">
        <UButton
          size="sm"
          variant="solid"
          color="primary"
          leading-icon="i-lucide-fast-forward"
          label="Skip to Final Results"
          class="rounded-full px-5 font-bold shadow-md shadow-emerald-500/25 cursor-pointer"
          @click="skipAllToResults"
        />
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- MODE 1: LIVE TOURNAMENT SIMULATION ARENA (First thing user sees)     -->
    <!-- ==================================================================== -->
    <div
      v-if="!isSimulationCompleted"
      class="space-y-8"
    >
      <!-- Group Draw Announcement Card -->
      <div
        v-if="playerGroup"
        class="surface-card p-5 space-y-3"
      >
        <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
          <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            Group {{ playerGroup.id }} Draw
          </span>
          <span class="text-[10px] font-mono font-bold text-emerald-400">
            Top 2 Advance to Knockouts
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="t in playerGroup.teams"
            :key="t.id"
            class="p-3 rounded-xl border flex flex-col items-center text-center space-y-1.5"
            :class="t.id === tournament.playerTeam?.id
              ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-400/40'
              : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-white/5'"
          >
            <CountryFlag
              :country="t.country"
              size="md"
            />
            <span
              class="font-bold text-xs truncate max-w-full"
              :class="t.id === tournament.playerTeam?.id ? 'text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'"
            >
              {{ t.countryName }}
            </span>
            <span class="text-[10px] font-mono text-zinc-500">
              OVR {{ t.averageOVR }}
            </span>
          </div>
        </div>
      </div>

      <!-- ACTIVE LIVE MATCH BROADCAST (Streams events live, then triggers collapse) -->
      <div
        v-if="activePlayerMatch && tournament.playerTeam"
        class="space-y-3"
      >
        <h2 class="text-lg font-black text-white tracking-tight flex items-center gap-2">
          <span class="size-2.5 rounded-full bg-rose-500 animate-ping" />
          <span>Live: vs {{ opponentTeam(activePlayerMatch).countryName }} '{{ opponentTeam(activePlayerMatch).year }}</span>
        </h2>

        <LiveMatchBroadcast
          :key="activePlayerMatch.id"
          :match="activePlayerMatch"
          :player-team-id="tournament.playerTeam.id"
          :speed-ms="400"
          @completed="onLiveMatchCompleted"
        />
      </div>

      <!-- COLLAPSED COMPLETED MATCHES LIST -->
      <div
        v-if="completedPlayerMatches.length > 0"
        class="space-y-3"
      >
        <h3 class="text-xs font-mono uppercase font-bold tracking-widest text-zinc-400">
          Completed Matches ({{ completedPlayerMatches.length }})
        </h3>
        <div class="space-y-2">
          <div
            v-for="match in completedPlayerMatches"
            :key="match.id"
            class="surface-card p-3.5 flex items-center justify-between gap-4 animate-scale-in"
          >
            <div class="flex items-center gap-3 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="sm"
              />
              <span class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
              </span>
            </div>
            <UBadge
              :color="matchResultColor(match)"
              variant="soft"
              size="sm"
              class="font-mono font-bold"
            >
              {{ matchResultLabel(match) }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- LIVE GROUP STANDINGS (Dynamically updates with animated score tally) -->
      <div
        v-if="playerGroup"
        class="surface-card p-5 space-y-4 overflow-hidden"
      >
        <div class="pb-2 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between">
          <p class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
            Live Group {{ playerGroup.id }} Table
          </p>
          <span class="text-[10px] font-mono text-emerald-400 font-semibold">
            Live Point Calculations
          </span>
        </div>

        <div class="divide-y divide-zinc-200 dark:divide-white/5">
          <div
            v-for="(standing, rank) in playerGroup.standings"
            :key="standing.team.id"
            class="flex items-center gap-3.5 py-2.5 text-sm transition-all"
            :class="standing.team.isPlayerTeam ? 'bg-emerald-500/15 dark:bg-emerald-950/50 px-3 rounded-xl border border-emerald-500/40' : ''"
          >
            <span
              class="w-5 font-mono text-xs font-black"
              :class="rank < 2 ? 'text-emerald-400' : 'text-zinc-500'"
            >
              {{ rank + 1 }}
            </span>
            <CountryFlag
              :country="standing.team.country"
              size="sm"
            />
            <span
              class="flex-1 font-bold truncate"
              :class="standing.team.isPlayerTeam ? 'text-emerald-500 dark:text-emerald-300' : 'text-zinc-900 dark:text-white'"
            >
              {{ standing.team.countryName }}
              <span
                v-if="!standing.team.isPlayerTeam"
                class="text-zinc-500 text-xs font-mono font-normal"
              >'{{ standing.team.year }}</span>
            </span>
            <div class="flex gap-4 font-mono text-xs text-zinc-400 font-semibold">
              <span>{{ standing.played }}P</span>
              <span class="text-zinc-900 dark:text-white font-black">{{ standing.points }}pts</span>
              <span>{{ standing.goalsFor }}:{{ standing.goalsAgainst }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================================== -->
    <!-- MODE 2: FINAL TOURNAMENT HUB, STATS DASHBOARD & SQUAD LINEUP         -->
    <!-- (Appears upon tournament completion or when user skips)             -->
    <!-- ==================================================================== -->
    <div
      v-else
      class="space-y-8 animate-fade-in"
    >
      <!-- CHAMPION / ELIMINATED BANNER -->
      <div
        class="surface-card p-8 text-center space-y-4"
        :class="tournament.isChampion ? 'bg-gradient-to-b from-amber-500/20 via-transparent to-transparent border border-gold-500/40' : ''"
      >
        <div v-if="tournament.isChampion">
          <UIcon
            name="i-lucide-trophy"
            class="size-16 mx-auto mb-2 text-gold-400 animate-bounce"
          />
          <h2 class="gold-text text-3xl sm:text-5xl font-black">
            {{ $t('results.champion_title') }}
          </h2>
          <p class="text-zinc-300 max-w-md mx-auto text-sm">
            {{ $t('results.champion_subtitle') }}
          </p>
        </div>
        <div v-else>
          <UIcon
            name="i-lucide-flag-off"
            class="size-12 mx-auto mb-2 text-zinc-500"
          />
          <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            {{ $t('results.eliminated_title') }}
          </h2>
          <p class="text-zinc-400 text-sm">
            {{ $t('results.eliminated_subtitle', { phase: tournament.playerMatches.at(-1)?.phase }) }}
          </p>
        </div>

        <div class="pt-2">
          <UButton
            to="/draft/formation"
            color="primary"
            size="md"
            :label="$t('results.play_again')"
            leading-icon="i-lucide-refresh-cw"
            class="rounded-full px-6 font-bold cursor-pointer"
            @click="tournament.reset(); useDraftStore().resetDraft()"
          />
        </div>
      </div>

      <!-- ==================== TOURNAMENT RUN STATS DASHBOARD ==================== -->
      <div
        v-if="tournament.runStats"
        class="space-y-6"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <UIcon
              name="i-lucide-bar-chart-2"
              class="size-5 text-emerald-400"
            />
            <span>Tournament Run Stats</span>
          </h2>
          <span class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
            {{ tournament.runStats.totalMatches }} Matches Played
          </span>
        </div>

        <!-- 4 Highlight Hero Stat Cards (Top Scorer, Top Assister, MVP, G+A/90) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Top Scorer -->
          <div class="surface-card p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Top Scorer</span>
              <UIcon
                name="i-lucide-award"
                class="size-4 text-gold-400"
              />
            </div>
            <template v-if="tournament.runStats.topScorer && tournament.runStats.topScorer.goals > 0">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.topScorer.player.country"
                  size="sm"
                />
                <h4 class="font-bold text-sm text-white truncate">
                  {{ tournament.runStats.topScorer.player.name }}
                </h4>
              </div>
              <p class="text-xl font-black font-mono text-gold-400">
                {{ tournament.runStats.topScorer.goals }} <span class="text-xs text-zinc-400 font-normal">Goals</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                No goals scored
              </p>
            </template>
          </div>

          <!-- Top Assistgiver -->
          <div class="surface-card p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Top Playmaker</span>
              <UIcon
                name="i-lucide-crosshair"
                class="size-4 text-emerald-400"
              />
            </div>
            <template v-if="tournament.runStats.topAssister && tournament.runStats.topAssister.assists > 0">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.topAssister.player.country"
                  size="sm"
                />
                <h4 class="font-bold text-sm text-white truncate">
                  {{ tournament.runStats.topAssister.player.name }}
                </h4>
              </div>
              <p class="text-xl font-black font-mono text-emerald-400">
                {{ tournament.runStats.topAssister.assists }} <span class="text-xs text-zinc-400 font-normal">Assists</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                No assists recorded
              </p>
            </template>
          </div>

          <!-- Most G+A Overall (MVP) -->
          <div class="surface-card p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Most G+A (MVP)</span>
              <UIcon
                name="i-lucide-sparkles"
                class="size-4 text-amber-400"
              />
            </div>
            <template v-if="tournament.runStats.mvp">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.mvp.player.country"
                  size="sm"
                />
                <h4 class="font-bold text-sm text-white truncate">
                  {{ tournament.runStats.mvp.player.name }}
                </h4>
              </div>
              <p class="text-xl font-black font-mono text-amber-400">
                {{ tournament.runStats.mvp.ga }} <span class="text-xs text-zinc-400 font-normal">G+A ({{ tournament.runStats.mvp.goals }}G, {{ tournament.runStats.mvp.assists }}A)</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                —
              </p>
            </template>
          </div>

          <!-- Best G+A / 90 Min -->
          <div class="surface-card p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400">Efficiency</span>
              <UIcon
                name="i-lucide-gauge"
                class="size-4 text-sky-400"
              />
            </div>
            <template v-if="tournament.runStats.bestGAPer90">
              <div class="flex items-center gap-2">
                <CountryFlag
                  :country="tournament.runStats.bestGAPer90.player.country"
                  size="sm"
                />
                <h4 class="font-bold text-sm text-white truncate">
                  {{ tournament.runStats.bestGAPer90.player.name }}
                </h4>
              </div>
              <p class="text-xl font-black font-mono text-sky-400">
                {{ tournament.runStats.bestGAPer90.gaPer90 }} <span class="text-xs text-zinc-400 font-normal">G+A / 90'</span>
              </p>
            </template>
            <template v-else>
              <p class="text-xs text-zinc-500 italic py-2">
                —
              </p>
            </template>
          </div>
        </div>

        <!-- Team Overview Ticker Bar (Clean Sheets, Goals, Cards) -->
        <div class="surface-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-white/5">
          <div class="space-y-1">
            <p class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
              Clean Sheets
            </p>
            <p class="text-lg font-black font-mono text-emerald-400">
              {{ tournament.runStats.cleanSheets }} 🧤
            </p>
          </div>
          <div class="space-y-1 pt-2 sm:pt-0">
            <p class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
              Goals Scored / Conceded
            </p>
            <p class="text-lg font-black font-mono text-white">
              {{ tournament.runStats.totalGoalsFor }} : {{ tournament.runStats.totalGoalsAgainst }}
            </p>
          </div>
          <div class="space-y-1 pt-2 sm:pt-0">
            <p class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
              Yellow Cards
            </p>
            <p class="text-lg font-black font-mono text-amber-400">
              {{ tournament.runStats.totalYellowCards }} 🟨
            </p>
          </div>
          <div class="space-y-1 pt-2 sm:pt-0">
            <p class="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
              Red Cards
            </p>
            <p class="text-lg font-black font-mono text-rose-400">
              {{ tournament.runStats.totalRedCards }} 🟥
            </p>
          </div>
        </div>

        <!-- Detailed Squad Performance Table -->
        <div class="surface-card p-5 space-y-4 overflow-hidden">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
            <h3 class="text-sm font-bold font-mono uppercase tracking-widest text-zinc-300">
              Complete Squad Performance Table
            </h3>
            <span class="text-xs text-zinc-500 font-mono">11 Players</span>
          </div>

          <div class="overflow-x-auto custom-scroll">
            <table class="w-full text-left text-xs font-mono">
              <thead>
                <tr class="text-zinc-500 uppercase border-b border-white/5 pb-2">
                  <th class="py-2.5 px-2">
                    Player
                  </th>
                  <th class="py-2.5 px-2">
                    POS
                  </th>
                  <th class="py-2.5 px-2">
                    OVR
                  </th>
                  <th class="py-2.5 px-2 text-center">
                    P
                  </th>
                  <th class="py-2.5 px-2 text-center">
                    MIN
                  </th>
                  <th class="py-2.5 px-2 text-center text-emerald-400">
                    G
                  </th>
                  <th class="py-2.5 px-2 text-center text-sky-400">
                    A
                  </th>
                  <th class="py-2.5 px-2 text-center font-bold text-amber-400">
                    G+A
                  </th>
                  <th class="py-2.5 px-2 text-center text-amber-300">
                    🟨
                  </th>
                  <th class="py-2.5 px-2 text-center text-rose-400">
                    🟥
                  </th>
                  <th class="py-2.5 px-2 text-right text-emerald-400">
                    RATING
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-white/5">
                <tr
                  v-for="p in tournament.runStats.playerStats"
                  :key="p.player.id"
                  class="hover:bg-white/5 transition-colors"
                >
                  <td class="py-2.5 px-2 font-bold text-white flex items-center gap-2">
                    <CountryFlag
                      :country="p.player.country"
                      size="sm"
                    />
                    <span class="truncate max-w-[8rem] sm:max-w-[12rem]">{{ p.player.name }}</span>
                  </td>
                  <td class="py-2.5 px-2 text-zinc-400 font-semibold">
                    {{ p.player.primaryPosition }}
                  </td>
                  <td
                    class="py-2.5 px-2 font-black"
                    :class="p.player.stats.overall >= 90 ? 'text-gold-400' : 'text-zinc-300'"
                  >
                    {{ p.player.stats.overall }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-300">
                    {{ p.matches }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-400">
                    {{ p.minutes }}'
                  </td>
                  <td class="py-2.5 px-2 text-center font-black text-emerald-400">
                    {{ p.goals }}
                  </td>
                  <td class="py-2.5 px-2 text-center font-bold text-sky-400">
                    {{ p.assists }}
                  </td>
                  <td class="py-2.5 px-2 text-center font-black text-amber-400">
                    {{ p.ga }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-400">
                    {{ p.yellowCards }}
                  </td>
                  <td class="py-2.5 px-2 text-center text-zinc-400">
                    {{ p.redCards }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-black text-emerald-400">
                    {{ p.rating }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== SQUAD SHOWCASE (Pitch vs Cards) ==================== -->
      <div class="surface-card p-5 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/5">
          <div>
            <p class="text-xs text-zinc-400 uppercase font-mono tracking-widest font-bold">
              Drafted XI Lineup
            </p>
            <h3 class="text-base font-bold text-zinc-900 dark:text-white">
              {{ draft.formation?.id }} · {{ draft.teamName }}
            </h3>
          </div>

          <!-- View Toggle -->
          <div class="flex items-center p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              :class="squadViewMode === 'pitch' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'"
              @click="squadViewMode = 'pitch'"
            >
              🏟️ Tactical Pitch
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              :class="squadViewMode === 'cards' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'"
              @click="squadViewMode = 'cards'"
            >
              🎴 Player Cards
            </button>
          </div>
        </div>

        <!-- Pitch View with proper padding and non-overlapping slots -->
        <div
          v-if="squadViewMode === 'pitch'"
          class="w-full max-w-xl mx-auto h-[460px] py-2"
        >
          <FormationPitch
            :slots="draft.slots"
            :interactive="false"
            class="h-full"
          />
        </div>

        <!-- Cards View -->
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto custom-scroll pr-1"
        >
          <PlayerFoilCard
            v-for="p in draftedPlayersList"
            :key="p.id"
            :player="p"
            :is-compact="true"
          />
        </div>
      </div>

      <!-- ==================== COMPLETE TOURNAMENT MATCHES LIST ==================== -->
      <div class="space-y-4">
        <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
          Tournament Journey Recap
        </h2>

        <div class="space-y-3">
          <NuxtLink
            v-for="match in completedPlayerMatches"
            :key="match.id"
            :to="`/match/${match.id}`"
            class="surface-card p-4 flex items-center justify-between gap-4 block cursor-pointer transition-transform hover:-translate-y-0.5"
          >
            <div class="flex items-center gap-3.5 flex-1 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="md"
              />
              <div class="min-w-0">
                <p class="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">{{ match.phase.toUpperCase() }}</p>
                <p class="text-base font-bold text-zinc-900 dark:text-white truncate">
                  vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              <UBadge
                :color="matchResultColor(match)"
                variant="soft"
                size="md"
                class="font-mono font-bold"
              >
                {{ matchResultLabel(match) }}
              </UBadge>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-5 text-zinc-500"
              />
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
