<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })
const draft = useDraftStore()

// Pick 3 formations with SSR-safe hydration
const formations = useState<Formation[]>('draft-formations', () => pickRandomFormations(3))

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
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
    <!-- Header -->
    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
        Step 1 · Squad Setup
      </div>
      <h1 class="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
        Create Your Squad
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base max-w-md mx-auto">
        Name your dream team, choose an emblem, and pick your tactical formation for the European Championship.
      </p>
    </div>

    <!-- Team Customization Box (Clean single surface-card) -->
    <div class="surface-card p-6 space-y-5">
      <div class="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Team Identity</span>
        <span class="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-bold">Custom Tournament Club</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Custom Name Input & Presets -->
        <div class="space-y-3">
          <label
            for="team-name-input"
            class="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
          >
            Team Name
          </label>
          <input
            id="team-name-input"
            v-model="teamNameInput"
            type="text"
            maxlength="24"
            placeholder="Enter Team Name..."
            class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >

          <!-- Quick Name Presets -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="preset in NAME_PRESETS"
              :key="preset"
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
              :class="teamNameInput === preset
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white'"
              @click="teamNameInput = preset"
            >
              {{ preset }}
            </button>
          </div>
        </div>

        <!-- Emblem Picker -->
        <div class="space-y-3">
          <label class="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Team Emblem / Badge
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="emb in EMBLEM_CHOICES"
              :key="emb.code"
              type="button"
              class="p-2 rounded-xl border transition-all flex items-center gap-2 cursor-pointer"
              :class="selectedEmblem === emb.code
                ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/50'
                : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-white/10 hover:border-zinc-400'"
              @click="selectedEmblem = emb.code"
            >
              <CountryFlag
                :country="emb.code"
                size="sm"
              />
              <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{{ emb.label }}</span>
            </button>
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

    <!-- Formation Cards (Clean single surface-card, no nesting) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <NuxtLink
        v-for="formation in formations"
        :key="formation.id"
        to="/draft"
        class="surface-card p-5 space-y-4 group text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] active:scale-[0.98] block no-underline"
        @click="selectFormation(formation)"
      >
        <!-- Mini formation pitch -->
        <div
          class="relative rounded-xl overflow-hidden shadow-inner border border-white/10"
          style="height: 180px"
        >
          <MiniFormationPitch :formation="formation" />
        </div>

        <!-- Formation label below pitch -->
        <div>
          <p class="text-zinc-900 dark:text-white font-black text-lg tracking-tight text-center font-mono">
            {{ formation.label }}
          </p>
        </div>

        <!-- CTA Button with strong WCAG AA contrast -->
        <div class="pt-1">
          <div class="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm">
            <span>Confirm & Draft</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 transition-transform group-hover:translate-x-1"
            />
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Re-draw option -->
    <div class="text-center pt-2 pb-8">
      <UButton
        variant="outline"
        color="neutral"
        size="md"
        leading-icon="i-lucide-refresh-cw"
        label="Draw 3 New Formations"
        class="rounded-full px-6 font-bold"
        @click="formations = pickRandomFormations(3)"
      />
    </div>
  </div>
</template>
