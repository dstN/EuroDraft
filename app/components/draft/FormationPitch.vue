<script setup lang="ts">
import type { DraftSlot } from '~/types'

const props = defineProps<{
  slots: DraftSlot[]
  activeSlotId?: string | null
  highlightedSlotIds?: string[]
  highlightedPositions?: string[]
  interactive?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-slot', slot: DraftSlot): void
}>()

// Position badge color helper
function getPositionBg(pos: string): string {
  if (pos === 'GK') return 'bg-sky-500/20 border-sky-400/60 text-sky-300'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-amber-500/20 border-amber-400/60 text-amber-300'
  return 'bg-rose-500/20 border-rose-400/60 text-rose-300'
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

// Pitch layout coordinate mapping based on position type and index
function getSlotStyle(slot: DraftSlot, _index: number, _total: number) {
  const pos = slot.position
  let top = 50
  let left = 50

  // Standard pitch layout (GK at bottom = 87%, Def at 68%, Mid at 45%, Fwd at 20%)
  if (pos === 'GK') {
    top = 87
    left = 50
  } else if (pos === 'CB') {
    top = 69
    const cbSlots = props.slots.filter(s => s.position === 'CB')
    const cbIdx = cbSlots.findIndex(s => s.id === slot.id)
    if (cbSlots.length === 2) {
      left = cbIdx === 0 ? 37 : 63
    } else if (cbSlots.length === 3) {
      left = cbIdx === 0 ? 28 : cbIdx === 1 ? 50 : 72
    }
  } else if (pos === 'LB') {
    top = 67
    left = 15
  } else if (pos === 'RB') {
    top = 67
    left = 85
  } else if (pos === 'CDM') {
    top = 55
    const cdmSlots = props.slots.filter(s => s.position === 'CDM')
    const idx = cdmSlots.findIndex(s => s.id === slot.id)
    left = cdmSlots.length > 1 ? (idx === 0 ? 37 : 63) : 50
  } else if (pos === 'CM') {
    top = 45
    const cmSlots = props.slots.filter(s => s.position === 'CM')
    const idx = cmSlots.findIndex(s => s.id === slot.id)
    if (cmSlots.length === 1) left = 50
    else if (cmSlots.length === 2) left = idx === 0 ? 34 : 66
    else if (cmSlots.length === 3) left = idx === 0 ? 24 : idx === 1 ? 50 : 76
  } else if (pos === 'CAM') {
    top = 34
    const camSlots = props.slots.filter(s => s.position === 'CAM')
    const idx = camSlots.findIndex(s => s.id === slot.id)
    left = camSlots.length > 1 ? (idx === 0 ? 35 : 65) : 50
  } else if (pos === 'LM') {
    top = 45
    left = 14
  } else if (pos === 'RM') {
    top = 45
    left = 86
  } else if (pos === 'LW') {
    top = 22
    left = 18
  } else if (pos === 'RW') {
    top = 22
    left = 82
  } else if (pos === 'ST' || pos === 'CF') {
    top = 17
    const stSlots = props.slots.filter(s => s.position === 'ST' || s.position === 'CF')
    const idx = stSlots.findIndex(s => s.id === slot.id)
    left = stSlots.length > 1 ? (idx === 0 ? 36 : 64) : 50
  }

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: 'translate(-50%, -50%)'
  }
}
</script>

<template>
  <div class="relative w-full h-full pitch-bg rounded-2xl border-2 border-emerald-500/30 overflow-hidden shadow-2xl p-4 select-none" style="min-height: 420px">
    <!-- Pitch markings -->
    <div class="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-white/15" />
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-24 sm:size-28 rounded-full border border-white/15" />
    <!-- Penalty boxes -->
    <div class="absolute inset-x-1/4 top-0 h-14 sm:h-16 border-b border-x border-white/15 rounded-b" />
    <div class="absolute inset-x-1/4 bottom-0 h-14 sm:h-16 border-t border-x border-white/15 rounded-t" />

    <!-- Slot items on pitch -->
    <div
      v-for="(slot, i) in slots"
      :key="slot.id"
      class="absolute transition-all duration-300 z-10"
      :style="getSlotStyle(slot, i, slots.length)"
    >
      <button
        type="button"
        class="flex flex-col items-center group cursor-pointer focus:outline-none"
        :class="{
          'scale-110': activeSlotId === slot.id,
          'scale-105': isSlotHighlighted(slot) && !slot.player
        }"
        :disabled="!interactive"
        @click="emit('select-slot', slot)"
      >
        <!-- Slot disc -->
        <div
          class="size-9 sm:size-11 rounded-full flex flex-col items-center justify-center border shadow-md transition-all duration-200"
          :class="[
            slot.player
              ? 'bg-zinc-900/95 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)] group-hover:scale-105'
              : isSlotHighlighted(slot)
                ? 'bg-emerald-500/30 border-2 border-emerald-300 ring-4 ring-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.7)] animate-pulse'
                : 'bg-zinc-950/70 border-dashed border-white/30 group-hover:border-emerald-400 group-hover:bg-emerald-950/40',
            activeSlotId === slot.id ? 'ring-2 ring-emerald-400' : ''
          ]"
        >
          <template v-if="slot.player">
            <span class="font-mono font-black text-xs sm:text-sm text-emerald-300 leading-tight">
              {{ slot.player.stats.overall }}
            </span>
            <span class="font-mono text-[8px] text-zinc-400 leading-none">
              {{ slot.position }}
            </span>
          </template>
          <template v-else>
            <span
              class="font-mono text-[10px] sm:text-xs font-bold transition-colors"
              :class="isSlotHighlighted(slot) ? 'text-emerald-200 font-extrabold' : 'text-zinc-400 group-hover:text-emerald-300'"
            >
              {{ slot.position }}
            </span>
          </template>
        </div>

        <!-- Name / Position label pill -->
        <div
          class="mt-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold tracking-tight max-w-[5rem] sm:max-w-[5.5rem] truncate text-center shadow-sm transition-all"
          :class="slot.player
            ? 'bg-zinc-900/90 text-white border border-white/10'
            : isSlotHighlighted(slot)
              ? 'bg-emerald-500 text-black font-extrabold border border-emerald-300 shadow-md'
              : 'bg-black/50 text-zinc-400 border border-white/5'"
        >
          {{ slot.player ? slot.player.name : isSlotHighlighted(slot) ? 'Place here' : slot.position }}
        </div>
      </button>
    </div>
  </div>
</template>
