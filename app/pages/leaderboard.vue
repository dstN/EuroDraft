<script setup lang="ts">
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })

interface LeaderboardEntry {
  id: number
  teamName: string
  teamEmblem: string
  formation: string
  ovr: number
  defRating: number
  midRating: number
  attRating: number
  outcome: string
  shareId: string | null
  submittedAt: string
}

const { data, pending } = await useFetch<{ success: boolean, configured: boolean, entries: LeaderboardEntry[] }>('/api/leaderboard', {
  query: { limit: 50 }
})

const configured = computed(() => data.value?.configured ?? false)
const entries = computed(() => data.value?.entries ?? [])

const OUTCOME_LABELS: Record<string, string> = {
  winner: '🏆 Champions',
  runner_up: '🥈 Runner-Up',
  semi_final: '🥉 Semi-Final',
  quarter_final: 'Quarter-Final',
  group_stage: 'Group Stage'
}

function outcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? outcome
}

function medalFor(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-3 sm:px-6 space-y-6">
    <div class="text-center space-y-2 pt-2">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
        Global Leaderboard
      </div>
      <h1 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        Highest-Rated Dream XIs
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm max-w-lg mx-auto">
        Submit your squad's score when you share a tournament run to see it ranked here.
      </p>
    </div>

    <div
      v-if="pending"
      class="text-center py-16"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 text-emerald-500 animate-spin mx-auto"
      />
    </div>

    <div
      v-else-if="!configured"
      class="surface-card p-10 text-center space-y-3 max-w-lg mx-auto"
    >
      <UIcon
        name="i-lucide-trophy"
        class="size-10 text-zinc-500 mx-auto"
      />
      <h2 class="text-lg font-bold text-zinc-900 dark:text-white">
        Leaderboard Coming Soon
      </h2>
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        The leaderboard isn't live on this server yet. Check back soon!
      </p>
    </div>

    <div
      v-else-if="entries.length === 0"
      class="surface-card p-10 text-center space-y-3 max-w-lg mx-auto"
    >
      <UIcon
        name="i-lucide-trophy"
        class="size-10 text-zinc-500 mx-auto"
      />
      <h2 class="text-lg font-bold text-zinc-900 dark:text-white">
        No Entries Yet
      </h2>
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        Be the first to submit your squad's score after a tournament run!
      </p>
      <NuxtLink
        to="/draft/formation"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
      >
        <span>Start Drafting</span>
      </NuxtLink>
    </div>

    <div
      v-else
      class="surface-card overflow-hidden"
    >
      <div
        v-for="(entry, idx) in entries"
        :key="entry.id"
        class="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-white/5 last:border-0"
        :class="idx < 3 ? 'bg-amber-500/5 dark:bg-amber-950/20' : ''"
      >
        <span class="w-8 text-center font-mono font-black text-sm text-zinc-600 dark:text-zinc-400 shrink-0">
          {{ medalFor(idx + 1) || `#${idx + 1}` }}
        </span>
        <CountryFlag
          :country="entry.teamEmblem || 'eu'"
          size="sm"
          class="shrink-0"
        />
        <div class="flex-1 min-w-0">
          <NuxtLink
            v-if="entry.shareId"
            :to="`/r/${entry.shareId}`"
            class="font-bold text-sm text-zinc-900 dark:text-white truncate block hover:underline"
          >
            {{ entry.teamName }}
          </NuxtLink>
          <p
            v-else
            class="font-bold text-sm text-zinc-900 dark:text-white truncate"
          >
            {{ entry.teamName }}
          </p>
          <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
            {{ entry.formation }} · {{ outcomeLabel(entry.outcome) }}
          </p>
        </div>
        <span class="font-mono font-black text-lg text-emerald-700 dark:text-emerald-400 shrink-0">
          {{ entry.ovr }}
        </span>
      </div>
    </div>
  </div>
</template>
