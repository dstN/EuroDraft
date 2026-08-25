<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation, PositionCode } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default', middleware: ['ensure-database'] })
const draft = useDraftStore()
const roulette = useRouletteStore()
const audio = useAudioStore()
const { t } = useI18n()
const countryName = useCountryName()
const localePath = useLocalePath()

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
// Labels come from the shared draft.position_labels i18n key (not a local list)
// so this stays in sync with every other position label in the app.
const CUSTOM_POSITIONS: Exclude<PositionCode, 'GK'>[] = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
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
  label: t('formation.custom_label', { formation: customFormationLabel.value }),
  slots: { GK: 1, ...customCounts.value }
}))

// Legend Mode: only 90+ rated players are draftable. Independent of formation source -- combinable with any of the three above.
const legendModeToggle = ref(false)

// Top Picked Popular Nationalities
const TOP_EMBLEM_CHOICES = ['eu', 'de', 'fr', 'es', 'it', 'gb-eng', 'nl', 'pt', 'hr', 'tr', 'be', 'at']

// All 55+ European Nations & Territories -- codes only, labels come from
// the countries.* i18n namespace via useCountryName() so this list doesn't
// duplicate translation work already done for the shared country-name map.
const ALL_EUROPEAN_FLAGS = [
  'eu', 'al', 'ad', 'am', 'at', 'az', 'by', 'be', 'ba', 'bg', 'hr', 'cy', 'cz', 'cs', 'dk',
  'gb-eng', 'ee', 'fo', 'fi', 'fr', 'ge', 'de', 'gi', 'gr', 'hu', 'is', 'ie', 'il', 'it',
  'kz', 'xk', 'lv', 'li', 'lt', 'lu', 'mt', 'md', 'me', 'nl', 'mk', 'gb-nir', 'no', 'pl',
  'pt', 'ro', 'sm', 'gb-sct', 'rs', 'sk', 'si', 'es', 'se', 'ch', 'tr', 'ua', 'gb-wls', 'yu'
]

const NAME_PRESETS = computed(() => [
  t('formation.name_presets.dream_xi'),
  t('formation.name_presets.total_football'),
  t('formation.name_presets.galacticos'),
  t('formation.name_presets.euro_titans'),
  t('formation.name_presets.vintage_kings')
])

function getCountryLabel(code: string): string {
  return countryName(code)
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
        {{ $t('formation.step_badge') }}
      </div>
      <h1 class="text-3xl sm:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('formation.create_squad_title') }}
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base max-w-md mx-auto">
        {{ $t('formation.create_squad_subtitle') }}
      </p>
    </div>

    <!-- Team Customization Box -->
    <div class="surface-card p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">{{ $t('formation.team_identity') }}</span>
        <span class="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-bold">{{ $t('formation.custom_club') }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Custom Name Input & Presets -->
        <div class="space-y-3">
          <label
            for="team-name-input"
            class="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
          >
            {{ $t('formation.team_name_label') }}
          </label>
          <input
            id="team-name-input"
            v-model="teamNameInput"
            type="text"
            maxlength="24"
            :placeholder="$t('formation.team_name_placeholder')"
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
              {{ $t('formation.team_emblem_label') }}
            </label>
            <span class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-bold">{{ $t('formation.nations_count') }}</span>
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
                  :key="nation"
                  :value="nation"
                >
                  {{ countryName(nation) }}
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
            <span class="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">{{ $t('formation.popular_emblems') }}</span>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <button
                v-for="emb in TOP_EMBLEM_CHOICES"
                :key="emb"
                type="button"
                class="p-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer text-left min-w-0"
                :class="selectedEmblem === emb
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/50'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-white/10 hover:border-zinc-400'"
                @click="selectedEmblem = emb"
              >
                <CountryFlag
                  :country="emb"
                  size="xs"
                  class="shrink-0"
                />
                <span class="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ countryName(emb).split(' ')[0] }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Formation Choice Section Title -->
    <div class="text-center pt-2 space-y-3">
      <h2 class="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
        {{ $t('formation.select_starting_formation') }}
      </h2>

      <!-- Formation Source Selector -->
      <div class="inline-flex items-center rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100/80 dark:bg-zinc-800/80 p-1">
        <button
          v-for="opt in [
            { value: 'classic', label: $t('formation.mode_classic') },
            { value: 'challenge', label: $t('formation.mode_challenge') },
            { value: 'custom', label: $t('formation.mode_custom') }
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
            {{ $t('formation.legend_mode') }}
          </span>
          <UTooltip :text="$t('formation.legend_mode_tooltip')">
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
              {{ $t('formation.your_challenge_formation') }}
            </p>
          </div>
          <NuxtLink
            :to="localePath('/draft')"
            class="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm no-underline"
            @click="startChallenge"
          >
            <span>{{ $t('formation.start_challenge') }}</span>
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
            :label="$t('formation.reassign_formation')"
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
              {{ $t('formation.position_counts') }}
            </span>
            <span
              class="text-xs font-mono font-black px-2.5 py-1 rounded-full"
              :class="customTotal === 11
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'"
            >
              {{ $t('formation.players_count', { count: customTotal }) }}
            </span>
          </div>

          <div class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/40">
            <span class="text-xs font-bold text-zinc-500">{{ $t('formation.gk_fixed') }}</span>
            <span class="text-xs font-mono font-black text-zinc-500">1</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div
              v-for="pos in CUSTOM_POSITIONS"
              :key="pos"
              class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
            >
              <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{{ $t(`draft.position_labels.${pos}`) }}</span>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-minus"
                  square
                  :disabled="customCounts[pos] <= 0"
                  @click="adjustCustomCount(pos, -1)"
                />
                <span class="w-4 text-center font-mono font-black text-sm text-zinc-900 dark:text-white">{{ customCounts[pos] }}</span>
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-plus"
                  square
                  :disabled="customCounts[pos] >= CUSTOM_MAX_PER_POSITION"
                  @click="adjustCustomCount(pos, 1)"
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
              {{ $t('formation.your_custom_formation') }}
            </p>
          </div>
          <UTooltip :text="customTotal !== 11 ? $t('formation.adjust_positions_hint', { count: customTotal }) : ''">
            <NuxtLink
              :to="customTotal === 11 ? '/draft' : undefined"
              class="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between transition-all shadow-sm no-underline"
              :class="customTotal === 11
                ? 'bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 cursor-pointer'
                : 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'"
              @click="customTotal === 11 && startCustom()"
            >
              <span>{{ $t('formation.confirm_and_draft') }}</span>
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
          :to="localePath('/draft')"
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
              <span>{{ $t('formation.confirm_and_draft') }}</span>
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
          :label="$t('formation.draw_new_formations')"
          class="rounded-full px-6 font-bold text-zinc-900 dark:text-zinc-100"
          @click="formations = pickRandomFormations(3)"
        />
      </div>
    </template>
  </div>
</template>
