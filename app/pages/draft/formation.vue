<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'

definePageMeta({ layout: 'default' })
const draft = useDraftStore()

// Pick 3 random formations on mount
const formations = ref<Formation[]>(pickRandomFormations(3))

function selectFormation(f: Formation) {
  draft.selectFormation(f)
  navigateTo('/draft')
}

function getDefCount(f: Formation): number {
  return (f.slots.CB || 0) + (f.slots.LB || 0) + (f.slots.RB || 0)
}

function getMidCount(f: Formation): number {
  return (f.slots.CDM || 0) + (f.slots.CM || 0) + (f.slots.CAM || 0) + (f.slots.LM || 0) + (f.slots.RM || 0)
}

function getFwdCount(f: Formation): number {
  return (f.slots.LW || 0) + (f.slots.RW || 0) + (f.slots.ST || 0) + (f.slots.CF || 0)
}
</script>

<template>
  <div class="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
    <div class="w-full max-w-4xl mx-auto space-y-10">
      <!-- Header -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono tracking-[0.2em] font-bold">
          Step 1 · Tactical Blueprint
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
          Choose Your Formation
        </h1>
        <p class="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          Select one of the three drawn tactical structures. Your drafted players must fit into these exact 11 positions.
        </p>
      </div>

      <!-- Formation cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          v-for="formation in formations"
          :key="formation.id"
          type="button"
          class="bezel-card group text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-[0.98]"
          @click="selectFormation(formation)"
        >
          <!-- Inner core (double-bezel) -->
          <div class="bezel-inner p-5 space-y-4">
            <!-- Mini formation pitch -->
            <div
              class="relative rounded-xl overflow-hidden shadow-inner border border-white/10"
              style="height: 180px"
            >
              <MiniFormationPitch :formation="formation" />
              <!-- Formation label overlay at bottom -->
              <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3.5 py-2.5 flex items-end justify-between">
                <span class="text-white font-black font-mono text-xl tracking-widest drop-shadow-md">
                  {{ formation.id }}
                </span>
                <div class="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                  <span class="text-yellow-300">1 GK</span>
                  <span class="text-emerald-300">{{ getDefCount(formation) }} DEF</span>
                  <span class="text-amber-300">{{ getMidCount(formation) }} MID</span>
                  <span class="text-rose-300">{{ getFwdCount(formation) }} FWD</span>
                </div>
              </div>
            </div>

            <!-- Formation name & description -->
            <div>
              <p class="text-zinc-900 dark:text-white font-black text-base tracking-tight">
                {{ formation.label }}
              </p>
            </div>

            <!-- CTA Button -->
            <div class="pt-1">
              <div class="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500 text-emerald-600 dark:text-emerald-300 group-hover:text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all">
                <span>Select Formation</span>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 transition-transform group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- Re-draw option -->
      <div class="text-center pt-2">
        <UButton
          variant="outline"
          color="neutral"
          size="md"
          leading-icon="i-lucide-refresh-cw"
          label="Draw 3 New Formations"
          class="rounded-full px-6 font-semibold"
          @click="formations = pickRandomFormations(3)"
        />
      </div>
    </div>
  </div>
</template>
