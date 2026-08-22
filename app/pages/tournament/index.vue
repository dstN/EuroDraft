<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import PlayerFoilCard from '~/components/draft/PlayerFoilCard.vue'

definePageMeta({ layout: 'default' })

const tournament = useTournamentStore()
const draft = useDraftStore()

// Squad view tab: 'pitch' | 'cards'
const squadViewMode = ref<'pitch' | 'cards'>('pitch')

// Auto-simulation timer
const isAutoSimulating = ref(true)
let simTimer: ReturnType<typeof setInterval> | null = null

// Auto-init tournament on mount if draft is complete
onMounted(() => {
  if (!draft.isComplete) {
    navigateTo('/draft/formation')
    return
  }
  if (tournament.groups.length === 0) {
    tournament.initTournament()
    startAutoSimulation()
  } else if (tournament.simulationStep === 0) {
    startAutoSimulation()
  }
})

onUnmounted(() => {
  if (simTimer !== null) clearInterval(simTimer)
})

function startAutoSimulation() {
  if (simTimer !== null) clearInterval(simTimer)
  isAutoSimulating.value = true

  simTimer = setInterval(() => {
    if (tournament.simulationStep < 6) {
      tournament.advanceSimulationStep()
    } else {
      isAutoSimulating.value = false
      if (simTimer !== null) clearInterval(simTimer)
    }
  }, 1000)
}

function pauseSimulation() {
  isAutoSimulating.value = false
  if (simTimer !== null) {
    clearInterval(simTimer)
    simTimer = null
  }
}

function resumeSimulation() {
  startAutoSimulation()
}

function skipAll() {
  pauseSimulation()
  tournament.skipAllSimulation()
}

