<script setup lang="ts">
import type { Player } from '~/types'
import PlayerFoilCard from '~/components/draft/PlayerFoilCard.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import AppLogo from '~/components/shared/AppLogo.vue'

definePageMeta({ layout: 'default' })

const localePath = useLocalePath()

// Featured legendary showcase players for the hero card fan
const showcaseLegends: Player[] = [
  {
    id: 'fr-2000-zidane',
    name: 'Zinedine Zidane',
    nameNormalized: 'zinedine-zidane',
    country: 'fr',
    countryName: 'France',
    year: 2000,
    shirtNumber: 10,
    basePosition: 'Midfielder',
    positions: ['CAM', 'CM'],
    primaryPosition: 'CAM',
    enrichmentSource: 'curated',
    stats: { overall: 96, pace: 84, shooting: 88, passing: 97, dribbling: 96, defending: 75, physical: 86 }
  },
  {
    id: 'nl-1988-van-basten',
    name: 'Marco van Basten',
    nameNormalized: 'marco-van-basten',
    country: 'nl',
    countryName: 'Netherlands',
    year: 1988,
    shirtNumber: 12,
    basePosition: 'Forward',
    positions: ['ST', 'CF'],
    primaryPosition: 'ST',
    enrichmentSource: 'curated',
    stats: { overall: 95, pace: 89, shooting: 96, passing: 84, dribbling: 90, defending: 42, physical: 85 }
  },
  {
    id: 'pt-2008-ronaldo',
    name: 'Cristiano Ronaldo',
    nameNormalized: 'cristiano-ronaldo',
    country: 'pt',
    countryName: 'Portugal',
    year: 2008,
    shirtNumber: 7,
    basePosition: 'Forward',
    positions: ['LW', 'LM', 'ST', 'RW'],
    primaryPosition: 'LW',
    enrichmentSource: 'curated',
    stats: { overall: 94, pace: 95, shooting: 94, passing: 86, dribbling: 94, defending: 45, physical: 86 }
  },
  {
    id: 'es-2024-yamal',
    name: 'Lamine Yamal',
    nameNormalized: 'lamine-yamal',
    country: 'es',
    countryName: 'Spain',
    year: 2024,
    shirtNumber: 19,
    basePosition: 'Forward',
    positions: ['RW', 'RM'],
    primaryPosition: 'RW',
    enrichmentSource: 'curated',
    stats: { overall: 91, pace: 93, shooting: 86, passing: 91, dribbling: 94, defending: 45, physical: 74 }
  }
]

const activeLegendIndex = ref(0)
const currentLegend = computed(() => showcaseLegends[activeLegendIndex.value]!)

// Mini Interactive Roulette Preview on Homepage
const countryName = useCountryName()
const previewSpinCountry = ref('nl')
const previewSpinYear = ref(1988)
const previewSpinCountryName = computed(() => countryName(previewSpinCountry.value))
const isSpinningPreview = ref(false)

const previewPool = [
  { code: 'nl', year: 1988 },
  { code: 'fr', year: 2000 },
  { code: 'es', year: 2012 },
  { code: 'de', year: 1996 },
  { code: 'it', year: 2020 },
  { code: 'pt', year: 2016 },
  { code: 'dk', year: 1992 },
  { code: 'gr', year: 2004 },
  { code: 'gb-eng', year: 1996 },
  { code: 'cz', year: 1996 }
]

function spinPreview() {
  if (isSpinningPreview.value) return
  isSpinningPreview.value = true
  let step = 0
  const maxSteps = 10
  const interval = setInterval(() => {
    const pick = previewPool[Math.floor(Math.random() * previewPool.length)]!
    previewSpinCountry.value = pick.code
    previewSpinYear.value = pick.year
    step++
    if (step >= maxSteps) {
      clearInterval(interval)
      isSpinningPreview.value = false
    }
  }, 75)
}

