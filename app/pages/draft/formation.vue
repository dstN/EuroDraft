<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })
const draft = useDraftStore()
const roulette = useRouletteStore()
const audio = useAudioStore()

// Pick 3 formations with SSR-safe hydration
const formations = useState<Formation[]>('draft-formations', () => pickRandomFormations(3))

// Team Name & Emblem Customization
const teamNameInput = ref(draft.teamName || 'Dream XI')
const selectedEmblem = ref(draft.teamEmblem || 'eu')

// Top Picked Popular Nationalities
const TOP_EMBLEM_CHOICES = [
  { code: 'eu', label: 'Europe (All-Stars)' },
  { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' },
  { code: 'es', label: 'Spain' },
  { code: 'it', label: 'Italy' },
  { code: 'gb-eng', label: 'England' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'pt', label: 'Portugal' },
  { code: 'hr', label: 'Croatia' },
  { code: 'tr', label: 'Türkiye' },
  { code: 'be', label: 'Belgium' },
  { code: 'at', label: 'Austria' }
]

// All 55+ European Nations & Territories
const ALL_EUROPEAN_FLAGS = [
  { code: 'eu', label: 'Europe (All-Stars)' },
  { code: 'al', label: 'Albania' },
  { code: 'ad', label: 'Andorra' },
  { code: 'am', label: 'Armenia' },
  { code: 'at', label: 'Austria' },
  { code: 'az', label: 'Azerbaijan' },
  { code: 'by', label: 'Belarus' },
  { code: 'be', label: 'Belgium' },
  { code: 'ba', label: 'Bosnia & Herzegovina' },
  { code: 'bg', label: 'Bulgaria' },
  { code: 'hr', label: 'Croatia' },
  { code: 'cy', label: 'Cyprus' },
  { code: 'cz', label: 'Czechia' },
  { code: 'cs', label: 'Czechoslovakia (Hist.)' },
  { code: 'dk', label: 'Denmark' },
  { code: 'gb-eng', label: 'England' },
  { code: 'ee', label: 'Estonia' },
  { code: 'fo', label: 'Faroe Islands' },
  { code: 'fi', label: 'Finland' },
  { code: 'fr', label: 'France' },
  { code: 'ge', label: 'Georgia' },
  { code: 'de', label: 'Germany' },
  { code: 'gi', label: 'Gibraltar' },
  { code: 'gr', label: 'Greece' },
  { code: 'hu', label: 'Hungary' },
  { code: 'is', label: 'Iceland' },
  { code: 'ie', label: 'Ireland (Republic)' },
  { code: 'il', label: 'Israel' },
  { code: 'it', label: 'Italy' },
  { code: 'kz', label: 'Kazakhstan' },
  { code: 'xk', label: 'Kosovo' },
  { code: 'lv', label: 'Latvia' },
  { code: 'li', label: 'Liechtenstein' },
  { code: 'lt', label: 'Lithuania' },
  { code: 'lu', label: 'Luxembourg' },
  { code: 'mt', label: 'Malta' },
  { code: 'md', label: 'Moldova' },
  { code: 'me', label: 'Montenegro' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'mk', label: 'North Macedonia' },
  { code: 'gb-nir', label: 'Northern Ireland' },
  { code: 'no', label: 'Norway' },
  { code: 'pl', label: 'Poland' },
  { code: 'pt', label: 'Portugal' },
  { code: 'ro', label: 'Romania' },
  { code: 'sm', label: 'San Marino' },
  { code: 'gb-sct', label: 'Scotland' },
  { code: 'rs', label: 'Serbia' },
  { code: 'sk', label: 'Slovakia' },
  { code: 'si', label: 'Slovenia' },
  { code: 'es', label: 'Spain' },
  { code: 'se', label: 'Sweden' },
  { code: 'ch', label: 'Switzerland' },
  { code: 'tr', label: 'Türkiye' },
  { code: 'ua', label: 'Ukraine' },
  { code: 'gb-wls', label: 'Wales' },
  { code: 'yu', label: 'Yugoslavia (Hist.)' }
]

const NAME_PRESETS = [
  'Dream XI',
  'Total Football',
  'Galácticos',
  'Euro Titans',
  'Vintage Kings'
]

function getCountryLabel(code: string): string {
  const found = ALL_EUROPEAN_FLAGS.find(f => f.code.toLowerCase() === code.toLowerCase())
  return found ? found.label : code.toUpperCase()
}

function selectFormation(f: Formation) {
  audio.playTick()
  draft.teamName = teamNameInput.value.trim() || 'Dream XI'
  draft.teamEmblem = selectedEmblem.value
  roulette.reset()
  draft.selectFormation(f)
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
    <!-- Header -->
    <div class="text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
        Step 1 · Squad Setup
      </div>
      <h1 class="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
        Create Your Squad
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base max-w-md mx-auto">
        Name your dream team, choose an emblem, and pick your tactical formation for the continental tournament.
      </p>
    </div>

    <!-- Team Customization Box -->
    <div class="surface-card p-6 space-y-6">
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
                ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-200 font-bold'
                : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white'"
              @click="teamNameInput = preset"
            >
              {{ preset }}
            </button>
          </div>
        </div>

        <!-- Emblem & Flag Picker -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label
              for="all-nations-select"
              class="block text-xs font-bold text-zinc-900 dark:text-zinc-100"
            >
              Team Emblem / Flag
            </label>
            <span class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-bold">55+ European Nations</span>
          </div>

          <!-- All Nations Dropdown Selector -->
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <select
                id="all-nations-select"
                v-model="selectedEmblem"
                class="w-full pl-3 pr-8 py-2 rounded-xl border border-zinc-400/80 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none"
              >
                <option
                  v-for="nation in ALL_EUROPEAN_FLAGS"
                  :key="nation.code"
                  :value="nation.code"
                >
                  {{ nation.label }}
                </option>
              </select>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-zinc-500 dark:text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>

            <!-- Active Selected Flag Badge -->
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-600/40 shrink-0">
              <CountryFlag
                :country="selectedEmblem"
                size="sm"
              />
              <span class="text-xs font-black text-emerald-950 dark:text-emerald-200 truncate max-w-[5.5rem] sm:max-w-[7rem]">
                {{ getCountryLabel(selectedEmblem) }}
              </span>
            </div>
          </div>

          <!-- Top Picked Fast Selection Grid -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">Popular Emblems</span>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <button
                v-for="emb in TOP_EMBLEM_CHOICES"
                :key="emb.code"
                type="button"
                class="p-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer text-left min-w-0"
                :class="selectedEmblem === emb.code
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/50'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-white/10 hover:border-zinc-400'"
                @click="selectedEmblem = emb.code"
              >
                <CountryFlag
                  :country="emb.code"
                  size="xs"
                  class="shrink-0"
                />
                <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ emb.label.split(' ')[0] }}</span>
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

    <!-- Formation Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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

        <!-- CTA Button with strong WCAG AAA contrast -->
        <div class="pt-1">
          <div class="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm">
            <span>Confirm & Draft</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
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
        class="rounded-full px-6 font-bold text-zinc-900 dark:text-zinc-100"
        @click="formations = pickRandomFormations(3)"
      />
    </div>
  </div>
</template>
