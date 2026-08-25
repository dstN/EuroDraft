<script setup lang="ts">
import type { MatchResult, Player } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import TournamentGroupTable from '~/components/tournament/TournamentGroupTable.vue'
import TournamentMatchList from '~/components/tournament/TournamentMatchList.vue'
import TournamentOutcomeBanner from '~/components/tournament/TournamentOutcomeBanner.vue'
import TournamentSquadOverview from '~/components/tournament/TournamentSquadOverview.vue'
import TournamentPlayerStatsTable from '~/components/tournament/TournamentPlayerStatsTable.vue'
import TournamentShareModal from '~/components/tournament/TournamentShareModal.vue'
import PlayerStatCardModal from '~/components/draft/PlayerStatCardModal.vue'

definePageMeta({ layout: 'default', middleware: ['ensure-database'] })

const tournament = useTournamentStore()
const draft = useDraftStore()
const localePath = useLocalePath()
const appLoading = useAppLoading()

const {
  tournamentOutcome,
  squadLineRatings,
  playerGroup,
  playerGroupStanding,
  sortField,
  sortOrder,
  setSort,
  sortedPlayerStats,
  opponentTeam,
  matchResultLabel,
  matchResultBadgeClass,
  getNotableMatchEvents
} = useTournamentResults()

// Player stat inspection modal state
const inspectedPlayer = ref<Player | null>(null)
const isStatModalOpen = ref(false)

function inspectPlayer(player: Player) {
  inspectedPlayer.value = player
  isStatModalOpen.value = true
}

// Share modal state
const isShareModalOpen = ref(false)

// Closed initially so the user decides when to open it; force-closed when
// skipping to results since that section makes the standings redundant
const isGroupTableOpen = ref(false)

// Auto-init tournament on mount if draft is complete
onMounted(() => {
  if (!draft.isComplete) {
    navigateTo(localePath('/draft/formation'))
    return
  }
  if (tournament.groups.length === 0) {
    tournament.initTournament()
    // Save a local snapshot once per completed run (this branch only runs on a
    // genuinely new tournament, not on revisiting an already-initialized one --
    // see app/utils/draftHistory.ts for why this can't create duplicates)
    saveDraftToHistory({
      teamName: draft.teamName || 'Dream XI',
      teamEmblem: draft.teamEmblem || 'eu',
      formation: draft.formation?.id || '4-3-3',
      teamOVR: draft.teamOVR,
      outcome: tournamentOutcome.value,
      lineRatings: squadLineRatings.value,
      runStats: tournament.runStats,
      squad: tournament.playerTeam?.squad || [],
      matches: tournament.playerMatches
    })
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

function restartDraft() {
  tournament.reset()
  draft.resetDraft()
  navigateTo(localePath('/draft/formation'))
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1 text-left">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
          {{ $t('tournament.continental_simulation_badge') }}
        </div>
        <h1 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-3">
          <CountryFlag
            :country="draft.teamEmblem || 'eu'"
            size="md"
          />
          <span>{{ draft.teamName || 'Dream XI' }}</span>
        </h1>
        <p class="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold">
          {{ $t('tournament.formation_squad_rating', { formation: draft.formation?.label, ovr: draft.teamOVR }) }}
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
          <span>{{ $t('tournament.skip_to_results') }}</span>
        </button>
      </div>
    </div>

    <!-- 1. Group Stage Standings -->
    <TournamentGroupTable
      v-if="playerGroup"
      v-model:open="isGroupTableOpen"
      :group="playerGroup"
      :player-team-id="tournament.playerTeam?.id"
      :standing="playerGroupStanding"
    />

    <!-- 2. Group Matches (Chronological MD1, MD2, MD3) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-calendar-days"
            class="size-5 text-emerald-600 dark:text-emerald-400"
          />
          <span>{{ $t('tournament.group_stage_matches') }}</span>
        </h2>
        <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
          {{ $t('tournament.matchday_of_3', { n: Math.min(3, tournament.simulationStep + (activePlayerMatch?.phase === 'group' ? 1 : 0)) }) }}
        </span>
      </div>

      <TournamentMatchList
        v-if="tournament.playerTeam"
        variant="group"
        :matches="completedGroupMatches"
        :active-match="activePlayerMatch?.phase === 'group' ? activePlayerMatch : null"
        :player-team-id="tournament.playerTeam.id"
        :opponent-team="opponentTeam"
        :match-result-label="matchResultLabel"
        :match-result-badge-class="matchResultBadgeClass"
        :get-notable-match-events="getNotableMatchEvents"
        @completed="onLiveMatchCompleted"
      />
    </div>

    <!-- 3. Knockout Matches (Quarter-Final, Semi-Final, Final) -->
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
          <span>{{ $t('tournament.knockout_stage_matches') }}</span>
        </h2>
      </div>

      <TournamentMatchList
        v-if="tournament.playerTeam"
        variant="knockout"
        :matches="completedKnockoutMatches"
        :active-match="activePlayerMatch && activePlayerMatch.phase !== 'group' ? activePlayerMatch : null"
        :player-team-id="tournament.playerTeam.id"
        :opponent-team="opponentTeam"
        :match-result-label="matchResultLabel"
        :match-result-badge-class="matchResultBadgeClass"
        :get-notable-match-events="getNotableMatchEvents"
        @completed="onLiveMatchCompleted"
      />
    </div>

    <!-- 4-6. Results & Outcome, Squad Overview, Player Stats -->
    <div
      v-if="isSimulationCompleted"
      class="space-y-8 animate-fade-in"
    >
      <TournamentOutcomeBanner
        :outcome="tournamentOutcome"
        @play-again="restartDraft"
        @share="isShareModalOpen = true"
      />

      <TournamentSquadOverview
        :formation-id="draft.formation?.id"
        :line-ratings="squadLineRatings"
        :slots="draft.slots"
        :run-stats="tournament.runStats"
        @inspect-player="inspectPlayer"
      />

      <TournamentPlayerStatsTable
        v-if="tournament.runStats"
        :run-stats="tournament.runStats"
        :sorted-player-stats="sortedPlayerStats"
        :sort-field="sortField"
        :sort-order="sortOrder"
        :set-sort="setSort"
        @inspect-player="inspectPlayer"
      />
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
