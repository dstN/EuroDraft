<script setup lang="ts">
import type { Group } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

defineProps<{
  group: Group
  playerTeamId: string | undefined
  standing: { rank: number, standing: Group['standings'][number] } | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })
</script>

<template>
  <div class="surface-card overflow-hidden shadow-lg">
    <!-- Collapsible Header Banner -->
    <button
      type="button"
      class="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-white/[0.02] transition-colors select-none"
      @click="isOpen = !isOpen"
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
            <span>Group {{ group.id }} Standings</span>
            <span
              v-if="standing"
              class="text-xs font-mono px-2 py-0.5 rounded-md font-bold"
              :class="standing.rank <= 2 ? 'bg-emerald-500/20 text-emerald-950 dark:text-emerald-200' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'"
            >
              {{ standing.rank }}. Place · {{ standing.standing.points }} Pts
            </span>
          </h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {{ isOpen ? 'Top 2 teams advance to the knockout stage' : 'Click to expand group table' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hidden sm:inline">
          {{ isOpen ? 'Collapse' : 'Expand' }}
        </span>
        <UIcon
          :name="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-5 text-zinc-700 dark:text-zinc-300"
        />
      </div>
    </button>

    <!-- Table Body -->
    <div
      v-if="isOpen"
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
          v-for="(rowStanding, rank) in group.standings"
          :key="rowStanding.team.id"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-all"
          :class="rowStanding.team.id === playerTeamId
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
            :country="rowStanding.team.country"
            size="sm"
          />

          <!-- Team Name + Tag (untruncated on mobile) -->
          <div class="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
            <span class="font-bold text-zinc-900 dark:text-white truncate">
              {{ rowStanding.team.countryName }}
            </span>
            <span
              v-if="rowStanding.team.id === playerTeamId"
              class="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 font-black tracking-wide shrink-0"
            >
              YOU
            </span>
            <span
              v-else
              class="text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold shrink-0"
            >
              '{{ String(rowStanding.team.year).slice(-2) }}
            </span>
          </div>

          <!-- Stats (Compact aligned columns) -->
          <div class="flex gap-2 sm:gap-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold shrink-0 text-right">
            <span class="w-4 text-center">{{ rowStanding.played }}</span>
            <span class="w-6 text-center text-zinc-900 dark:text-white font-black">{{ rowStanding.points }}</span>
            <span class="w-8 text-right">{{ rowStanding.goalsFor }}:{{ rowStanding.goalsAgainst }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
