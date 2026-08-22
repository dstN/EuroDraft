<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'

definePageMeta({ layout: 'default' })

const tournament = useTournamentStore()
const draft = useDraftStore()

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
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
    <!-- Header -->
    <div class="space-y-2 text-left">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono tracking-[0.2em] font-bold">
        Championship Stage
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('tournament.your_journey') }}
      </h1>
      <p class="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
        {{ tournament.playerTeam?.countryName }} · Team Rating {{ tournament.playerTeam?.averageOVR }} OVR · {{ draft.formation?.id }}
      </p>
    </div>

    <!-- My Squad Pitch & List (Collapsible / Showcase) -->
    <div class="bezel-card">
      <div class="bezel-inner p-5 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
          <p class="text-xs text-zinc-400 uppercase font-mono tracking-widest font-bold">
            Drafted XI · {{ draft.formation?.id }} Formation
          </p>
          <span class="text-xs font-mono text-emerald-400 font-black">
            Team OVR {{ draft.teamOVR }}
          </span>
        </div>
        <div class="h-[360px]">
          <FormationPitch
            :slots="draft.slots"
            :interactive="false"
          />
        </div>
      </div>
    </div>

    <!-- Journey: stacked match + table flow -->
    <div class="space-y-6">
      <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('tournament.group_stage') }}
      </h2>

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

      <!-- Player's group standing -->
      <div
        v-if="tournament.groups.length"
        class="bezel-card overflow-hidden"
      >
        <div class="bezel-inner p-5 space-y-4">
          <div class="pb-2 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between">
            <p class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
              Group {{ tournament.groups.find(g => g.teams.some(t => t.id === tournament.playerTeam?.id))?.id }} Standings
            </p>
            <span class="text-[10px] font-mono text-zinc-500">Top 2 Qualify</span>
          </div>
          <div
            v-for="group in tournament.groups.filter(g => g.teams.some(t => t.id === tournament.playerTeam?.id))"
            :key="group.id"
            class="divide-y divide-zinc-200 dark:divide-white/5"
          >
            <div
              v-for="(standing, rank) in group.standings"
              :key="standing.team.id"
              class="flex items-center gap-3.5 py-3 text-sm"
              :class="standing.team.id === tournament.playerTeam?.id ? 'bg-emerald-500/10 dark:bg-emerald-950/40 px-3 rounded-xl border border-emerald-500/30' : ''"
            >
              <span class="w-5 font-mono text-zinc-500 text-xs font-bold">{{ rank + 1 }}</span>
              <CountryFlag
                :country="standing.team.country"
                size="sm"
              />
              <span
                class="flex-1 font-bold"
                :class="standing.team.isPlayerTeam ? 'text-emerald-500 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'"
              >
                {{ standing.team.countryName }}
                <span class="text-zinc-500 text-xs font-mono font-normal">'{{ standing.team.year }}</span>
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

    <!-- Knockout phase -->
    <div
      v-if="tournament.playerMatches.some(m => m.phase !== 'group')"
      class="space-y-6"
    >
      <h2 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
        Knockout Rounds
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

    <!-- Champion / Eliminated banner -->
    <div
      v-if="tournament.tournamentPhase === 'complete'"
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
