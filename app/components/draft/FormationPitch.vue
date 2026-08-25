<script setup lang="ts">
import type { DraftSlot, Player } from '~/types'
import { getPitchCoordinates, samePositionIndex } from '~/utils/pitchLayout'

const props = defineProps<{
  slots: DraftSlot[]
  activeSlotId?: string | null
  highlightedSlotIds?: string[]
  highlightedPositions?: string[]
  pulseSlotId?: string | null
  interactive?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-slot', slot: DraftSlot): void
  (e: 'inspect-player', player: Player): void
}>()

function handleSlotClick(slot: DraftSlot) {
  if (slot.player) {
    emit('inspect-player', slot.player)
  }
  emit('select-slot', slot)
}

function isSlotHighlighted(slot: DraftSlot): boolean {
  if (props.highlightedSlotIds && props.highlightedSlotIds.length > 0) {
    return props.highlightedSlotIds.includes(slot.id)
  }
  if (props.highlightedPositions && props.highlightedPositions.length > 0) {
    return props.highlightedPositions.includes(slot.position) && !slot.player
  }
  return false
}

// Pitch layout coordinate mapping based on position type and index (zero-overlap staggered layout)
function getSlotStyle(slot: DraftSlot, _index: number, _total: number) {
  const allSlots = props.slots
  const positions = allSlots.map(s => s.position)
  const slotIdx = allSlots.findIndex(s => s.id === slot.id)
  const { sameIndex, sameCount } = samePositionIndex(slot.position, slotIdx, positions)

  const { top, left } = getPitchCoordinates(slot.position, sameIndex, sameCount, {
    hasCDM: allSlots.some(s => s.position === 'CDM'),
    hasCM: allSlots.some(s => s.position === 'CM'),
    hasCAM: allSlots.some(s => s.position === 'CAM')
  })

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: 'translate(-50%, -50%)'
  }
}
</script>

<template>
  <div
    class="relative w-full h-full pitch-bg rounded-2xl border-2 border-emerald-500/30 overflow-hidden shadow-2xl p-4 select-none"
    style="min-height: 420px"
  >
    <!-- Stadium Floodlight Atmosphere Overlay -->
    <div class="pitch-floodlight" />

    <!-- Pitch Line Markings -->
    <div class="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-white/20" />
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-24 sm:size-28 rounded-full border border-white/20" />
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-white/40" />

    <!-- Penalty boxes -->
    <div class="absolute inset-x-1/4 top-0 h-14 sm:h-16 border-b border-x border-white/20 rounded-b" />
    <div class="absolute inset-x-1/4 bottom-0 h-14 sm:h-16 border-t border-x border-white/20 rounded-t" />

    <!-- Goal arcs -->
    <div class="absolute left-1/2 top-14 sm:top-16 -translate-x-1/2 w-16 h-6 border-b border-white/20 rounded-b-full" />
    <div class="absolute left-1/2 bottom-14 sm:bottom-16 -translate-x-1/2 w-16 h-6 border-t border-white/20 rounded-t-full" />

    <!-- Slot items on pitch -->
    <div
      v-for="(slot, i) in slots"
      :id="`pitch-slot-${slot.id}`"
      :key="slot.id"
      class="absolute transition-all duration-300 z-10"
      :style="getSlotStyle(slot, i, slots.length)"
    >
      <!-- Touchdown Arrival Pulse Ripple -->
      <div
        v-if="pulseSlotId === slot.id"
        class="absolute -inset-3 rounded-full bg-emerald-400/40 dark:bg-emerald-400/50 animate-ping pointer-events-none z-20"
      />

      <button
        type="button"
        class="flex flex-col items-center group cursor-pointer focus:outline-none"
        :class="{
          'scale-110': activeSlotId === slot.id,
          'scale-105': isSlotHighlighted(slot) && !slot.player
        }"
        :disabled="!interactive && !slot.player"
        @click="handleSlotClick(slot)"
      >
        <!-- Slot Token / Disc -->
        <div
          class="size-9 sm:size-11 rounded-full flex flex-col items-center justify-center border shadow-lg transition-all duration-200"
          :class="[
            slot.player
              ? slot.player.stats.overall >= 90
                ? 'bg-zinc-950/95 border-gold-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] group-hover:scale-105'
                : 'bg-zinc-950/95 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] group-hover:scale-105'
              : isSlotHighlighted(slot)
                ? 'bg-emerald-500/35 border-2 border-emerald-300 ring-4 ring-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse'
                : 'bg-zinc-950/80 border-dashed border-white/35 group-hover:border-emerald-400 group-hover:bg-emerald-950/50',
            activeSlotId === slot.id ? 'ring-2 ring-emerald-400' : ''
          ]"
        >
          <template v-if="slot.player">
            <span
              class="font-mono font-black text-xs sm:text-sm leading-tight"
              :class="slot.player.stats.overall >= 90 ? 'text-gold-300' : 'text-emerald-300'"
            >
              {{ slot.player.stats.overall }}
            </span>
            <span class="font-mono text-[7px] sm:text-[8px] text-zinc-400 leading-none">
              {{ slot.position }}
            </span>
          </template>
          <template v-else>
            <span
              class="font-mono text-[10px] sm:text-xs font-black transition-colors"
              :class="isSlotHighlighted(slot) ? 'text-emerald-100 font-extrabold' : 'text-zinc-400 group-hover:text-emerald-300'"
            >
              {{ slot.position }}
            </span>
          </template>
        </div>

        <!-- Name / Action Pill (compact, non-overlapping) -->
        <div
          class="mt-0.5 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold tracking-tight max-w-[4.8rem] sm:max-w-[5.8rem] truncate text-center shadow-md transition-all font-mono"
          :class="slot.player
            ? slot.player.stats.overall >= 90
              ? 'bg-zinc-900/95 text-gold-300 border border-gold-500/40'
              : 'bg-zinc-900/95 text-white border border-white/15'
            : isSlotHighlighted(slot)
              ? 'bg-emerald-500 text-black font-extrabold border border-emerald-300 shadow-lg'
              : 'bg-black/70 text-zinc-300 border border-white/10'"
        >
          {{ slot.player ? slot.player.name : isSlotHighlighted(slot) ? $t('draft.place_slot') : slot.position }}
        </div>
      </button>
    </div>
  </div>
</template>