const simulationStageLabel = computed(() => {
  switch (tournament.simulationStep) {
    case 0: return 'Tournament Setup'
    case 1: return 'Simulating Matchday 1 of 3...'
    case 2: return 'Simulating Matchday 2 of 3...'
    case 3: return 'Simulating Matchday 3 of 3 (Group Finale)...'
    case 4: return 'Simulating Quarter-Finals...'
    case 5: return 'Simulating Semi-Finals...'
    case 6: return 'Final Whistle · Tournament Complete'
    default: return 'Tournament Complete'
  }
})

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
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1.5 text-left">
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
        <p class="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
          {{ draft.formation?.label }} Formation · Squad Rating: <strong class="font-mono text-emerald-500 dark:text-emerald-400">{{ draft.teamOVR }} OVR</strong>
        </p>
      </div>

      <!-- Play / Pause / Skip Simulation Controls -->
      <div class="flex items-center gap-2">
        <UButton
          v-if="tournament.simulationStep < 6"
          size="sm"
          variant="solid"
          color="primary"
          leading-icon="i-lucide-fast-forward"
          label="Skip Animation"
          class="rounded-full px-4 font-bold shadow-md shadow-emerald-500/20"
          @click="skipAll"
        />
        <UButton
          v-if="tournament.simulationStep < 6 && isAutoSimulating"
          size="sm"
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-pause"
          label="Pause"
          class="rounded-full font-semibold"
          @click="pauseSimulation"
        />
        <UButton
          v-else-if="tournament.simulationStep < 6 && !isAutoSimulating"
          size="sm"
          variant="outline"
          color="neutral"
          leading-icon="i-lucide-play"
          label="Resume"
          class="rounded-full font-semibold"
          @click="resumeSimulation"
        />
      </div>
    </div>

    <!-- Live Simulation Progress HUD Banner -->
    <div
      v-if="tournament.simulationStep < 6"
      class="bezel-card animate-pulse"
    >
      <div class="bezel-inner p-4 space-y-3">
        <div class="flex items-center justify-between text-xs font-mono font-bold">
          <span class="text-emerald-400 flex items-center gap-2">
            <span class="size-2 rounded-full bg-emerald-400 animate-ping" />
            {{ simulationStageLabel }}
          </span>
          <span class="text-zinc-400">Step {{ tournament.simulationStep }} / 6</span>
        </div>
        <UProgress
          :value="tournament.simulationStep"
          :max="6"
          color="primary"
          class="h-2 rounded-full"
        />
      </div>
    </div>

    <!-- ==================== SQUAD SHOWCASE (Pitch vs Cards) ==================== -->
    <div class="bezel-card">
      <div class="bezel-inner p-5 space-y-4">
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

        <!-- Pitch View -->
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
    </div>

    <!-- ==================== GROUP STAGE SECTION ==================== -->
    <div
      v-if="tournament.simulationStep >= 1"
      class="space-y-6"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
          {{ $t('tournament.group_stage') }}
        </h2>
        <span class="text-xs font-mono text-zinc-500">
          {{ tournament.simulationStep < 3 ? `Matchday ${tournament.simulationStep} of 3` : 'Group Stage Complete' }}
        </span>
      </div>

      <!-- Group matches for player's group -->
      <div class="space-y-3">
        <NuxtLink
          v-for="match in tournament.playerMatches.filter(m => m.phase === 'group')"
          :key="match.id"
          :to="`/match/${match.id}`"
          class="bezel-card block cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <div class="bezel-inner p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3.5 flex-1 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="md"
              />
              <div class="min-w-0">
                <p class="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">Group Stage</p>
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
          </div>
        </NuxtLink>
      </div>

      <!-- Player's group standing table -->
      <div
        v-if="tournament.groups.length"
        class="bezel-card overflow-hidden"
      >
        <div class="bezel-inner p-5 space-y-4">
          <div class="pb-2 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between">
            <p class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              Group {{ tournament.groups.find(g => g.teams.some(t => t.id === tournament.playerTeam?.id))?.id }} Standings
            </p>
            <span class="text-[10px] font-mono text-zinc-500 font-semibold">Top 2 Qualify for Knockouts</span>
          </div>
          <div
            v-for="group in tournament.groups.filter(g => g.teams.some(t => t.id === tournament.playerTeam?.id))"
            :key="group.id"
            class="divide-y divide-zinc-200 dark:divide-white/5"
          >
            <div
              v-for="(standing, rank) in group.standings"
              :key="standing.team.id"
              class="flex items-center gap-3.5 py-3 text-sm transition-all"
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
    </div>

    <!-- ==================== KNOCKOUT ROUNDS SECTION ==================== -->
    <div
      v-if="tournament.simulationStep >= 4 && tournament.playerMatches.some(m => m.phase !== 'group')"
      class="space-y-6"
    >
      <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
        Knockout Stage
      </h2>

      <div class="space-y-3">
        <NuxtLink
          v-for="match in tournament.playerMatches.filter(m => m.phase !== 'group')"
          :key="match.id"
          :to="`/match/${match.id}`"
          class="bezel-card block cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <div class="bezel-inner p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3.5 flex-1 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="md"
              />
              <div class="min-w-0">
                <p class="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mb-0.5">{{ match.phase }}</p>
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
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- ==================== CHAMPION / ELIMINATED BANNER ==================== -->
    <div
      v-if="tournament.simulationStep >= 6"
      class="bezel-card"
    >
      <div
        class="bezel-inner p-10 text-center space-y-6"
        :class="tournament.isChampion ? 'bg-gradient-to-b from-amber-500/15 via-transparent to-transparent border border-gold-500/40' : ''"
      >
        <div v-if="tournament.isChampion">
          <UIcon
            name="i-lucide-trophy"
            class="size-16 mx-auto mb-4 text-gold-400 animate-bounce"
          />
          <h2 class="gold-text text-3xl sm:text-5xl font-black mb-2">
            {{ $t('results.champion_title') }}
          </h2>
          <p class="text-zinc-300 max-w-md mx-auto">
            {{ $t('results.champion_subtitle') }}
          </p>
        </div>
        <div v-else>
          <UIcon
            name="i-lucide-flag-off"
            class="size-14 mx-auto mb-4 text-zinc-500"
          />
          <h2 class="text-3xl font-black text-zinc-900 dark:text-white mb-2">
            {{ $t('results.eliminated_title') }}
          </h2>
          <p class="text-zinc-400">
            {{ $t('results.eliminated_subtitle', { phase: tournament.playerMatches.at(-1)?.phase }) }}
          </p>
        </div>

        <div class="pt-4">
          <UButton
            to="/draft/formation"
            color="primary"
            size="lg"
            :label="$t('results.play_again')"
            leading-icon="i-lucide-refresh-cw"
            class="rounded-full px-8 font-bold"
            @click="tournament.reset(); useDraftStore().resetDraft()"
          />
        </div>
      </div>
    </div>
  </div>
</template>
