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
  if (isLegend.value) return 'text-gold-400 border-gold-500/40 bg-gold-500/10'
  if (isElite.value) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
  return 'text-slate-300 border-slate-700 bg-slate-800/60'
})

const positionBadgeColor = computed(() => {
  const p = props.player.primaryPosition
  if (p === 'GK') return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p)) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
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
          class="font-mono text-base font-black px-2 py-0.5 rounded-md border"
          :class="ratingTierClass"
        >
          {{ player.stats.overall }}
        </span>
        <span
          class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase"
          :class="positionBadgeColor"
        >
          {{ player.primaryPosition }}
        </span>
      </div>

      <!-- Country Flag & Year -->
      <div class="flex items-center gap-1.5 text-right">
        <span class="text-[11px] font-mono text-zinc-400 font-bold">'{{ player.year }}</span>
        <CountryFlag
          :country="player.country"
          size="sm"
        />
      </div>
    </div>

    <!-- Player Name & Country Info -->
    <div class="mb-3">
      <h4
        class="font-black tracking-tight truncate"
        :class="[
          isCompact ? 'text-sm' : 'text-base',
          isLegend ? 'text-white drop-shadow-[0_1px_8px_rgba(251,191,36,0.3)]' : 'text-zinc-100'
        ]"
      >
        {{ player.name }}
      </h4>
      <p class="text-[10px] font-medium text-zinc-400 uppercase tracking-wider truncate">
        {{ player.countryName }}
      </p>
    </div>

    <!-- Stat Hexagon / Bar Grid (if not compact) -->
    <div
      v-if="!isCompact"
      class="grid grid-cols-6 gap-1 pt-2 border-t border-white/8 text-center text-[10px] font-mono"
    >
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">PAC</span>
        <span class="font-bold text-zinc-200">{{ player.stats.pace }}</span>
      </div>
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">SHO</span>
        <span class="font-bold text-zinc-200">{{ player.stats.shooting }}</span>
      </div>
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">PAS</span>
        <span class="font-bold text-zinc-200">{{ player.stats.passing }}</span>
      </div>
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">DRI</span>
        <span class="font-bold text-zinc-200">{{ player.stats.dribbling }}</span>
      </div>
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">DEF</span>
        <span class="font-bold text-zinc-200">{{ player.stats.defending }}</span>
      </div>
      <div>
        <span class="block text-zinc-500 text-[8px] uppercase">PHY</span>
        <span class="font-bold text-zinc-200">{{ player.stats.physical }}</span>
      </div>
    </div>
  </div>
</template>
