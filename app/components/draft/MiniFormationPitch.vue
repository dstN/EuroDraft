<script setup lang="ts">
import type { Formation } from '~/types'
import { expandFormationToSlots } from '~/composables/useFormations'

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

// Reuse the same coordinate logic as FormationPitch
function getCoords(pos: string, idx: number, allSlots: string[]): { x: number, y: number } {
  const same = allSlots.filter(p => p === pos)
  const posIdx = same.indexOf(pos) < 0
    ? 0
    : (() => {
        let count = 0
        for (let i = 0; i < allSlots.length; i++) {
          if (allSlots[i] === pos) {
            if (i === idx) break
            count++
          }
        }
        return count
      })()
  const n = same.length

  if (pos === 'GK') return { x: 50, y: 87 }
  if (pos === 'LB') return { x: 13, y: 67 }
  if (pos === 'RB') return { x: 87, y: 67 }
  if (pos === 'CB') {
    if (n === 2) return { x: posIdx === 0 ? 37 : 63, y: 69 }
    if (n === 3) return { x: posIdx === 0 ? 26 : posIdx === 1 ? 50 : 74, y: 69 }
  }
  if (pos === 'CDM') {
    return { x: n > 1 ? (posIdx === 0 ? 37 : 63) : 50, y: 55 }
  }
  if (pos === 'CM') {
    if (n === 1) return { x: 50, y: 45 }
    if (n === 2) return { x: posIdx === 0 ? 33 : 67, y: 45 }
    if (n === 3) return { x: posIdx === 0 ? 22 : posIdx === 1 ? 50 : 78, y: 45 }
    return { x: 50, y: 45 }
  }
  if (pos === 'CAM') {
    return { x: n > 1 ? (posIdx === 0 ? 35 : 65) : 50, y: 34 }
  }
  if (pos === 'LM') return { x: 12, y: 45 }
  if (pos === 'RM') return { x: 88, y: 45 }
  if (pos === 'LW') return { x: 18, y: 22 }
  if (pos === 'RW') return { x: 82, y: 22 }
  if (pos === 'ST' || pos === 'CF') {
    if (n === 1) return { x: 50, y: 15 }
    return { x: posIdx === 0 ? 35 : 65, y: 15 }
  }
  return { x: 50, y: 50 }
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
