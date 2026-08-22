<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

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
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-10">
    <!-- Header -->
    <div class="space-y-1">
      <h1 class="text-2xl font-bold text-white tracking-tight">
        {{ $t('tournament.your_journey') }}
      </h1>
      <p class="text-zinc-400 text-sm">
        {{ tournament.playerTeam?.countryName }} · OVR {{ tournament.playerTeam?.averageOVR }}
      </p>
    </div>

    <!-- My Squad Pitch & List -->
    <div
      class="rounded-2xl border border-white/10 p-4 space-y-4"
      style="background: rgba(255,255,255,0.02)"
    >
      <div class="flex items-center justify-between">
        <p class="text-xs text-zinc-400 uppercase font-mono tracking-widest">
          {{ draft.formation?.id }} Formation
        </p>
        <span class="text-xs font-mono text-emerald-400 font-bold">
          Team OVR {{ draft.teamOVR }}
        </span>
      </div>
      <FormationPitch
        :slots="draft.slots"
        :interactive="false"
      />
    </div>

    <!-- Journey: stacked match + table flow -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-white">
        {{ $t('tournament.group_stage') }}
      </h2>

      <!-- Group matches for player's group -->
      <div class="space-y-2">
        <NuxtLink
          v-for="match in tournament.playerMatches.filter(m => m.phase === 'group')"
          :key="match.id"
          :to="`/match/${match.id}`"
          class="block rounded-xl border p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          :class="`border-${matchResultColor(match)}-500/30`"
          :style="`background: rgba(${matchResultColor(match) === 'success' ? '16,185,129' : matchResultColor(match) === 'error' ? '239,68,68' : '245,158,11'},0.05)`"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="md"
              />
              <div class="min-w-0">
                <p class="text-xs text-zinc-500 uppercase tracking-[0.1em] mb-0.5">{{ match.phase }}</p>
                <p class="text-sm font-semibold text-white truncate">
                  vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UBadge
                :color="matchResultColor(match)"
                variant="soft"
                size="sm"
              >
                {{ matchResultLabel(match) }}
              </UBadge>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 text-zinc-500"
              />
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Player's group standing -->
      <div
        v-if="tournament.groups.length"
        class="rounded-xl border border-white/8 overflow-hidden"
        style="background: rgba(255,255,255,0.02)"
      >
        <div class="px-4 py-3 border-b border-white/6">
          <p class="text-xs text-zinc-500 uppercase tracking-[0.12em]">
            Group {{ tournament.groups.find(g => g.teams.some(t => t.id === tournament.playerTeam?.id))?.id }} Standings
          </p>
        </div>
        <div
          v-for="group in tournament.groups.filter(g => g.teams.some(t => t.id === tournament.playerTeam?.id))"
          :key="group.id"
          class="divide-y divide-white/5"
        >
          <div
            v-for="(standing, rank) in group.standings"
            :key="standing.team.id"
            class="flex items-center gap-3 px-4 py-2.5 text-sm"
            :class="standing.team.id === tournament.playerTeam?.id ? 'bg-primary-500/8' : ''"
          >
            <span class="w-5 font-mono text-zinc-500 text-xs">{{ rank + 1 }}</span>
            <CountryFlag
              :country="standing.team.country"
              size="xs"
            />
            <span
              class="flex-1 text-white font-medium"
              :class="standing.team.isPlayerTeam ? 'text-primary-300' : ''"
            >
              {{ standing.team.countryName }}
              <span class="text-zinc-500 text-xs">'{{ standing.team.year }}</span>
            </span>
            <div class="flex gap-4 font-mono text-xs text-zinc-400">
              <span>{{ standing.played }}P</span>
              <span class="text-white font-bold">{{ standing.points }}pts</span>
              <span>{{ standing.goalsFor }}:{{ standing.goalsAgainst }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Knockout phase -->
    <div
      v-if="tournament.playerMatches.some(m => m.phase !== 'group')"
      class="space-y-4"
    >
      <h2 class="text-lg font-semibold text-white">
        Knockout Rounds
      </h2>

      <div class="space-y-2">
        <NuxtLink
          v-for="match in tournament.playerMatches.filter(m => m.phase !== 'group')"
          :key="match.id"
          :to="`/match/${match.id}`"
          class="block rounded-xl border p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          :class="`border-${matchResultColor(match)}-500/30`"
          :style="`background: rgba(${matchResultColor(match) === 'success' ? '16,185,129' : '239,68,68'},0.05)`"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <CountryFlag
                :country="opponentTeam(match).country"
                size="md"
              />
              <div class="min-w-0">
                <p class="text-xs text-zinc-500 uppercase tracking-[0.1em] mb-0.5">{{ match.phase }}</p>
                <p class="text-sm font-semibold text-white truncate">
                  vs {{ opponentTeam(match).countryName }} '{{ opponentTeam(match).year }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UBadge
                :color="matchResultColor(match)"
                variant="soft"
                size="sm"
              >
                {{ matchResultLabel(match) }}
              </UBadge>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 text-zinc-500"
              />
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Champion / Eliminated banner -->
    <div
      v-if="tournament.tournamentPhase === 'complete'"
      class="rounded-2xl border p-8 text-center"
      :class="tournament.isChampion ? 'border-yellow-500/40' : 'border-zinc-700'"
      :style="tournament.isChampion ? 'background: rgba(245,158,11,0.08)' : 'background: rgba(255,255,255,0.02)'"
    >
      <div v-if="tournament.isChampion">
        <UIcon
          name="i-lucide-trophy"
          class="size-12 mx-auto mb-4 text-yellow-400"
        />
        <h2 class="gold-text text-3xl font-bold mb-2">
          {{ $t('results.champion_title') }}
        </h2>
        <p class="text-zinc-400">
          {{ $t('results.champion_subtitle') }}
        </p>
      </div>
      <div v-else>
        <UIcon
          name="i-lucide-flag-off"
          class="size-12 mx-auto mb-4 text-zinc-500"
        />
        <h2 class="text-2xl font-bold text-white mb-2">
          {{ $t('results.eliminated_title') }}
        </h2>
        <p class="text-zinc-400">
          {{ $t('results.eliminated_subtitle', { phase: tournament.playerMatches.at(-1)?.phase }) }}
        </p>
      </div>

      <div class="mt-6">
        <UButton
          to="/draft/formation"
          color="primary"
          :label="$t('results.play_again')"
          leading-icon="i-lucide-refresh-cw"
          @click="tournament.reset(); useDraftStore().resetDraft()"
        />
      </div>
    </div>
  </div>
</template>
