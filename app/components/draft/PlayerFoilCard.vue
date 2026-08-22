<script setup lang="ts">
import type { Player } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

const props = defineProps<{
  player: Player
  isCompact?: boolean
  isInteractive?: boolean
}>()

const isLegend = computed(() => props.player.stats.overall >= 90)
const isElite = computed(() => props.player.stats.overall >= 85 && props.player.stats.overall < 90)

const ratingTierClass = computed(() => {
  if (isLegend.value) return 'text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/10 font-black'
  if (isElite.value) return 'text-emerald-800 dark:text-emerald-300 border-emerald-500/40 bg-emerald-500/10 font-black'
  return 'text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-zinc-800 font-bold'
})

const positionBadgeColor = computed(() => {
  const p = props.player.primaryPosition
  if (p === 'GK') return 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p)) return 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
  return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40'
})
</script>

<template>
  <div
    class="foil-card select-none"
    :class="[
      isLegend ? 'foil-card--legend' : '',
      isCompact ? 'p-3' : 'p-4',
      isInteractive ? 'cursor-pointer active:scale-[0.98]' : ''
    ]"
  >
    <!-- Top Row: OVR Rating + Nation Flag + Primary Position -->
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <!-- OVR Badge -->
      <div class="flex items-center gap-1.5">
        <span
          class="font-mono text-base px-2 py-0.5 rounded-md border"
          :class="ratingTierClass"
        >
          {{ player.stats.overall }}
        </span>
        <span
          class="text-xs font-bold font-mono px-1.5 py-0.5 rounded border uppercase"
          :class="positionBadgeColor"
        >
          {{ player.primaryPosition }}
        </span>
      </div>

      <!-- Country Flag & Year -->
      <div class="flex items-center gap-1.5 text-right">
        <span class="text-xs font-mono text-zinc-700 dark:text-zinc-300 font-bold">'{{ player.year }}</span>
        <CountryFlag
          :country="player.country"
          size="sm"
        />
      </div>
    </div>

    <!-- Player Name & Country Info -->
    <div class="mb-3">
      <h4
        class="font-black tracking-tight truncate text-zinc-900 dark:text-white"
        :class="[
          isCompact ? 'text-sm' : 'text-base',
          isLegend ? 'dark:drop-shadow-[0_1px_8px_rgba(251,191,36,0.3)]' : ''
        ]"
      >
        {{ player.name }}
      </h4>
      <p class="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider truncate">
        {{ player.countryName }}
      </p>
    </div>

    <!-- Stat Hexagon / Bar Grid (if not compact) -->
    <div
      v-if="!isCompact"
      class="grid grid-cols-6 gap-1 pt-2 border-t border-zinc-200 dark:border-white/8 text-center text-xs font-mono"
    >
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">PAC</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.pace }}</span>
      </div>
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">SHO</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.shooting }}</span>
      </div>
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">PAS</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.passing }}</span>
      </div>
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">DRI</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.dribbling }}</span>
      </div>
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">DEF</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.defending }}</span>
      </div>
      <div>
        <span class="block text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold">PHY</span>
        <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ player.stats.physical }}</span>
      </div>
    </div>
  </div>
</template>