// 4 Eras Bento Grid Data — year range and star names are proper nouns/dates,
// left untranslated; title/subtitle/tag are pulled from i18n by era index below.
//
// Boundaries follow the real EURO team-count expansions, not just a rough
// "look how the years feel grouped" split -- 24 teams only started at EURO
// 2016; 2008 and 2012 were still 16-team tournaments, so they belong with
// the 1996-2012 era, not the 2016-2024 one (was previously mislabeled as
// part of a "2008 — 2024 / 24 Teams Era" span).
const { t } = useI18n()
const tournamentEraMeta = [
  { era: '1960 — 1976', stars: ['Lev Yashin \'60', 'Gerd Müller \'72', 'Franz Beckenbauer \'72', 'Antonín Panenka \'76'] },
  { era: '1980 — 1992', stars: ['Michel Platini \'84', 'Marco van Basten \'88', 'Ruud Gullit \'88', 'Peter Schmeichel \'92'] },
  { era: '1996 — 2012', stars: ['Zinedine Zidane \'00', 'Thierry Henry \'00', 'Fernando Torres \'08', 'Andres Iniesta \'12'] },
  { era: '2016 — 2024', stars: ['Cristiano Ronaldo \'16', 'Gianluigi Donnarumma \'21', 'Toni Kroos \'24', 'Lamine Yamal \'24'] }
]
const tournamentEras = computed(() => tournamentEraMeta.map((meta, i) => ({
  ...meta,
  title: t(`landing.era_${i + 1}_title`),
  subtitle: t(`landing.era_${i + 1}_subtitle`),
  tag: t(`landing.era_${i + 1}_tag`)
})))
</script>

