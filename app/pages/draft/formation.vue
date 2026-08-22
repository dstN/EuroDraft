<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })
const draft = useDraftStore()

// Pick 3 random formations on mount
const formations = ref<Formation[]>(pickRandomFormations(3))

// Team Name & Emblem Customization
const teamNameInput = ref(draft.teamName || 'Dream XI')
const selectedEmblem = ref(draft.teamEmblem || 'eu')

const EMBLEM_CHOICES = [
  { code: 'eu', label: 'Europe All-Stars' },
  { code: 'nl', label: 'Oranje' },
  { code: 'fr', label: 'Les Bleus' },
  { code: 'de', label: 'Die Mannschaft' },
  { code: 'es', label: 'La Roja' },
  { code: 'it', label: 'Azzurri' },
  { code: 'pt', label: 'Seleção' },
  { code: 'gb-eng', label: 'Three Lions' }
]

const NAME_PRESETS = [
  'Dream XI',
  'Total Football',
  'Galácticos',
  'Euro Titans',
  'Vintage Kings'
]

function selectFormation(f: Formation) {
  draft.teamName = teamNameInput.value.trim() || 'Dream XI'
  draft.teamEmblem = selectedEmblem.value
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
  <div class="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-10">
    <div class="w-full max-w-4xl mx-auto space-y-10">
      <!-- Header -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono tracking-[0.2em] font-bold">
          Step 1 · Squad Setup
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
          Create Your Squad
        </h1>
        <p class="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          Name your dream team, choose an emblem, and pick your tactical formation for the European Championship.
        </p>
      </div>

      <!-- Team Customization Bezel Box -->
      <div class="bezel-card max-w-2xl mx-auto">
        <div class="bezel-inner p-6 space-y-5">
          <div class="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-3">
            <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">Team Identity</span>
            <span class="text-[11px] font-mono text-emerald-400 font-semibold">Custom Tournament Club</span>
          </div>

          <div class="space-y-4">
            <!-- Custom Name Input -->
            <div class="space-y-2">
              <label
                for="team-name-input"
                class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Team Name
              </label>
              <div class="flex gap-2">
                <input
                  id="team-name-input"
                  v-model="teamNameInput"
                  type="text"
                  maxlength="24"
                  placeholder="Enter Team Name..."
                  class="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
              </div>

              <!-- Quick Name Presets -->
              <div class="flex flex-wrap gap-1.5 pt-1">
                <button
                  v-for="preset in NAME_PRESETS"
                  :key="preset"
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer"
                  :class="teamNameInput === preset
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-white'"
                  @click="teamNameInput = preset"
                >
                  {{ preset }}
                </button>
              </div>
            </div>

            <!-- Emblem Picker -->
            <div class="space-y-2 pt-2">
              <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Team Emblem / Badge
              </label>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="emb in EMBLEM_CHOICES"
                  :key="emb.code"
                  type="button"
                  class="p-2 rounded-xl border transition-all flex items-center gap-2 cursor-pointer"
                  :class="selectedEmblem === emb.code
                    ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50'
                    : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-white/5 hover:border-zinc-400'"
                  @click="selectedEmblem = emb.code"
                >
                  <CountryFlag
                    :country="emb.code"
                    size="sm"
                  />
                  <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{{ emb.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Formation Choice Section Title -->
      <div class="text-center pt-2">
        <h2 class="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Select Starting Formation
        </h2>
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
                <span>Confirm & Draft</span>
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
