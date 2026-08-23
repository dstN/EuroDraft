<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation, PositionCode } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default', middleware: ['ensure-database'] })
const draft = useDraftStore()
const roulette = useRouletteStore()
const audio = useAudioStore()

// Pick 3 formations with SSR-safe hydration
const formations = useState<Formation[]>('draft-formations', () => pickRandomFormations(3))

// Team Name & Emblem Customization
const teamNameInput = ref(draft.teamName || 'Dream XI')
const selectedEmblem = ref(draft.teamEmblem || 'eu')

// Formation source: pick from 3 (classic), randomly assigned (challenge), or hand-built (custom).
// Mutually exclusive -- Challenge Mode's whole point is "you don't choose", which conflicts
// with Custom's "you hand-picked it". Legend Mode below is a separate, combinable toggle.
const formationMode = ref<'classic' | 'challenge' | 'custom'>('classic')

// Challenge Mode: formation is assigned at random, no formation choice and no rerolls
const challengeFormation = ref<Formation>(pickRandomFormations(1)[0]!)

watch(formationMode, (mode) => {
  if (mode === 'challenge') challengeFormation.value = pickRandomFormations(1)[0]!
})

function reassignChallengeFormation() {
  challengeFormation.value = pickRandomFormations(1)[0]!
}

// Custom Formation Builder: pick exact position counts. GK is always 1 (fixed).
const CUSTOM_POSITIONS: { code: Exclude<PositionCode, 'GK'>, label: string }[] = [
  { code: 'CB', label: 'Center Back' },
  { code: 'LB', label: 'Left Back' },
  { code: 'RB', label: 'Right Back' },
  { code: 'CDM', label: 'Def. Mid' },
  { code: 'CM', label: 'Center Mid' },
  { code: 'CAM', label: 'Att. Mid' },
  { code: 'LM', label: 'Left Mid' },
  { code: 'RM', label: 'Right Mid' },
  { code: 'LW', label: 'Left Wing' },
  { code: 'RW', label: 'Right Wing' },
  { code: 'ST', label: 'Striker' },
  { code: 'CF', label: 'Center Fwd' }
]
const CUSTOM_MAX_PER_POSITION = 6

type CustomPositionCounts = Record<Exclude<PositionCode, 'GK'>, number>

// Defaults to a 4-4-2 (2 CB, 1 LB, 1 RB, 1 LM, 2 CM, 1 RM, 2 ST = 10 outfield)
const customCounts = ref<CustomPositionCounts>({
  CB: 2, LB: 1, RB: 1, CDM: 0, CM: 2, CAM: 0, LM: 1, RM: 1, LW: 0, RW: 0, ST: 2, CF: 0
})

function adjustCustomCount(code: Exclude<PositionCode, 'GK'>, delta: number) {
  const next = customCounts.value[code] + delta
  customCounts.value[code] = Math.min(CUSTOM_MAX_PER_POSITION, Math.max(0, next))
}

const customOutfieldTotal = computed(() =>
  Object.values(customCounts.value).reduce((sum, n) => sum + n, 0)
)
const customTotal = computed(() => customOutfieldTotal.value + 1) // +1 for the fixed GK

const customDefenseCount = computed(() => customCounts.value.CB + customCounts.value.LB + customCounts.value.RB)
const customMidfieldCount = computed(() => customCounts.value.CDM + customCounts.value.CM + customCounts.value.CAM + customCounts.value.LM + customCounts.value.RM)
const customAttackCount = computed(() => customCounts.value.LW + customCounts.value.RW + customCounts.value.ST + customCounts.value.CF)
const customFormationLabel = computed(() => `${customDefenseCount.value}-${customMidfieldCount.value}-${customAttackCount.value}`)

const customFormation = computed<Formation>(() => ({
  id: 'custom',
  label: `Custom (${customFormationLabel.value})`,
  slots: { GK: 1, ...customCounts.value }
}))

// Legend Mode: only 90+ rated players are draftable. Independent of formation source -- combinable with any of the three above.
const legendModeToggle = ref(false)

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
  draft.isLegendMode = legendModeToggle.value
}

function startChallenge() {
  audio.playTick()
  draft.teamName = teamNameInput.value.trim() || 'Dream XI'
  draft.teamEmblem = selectedEmblem.value
  roulette.reset()
  draft.selectFormation(challengeFormation.value)
  draft.isChallengeMode = true
  draft.rerollsRemaining = 0
  draft.isLegendMode = legendModeToggle.value
}

