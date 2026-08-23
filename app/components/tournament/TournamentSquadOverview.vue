<script setup lang="ts">
import type { DraftSlot, Player, TournamentRunStats } from '~/types'
import FormationPitch from '~/components/draft/FormationPitch.vue'

defineProps<{
  formationId: string | undefined
  lineRatings: { def: number, mid: number, att: number, overall: number }
  slots: DraftSlot[]
  runStats: TournamentRunStats | null
}>()

const emit = defineEmits<{
  inspectPlayer: [player: Player]
}>()
</script>

<template>
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
        <strong class="text-emerald-700 dark:text-emerald-400 font-black font-mono">{{ formationId }}</strong>
      </span>
    </div>

    <!-- 4 Positional Line Average OVR / GES Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <!-- Defense (GK + Def) Avg GES -->
      <div class="surface-card p-4 space-y-1 text-center">
        <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">DEF (GK+Def)</span>
        <p class="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
          {{ lineRatings.def }} <span class="text-xs text-zinc-500 font-bold">GES</span>
        </p>
      </div>

      <!-- Midfield Avg GES -->
      <div class="surface-card p-4 space-y-1 text-center">
        <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">MID Avg</span>
        <p class="text-2xl font-black font-mono text-sky-700 dark:text-sky-400">
          {{ lineRatings.mid }} <span class="text-xs text-zinc-500 font-bold">GES</span>
        </p>
      </div>

      <!-- Attacking Avg GES -->
      <div class="surface-card p-4 space-y-1 text-center">
        <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">ATT Avg</span>
        <p class="text-2xl font-black font-mono text-amber-700 dark:text-amber-400">
          {{ lineRatings.att }} <span class="text-xs text-zinc-500 font-bold">GES</span>
        </p>
      </div>

      <!-- Overall GES -->
      <div class="surface-card p-4 space-y-1 text-center">
        <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-700 dark:text-zinc-300">Overall GES</span>
        <p class="text-2xl font-black font-mono text-zinc-900 dark:text-white">
          {{ lineRatings.overall }} <span class="text-xs text-zinc-500 font-bold">GES</span>
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
          :slots="slots"
          :interactive="false"
          class="h-full"
          @inspect-player="emit('inspectPlayer', $event)"
        />
      </div>
    </div>

    <!-- Tournament Performance Metric Cards (4 Distinct Tiles, No Awkward Wrapping) -->
    <div
      v-if="runStats"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
    >
      <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
        <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
          Matches Played
        </p>
        <p class="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
          {{ runStats.totalMatches }}
        </p>
      </div>

      <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
        <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
          Goals (F : A)
        </p>
        <p class="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
          {{ runStats.totalGoalsFor }} : {{ runStats.totalGoalsAgainst }}
        </p>
      </div>

      <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
        <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
          Goals / Match
        </p>
        <p class="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
          {{ (runStats.totalGoalsFor / runStats.totalMatches).toFixed(2) }}
        </p>
      </div>

      <div class="surface-card p-3.5 sm:p-4 text-center space-y-1">
        <p class="text-[11px] uppercase font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
          Clean Sheets & Cards
        </p>
        <p class="text-xs sm:text-sm font-black font-mono text-zinc-900 dark:text-white pt-1">
          {{ runStats.cleanSheets }} 🧤 · {{ runStats.totalYellowCards }} 🟨 · {{ runStats.totalRedCards }} 🟥
        </p>
      </div>
    </div>
  </div>
</template>