<template>
  <div class="relative space-y-16 sm:space-y-24 max-w-full overflow-x-clip">
    <!-- ==================== HERO SECTION ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Left: Headline, Value Prop & CTAs -->
        <div class="lg:col-span-7 space-y-6 text-left min-w-0">
          <!-- Championship Eyebrow Badge (WCAG AAA Compliant High Contrast) -->
          <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 shadow-sm backdrop-blur-md">
            <AppLogo
              variant="icon"
              size="sm"
            />
            <span class="text-xs font-mono font-bold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300">
              {{ $t('landing.hero_eyebrow') }}
            </span>
          </div>

          <!-- Main Championship Headline -->
          <h1 class="text-3xl sm:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.1] break-words">
            {{ $t('landing.hero_headline_prefix') }} <br>
            <span class="gold-text">{{ $t('landing.hero_headline_highlight') }}</span>
          </h1>

          <!-- Value Prop Paragraph -->
          <p class="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-xl">
            {{ $t('landing.hero_subline') }}
          </p>

          <!-- CTAs with Button-in-Button Architecture -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <NuxtLink
              :to="localePath('/draft/formation')"
              class="btn-nested bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white shadow-lg shadow-emerald-800/25 justify-between sm:justify-start cursor-pointer font-bold w-full sm:w-auto"
            >
              <span>{{ $t('landing.cta_start') }}</span>
              <span class="btn-nested-icon bg-emerald-900 text-white">
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 text-white"
                  aria-hidden="true"
                />
              </span>
            </NuxtLink>

            <UButton
              to="#roulette-preview"
              size="lg"
              variant="outline"
              color="neutral"
              class="rounded-full px-5 font-bold text-zinc-900 dark:text-zinc-100 w-full sm:w-auto justify-center"
              :label="$t('landing.cta_explore')"
            />
          </div>

          <!-- Live Database Stats Ticker -->
          <div class="pt-6 border-t border-zinc-200 dark:border-white/10 grid grid-cols-3 gap-2 sm:gap-4 max-w-full">
            <div>
              <p class="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                17
              </p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                {{ $t('landing.stat_tournaments') }}
              </p>
            </div>
            <div>
              <p class="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                4,658
              </p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                {{ $t('landing.stat_real_players') }}
              </p>
            </div>
            <div>
              <p class="text-2xl font-black font-mono text-zinc-900 dark:text-white">
                205
              </p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                {{ $t('landing.stat_historic_squads') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Interactive Tactical Legend Card Fan -->
        <div class="lg:col-span-5 flex flex-col items-center">
          <div class="w-full max-w-sm space-y-3">
            <!-- Active Legendary Card (Clean single surface-card with subtle gold highlight) -->
            <div class="surface-card p-5 space-y-4 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.5)]">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase font-mono font-bold tracking-[0.2em] text-emerald-800 dark:text-emerald-300">
                  {{ $t('landing.featured_legend') }}
                </span>
                <span class="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-white/10 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                  {{ $t('landing.historical_prime_ovr') }}
                </span>
              </div>

              <!-- Foil Card Display -->
              <PlayerFoilCard
                :player="currentLegend"
                :is-interactive="true"
              />

              <!-- Interactive Legend Switcher Tabs -->
              <div class="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  v-for="(leg, idx) in showcaseLegends"
                  :key="leg.id"
                  type="button"
                  class="py-1.5 px-2 rounded-lg text-center font-mono text-xs font-bold transition-all border cursor-pointer"
                  :class="activeLegendIndex === idx
                    ? 'bg-emerald-600/20 dark:bg-emerald-500/20 border-emerald-600 dark:border-emerald-400 text-emerald-900 dark:text-emerald-200 shadow-sm font-black'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700'"
                  @click="activeLegendIndex = idx"
                >
                  '{{ String(leg.year).slice(2) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== LIVE ROULETTE DEMO SECTION ==================== -->
    <section
      id="roulette-preview"
      class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6"
    >
      <div class="text-center max-w-xl mx-auto mb-8 space-y-2">
        <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          {{ $t('landing.roulette_heading') }}
        </h2>
        <p class="text-zinc-700 dark:text-zinc-300 text-sm">
          {{ $t('landing.roulette_description') }}
        </p>
      </div>

      <!-- Live Spin Widget (Clean single surface-card) -->
      <div class="max-w-md mx-auto surface-card p-6 text-center space-y-5">
        <div class="flex items-center justify-center gap-3">
          <CountryFlag
            :country="previewSpinCountry"
            size="lg"
          />
          <div class="text-left">
            <span class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest block">
              {{ $t('landing.roulette_squad_label', { year: previewSpinYear }) }}
            </span>
            <h3 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              {{ previewSpinCountryName }}
            </h3>
          </div>
        </div>

        <div class="flex justify-center gap-3">
          <button
            type="button"
            class="rounded-full px-6 py-2.5 font-bold bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white cursor-pointer shadow-md text-sm inline-flex items-center gap-2 transition-all disabled:opacity-50"
            :disabled="isSpinningPreview"
            @click="spinPreview"
          >
            <UIcon
              name="i-lucide-dices"
              class="size-4 text-white"
              aria-hidden="true"
            />
            <span>{{ isSpinningPreview ? $t('landing.roulette_spin_active') : $t('landing.roulette_spin_idle') }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ==================== 4 ERAS BENTO GRID ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
      <div class="max-w-xl mb-8 space-y-2">
        <span class="text-xs font-mono uppercase tracking-[0.2em] font-bold text-emerald-800 dark:text-emerald-300">
          {{ $t('landing.eras_eyebrow') }}
        </span>
        <h2 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
          {{ $t('landing.eras_heading') }}
        </h2>
        <p class="text-zinc-700 dark:text-zinc-300 text-sm">
          {{ $t('landing.eras_description') }}
        </p>
      </div>

      <!-- Bento Grid (Clean single surface-cards) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="(era, i) in tournamentEras"
          :key="i"
          class="surface-card p-6 space-y-4 flex flex-col justify-between"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                {{ era.era }}
              </span>
              <span class="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-white/10 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                {{ era.tag }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              {{ era.title }}
            </h3>
            <p class="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {{ era.subtitle }}
            </p>
          </div>

          <!-- Notable Stars Tags -->
          <div class="pt-3 border-t border-zinc-200 dark:border-white/10">
            <p class="text-xs uppercase font-mono tracking-widest text-zinc-700 dark:text-zinc-300 mb-1.5 font-bold">
              {{ $t('landing.eras_notable_icons') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="star in era.stars"
                :key="star"
                class="px-2.5 py-1 rounded text-xs font-bold bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
              >
                {{ star }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== FOOTER CTA WITH CHAMPIONSHIP GOLD GLOW ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
      <div class="surface-card p-8 sm:p-12 space-y-5 max-w-2xl mx-auto border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent shadow-[0_10px_40px_rgba(245,158,11,0.1)]">
        <UIcon
          name="i-lucide-trophy"
          class="size-12 text-gold-400 mx-auto animate-bounce"
          aria-hidden="true"
        />
        <h2 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
          {{ $t('landing.footer_cta_heading_prefix') }} <span class="gold-text">{{ $t('landing.footer_cta_heading_highlight') }}</span>
        </h2>
        <p class="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base max-w-md mx-auto">
          {{ $t('landing.footer_cta_description') }}
        </p>
        <div class="pt-2">
          <NuxtLink
            :to="localePath('/draft/formation')"
            class="btn-nested bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white shadow-xl shadow-emerald-800/25 mx-auto inline-flex font-bold"
          >
            <span>{{ $t('landing.cta_start') }}</span>
            <span class="btn-nested-icon bg-emerald-900 text-white">
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-white"
                aria-hidden="true"
              />
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