function startCustom() {
  if (customTotal.value !== 11) return
  audio.playTick()
  draft.teamName = teamNameInput.value.trim() || 'Dream XI'
  draft.teamEmblem = selectedEmblem.value
  roulette.reset()
  draft.selectFormation(customFormation.value)
  draft.isLegendMode = legendModeToggle.value
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
    <div class="text-center pt-2 space-y-3">
      <h2 class="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
        Select Starting Formation
      </h2>

      <!-- Formation Source Selector -->
      <div class="inline-flex items-center rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100/80 dark:bg-zinc-800/80 p-1">
        <button
          v-for="opt in [
            { value: 'classic', label: 'Classic' },
            { value: 'challenge', label: '🎲 Challenge' },
            { value: 'custom', label: '🛠️ Custom' }
          ]"
          :key="opt.value"
          type="button"
          class="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold cursor-pointer transition-all"
          :class="formationMode === opt.value
            ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'"
          @click="formationMode = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Legend Mode Toggle -->
      <div>
        <label class="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100/80 dark:bg-zinc-800/80 cursor-pointer select-none">
          <USwitch v-model="legendModeToggle" />
          <span class="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
            ⭐ Legend Mode
          </span>
          <UTooltip text="Only players rated 90+ overall are draftable. Combinable with any formation source above.">
            <UIcon
              name="i-lucide-info"
              class="size-3.5 text-zinc-500"
            />
          </UTooltip>
        </label>
      </div>
    </div>

    <!-- Challenge Mode: single assigned formation -->
    <template v-if="formationMode === 'challenge'">
      <div class="max-w-sm mx-auto space-y-4">
        <div class="surface-card p-5 space-y-4">
          <div
            class="relative rounded-xl overflow-hidden shadow-inner border border-white/10"
            style="height: 180px"
          >
            <MiniFormationPitch :formation="challengeFormation" />
          </div>
          <div>
            <p class="text-zinc-900 dark:text-white font-black text-lg tracking-tight text-center font-mono">
              {{ challengeFormation.label }}
            </p>
            <p class="text-xs text-center text-amber-700 dark:text-amber-400 font-bold font-mono uppercase tracking-wider mt-1">
              Your Challenge Formation
            </p>
          </div>
          <NuxtLink
            to="/draft"
            class="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm no-underline"
            @click="startChallenge"
          >
            <span>Start Challenge</span>
            <UIcon
              name="i-lucide-swords"
              class="size-4"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>

        <div class="text-center">
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            leading-icon="i-lucide-refresh-cw"
            label="Reassign Formation"
            class="rounded-full px-5 font-bold text-zinc-900 dark:text-zinc-100"
            @click="reassignChallengeFormation"
          />
        </div>
      </div>
    </template>

    <!-- Custom Formation Builder: pick exact position counts -->
    <template v-else-if="formationMode === 'custom'">
      <div class="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Position counters -->
        <div class="surface-card p-5 space-y-3">
          <div class="flex items-center justify-between pb-1">
            <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
              Position Counts
            </span>
            <span
              class="text-xs font-mono font-black px-2.5 py-1 rounded-full"
              :class="customTotal === 11
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'"
            >
              {{ customTotal }} / 11 Players
            </span>
          </div>

          <div class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
            <span class="text-xs font-bold text-zinc-500">GK (fixed)</span>
            <span class="text-xs font-mono font-black text-zinc-500">1</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div
              v-for="pos in CUSTOM_POSITIONS"
              :key="pos.code"
              class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
            >
              <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{{ pos.label }}</span>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-minus"
                  square
                  :disabled="customCounts[pos.code] <= 0"
                  @click="adjustCustomCount(pos.code, -1)"
                />
                <span class="w-4 text-center font-mono font-black text-sm text-zinc-900 dark:text-white">{{ customCounts[pos.code] }}</span>
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-plus"
                  square
                  :disabled="customCounts[pos.code] >= CUSTOM_MAX_PER_POSITION"
                  @click="adjustCustomCount(pos.code, 1)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <div class="surface-card p-5 space-y-4 flex flex-col">
          <div
            class="relative rounded-xl overflow-hidden shadow-inner border border-white/10 flex-1"
            style="min-height: 220px"
          >
            <MiniFormationPitch :formation="customFormation" />
          </div>
          <div>
            <p class="text-zinc-900 dark:text-white font-black text-lg tracking-tight text-center font-mono">
              {{ customFormationLabel }}
            </p>
            <p class="text-xs text-center text-emerald-700 dark:text-emerald-400 font-bold font-mono uppercase tracking-wider mt-1">
              Your Custom Formation
            </p>
          </div>
          <UTooltip :text="customTotal !== 11 ? `Adjust positions until you have exactly 11 players (currently ${customTotal})` : ''">
            <NuxtLink
              :to="customTotal === 11 ? '/draft' : undefined"
              class="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm no-underline"
              :class="customTotal === 11
                ? 'bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 cursor-pointer'
                : 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'"
              @click="customTotal === 11 && startCustom()"
            >
              <span>Confirm & Draft</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4"
                aria-hidden="true"
              />
            </NuxtLink>
          </UTooltip>
        </div>
      </div>
    </template>

    <!-- Classic Mode: pick from 3 formations -->
    <template v-else>
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
    </template>
  </div>
</template>
