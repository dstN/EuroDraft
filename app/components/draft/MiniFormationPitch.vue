<script setup lang="ts">
import type { Formation, PositionCode } from '~/types'
import { expandFormationToSlots } from '~/composables/useFormations'
import { getPitchCoordinates, samePositionIndex } from '~/utils/pitchLayout'

const props = defineProps<{
  formation: Formation
}>()

// Get flat list of positions and compute dot coordinates
const slots = computed(() => expandFormationToSlots(props.formation))

function dotColor(pos: string): string {
  if (pos === 'GK') return '#facc15' // yellow
  if (['CB', 'LB', 'RB'].includes(pos)) return '#4ade80' // green
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return '#fb923c' // amber
  return '#f87171' // red
}

function getCoords(pos: PositionCode, idx: number, allSlots: PositionCode[]): { x: number, y: number } {
  const { sameIndex, sameCount } = samePositionIndex(pos, idx, allSlots)
  const { top, left } = getPitchCoordinates(pos, sameIndex, sameCount, {
    hasCDM: allSlots.includes('CDM'),
    hasCM: allSlots.includes('CM'),
    hasCAM: allSlots.includes('CAM')
  })
  return { x: left, y: top }
}

const dots = computed(() =>
  slots.value.map((pos, idx) => ({
    pos,
    color: dotColor(pos),
    coords: getCoords(pos, idx, slots.value)
  }))
)
</script>

<template>
  <div
    class="relative w-full h-full pitch-bg rounded-xl overflow-hidden select-none"
    style="min-height: 120px"
  >
    <!-- Center line -->
    <div class="absolute inset-x-6 top-1/2 -translate-y-1/2 h-px bg-white/10" />
    <!-- Center circle -->
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full border border-white/10" />
    <!-- Penalty boxes -->
    <div class="absolute inset-x-1/4 top-0 h-6 border-b border-x border-white/10 rounded-b" />
    <div class="absolute inset-x-1/4 bottom-0 h-6 border-t border-x border-white/10 rounded-t" />

    <!-- Player dots -->
    <div
      v-for="(dot, i) in dots"
      :key="i"
      class="absolute -translate-x-1/2 -translate-y-1/2 size-3 rounded-full shadow-md ring-1 ring-black/30"
      :style="{
        left: dot.coords.x + '%',
        top: dot.coords.y + '%',
        background: dot.color,
        boxShadow: `0 0 6px ${dot.color}88`
      }"
    />
  </div>
</template>
