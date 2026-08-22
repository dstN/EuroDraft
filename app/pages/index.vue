<script setup lang="ts">
import type { Player } from '~/types'
import PlayerFoilCard from '~/components/draft/PlayerFoilCard.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })

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
    enrichmentSource: 'fifa',
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
    enrichmentSource: 'fifa',
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
    enrichmentSource: 'fifa',
    stats: { overall: 91, pace: 94, shooting: 91, passing: 84, dribbling: 93, defending: 45, physical: 82 }
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
    enrichmentSource: 'fifa',
    stats: { overall: 83, pace: 88, shooting: 79, passing: 83, dribbling: 89, defending: 38, physical: 68 }
  }
]

const activeLegendIndex = ref(0)
const currentLegend = computed(() => showcaseLegends[activeLegendIndex.value]!)

// Mini Interactive Roulette Preview on Homepage
const previewSpinCountry = ref('nl')
const previewSpinCountryName = ref('Netherlands')
const previewSpinYear = ref(1988)
const isSpinningPreview = ref(false)

const previewPool = [
  { code: 'nl', name: 'Netherlands', year: 1988 },
  { code: 'fr', name: 'France', year: 2000 },
  { code: 'es', name: 'Spain', year: 2012 },
  { code: 'de', name: 'Germany', year: 1996 },
  { code: 'it', name: 'Italy', year: 2020 },
  { code: 'pt', name: 'Portugal', year: 2016 },
  { code: 'dk', name: 'Denmark', year: 1992 },
  { code: 'gr', name: 'Greece', year: 2004 },
  { code: 'gb-eng', name: 'England', year: 1996 },
  { code: 'cz', name: 'Czech Republic', year: 1996 }
]

function spinPreview() {
  if (isSpinningPreview.value) return
  isSpinningPreview.value = true
  let step = 0
  const maxSteps = 10
  const interval = setInterval(() => {
    const pick = previewPool[Math.floor(Math.random() * previewPool.length)]!
    previewSpinCountry.value = pick.code
    previewSpinCountryName.value = pick.name
    previewSpinYear.value = pick.year
    step++
    if (step >= maxSteps) {
      clearInterval(interval)
      isSpinningPreview.value = false
    }
  }, 75)
}

// 4 Eras Bento Grid Data
const tournamentEras = [
  {
    era: '1960 — 1980',
    title: 'The Pioneer Era',
    subtitle: 'From Yashin\'s penalty saves to Panenka\'s daring chip that created football history.',
    color: 'from-amber-500/20 to-transparent',
    borderColor: 'border-amber-500/30',
    tag: '4 Teams Era',
    stars: ['Lev Yashin \'60', 'Gerd Müller \'72', 'Franz Beckenbauer \'72', 'Antonín Panenka \'76']
  },
  {
    era: '1984 — 1992',
    title: 'The Golden Age of Strikers',
    subtitle: 'Platini\'s magical 9-goal masterpiece, Van Basten\'s volley, and Denmark\'s fairytale.',
    color: 'from-emerald-500/20 to-transparent',
    borderColor: 'border-emerald-500/30',
    tag: '8 Teams Era',
    stars: ['Michel Platini \'84', 'Marco van Basten \'88', 'Ruud Gullit \'88', 'Peter Schmeichel \'92']
  },
  {
    era: '1996 — 2004',
    title: 'Superstars & Golden Goals',
    subtitle: 'Zidane, Figo, Nedved, and the golden goal drama before Greece shocked the world.',
    color: 'from-blue-500/20 to-transparent',
    borderColor: 'border-blue-500/30',
    tag: '16 Teams Era',
    stars: ['Zinedine Zidane \'00', 'Pavel Nedved \'04', 'Thierry Henry \'00', 'Wayne Rooney \'04']
  },
  {
    era: '2008 — 2024',
    title: 'Dynasties & Next Generation',
    subtitle: 'Spain\'s back-to-back dominance, CR7\'s triumph, and Yamal\'s historic 2024 arrival.',
    color: 'from-purple-500/20 to-transparent',
    borderColor: 'border-purple-500/30',
    tag: '24 Teams Era',
    stars: ['Andres Iniesta \'12', 'Cristiano Ronaldo \'16', 'Toni Kroos \'24', 'Lamine Yamal \'24']
  }
]
</script>

<template>
  <div class="relative space-y-24">
    <!-- Smooth Seamless Atmospheric Glow (Fades naturally to 100% transparent without any cut-off) -->
    <div
      class="absolute top-0 inset-x-0 h-[700px] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.14),transparent_100%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent_100%)]" />
    </div>

    <!-- ==================== HERO SECTION ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Left: Headline, Value Prop & CTAs -->
        <div class="lg:col-span-7 space-y-6 text-left">
          <!-- Championship Eyebrow Badge -->
          <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/60 shadow-sm backdrop-blur-md">
            <span class="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span class="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
              UEFA EURO 1960 — 2024
            </span>
          </div>

          <!-- Main Championship Headline -->
          <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.08]">
            Draft Europe's <br>
            <span class="gold-text">Greatest Squads.</span>
          </h1>

          <!-- Value Prop Paragraph -->
          <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl">
            Choose your tactical formation, spin historical nations across 64 years of European Championship history, and build the ultimate XI to conquer the tournament.
          </p>

          <!-- CTAs with Button-in-Button Architecture -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <NuxtLink
              to="/draft/formation"
              class="btn-nested bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 justify-between sm:justify-start cursor-pointer"
            >
              <span>{{ $t('landing.cta_start') }}</span>
              <span class="btn-nested-icon bg-emerald-600">
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 text-white"
                />
              </span>
            </NuxtLink>

            <UButton
              to="#roulette-preview"
              size="lg"
              variant="outline"
              color="neutral"
              class="rounded-full px-5 font-semibold"
              label="Explore Eras & Roster"
            />
          </div>

          <!-- Live Database Stats Ticker -->
          <div class="pt-6 border-t border-zinc-200 dark:border-white/10 grid grid-cols-3 gap-4 max-w-md">
            <div>
              <p class="text-2xl font-black font-mono text-zinc-900 dark:text-white">
                17
              </p>
              <p class="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Tournaments
              </p>
            </div>
            <div>
              <p class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                4,658
              </p>
              <p class="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Real Players
              </p>
            </div>
            <div>
              <p class="text-2xl font-black font-mono text-zinc-900 dark:text-white">
                205
              </p>
              <p class="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Historic Squads
              </p>
            </div>
          </div>
        </div>

        <!-- Right: Interactive Tactical Legend Card Fan -->
        <div class="lg:col-span-5 flex flex-col items-center">
          <div class="w-full max-w-sm space-y-3">
            <!-- Active Legendary Card (Clean single surface-card) -->
            <div class="surface-card p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase font-mono font-bold tracking-[0.2em] text-emerald-400">
                  Featured Legend
                </span>
                <UBadge
                  color="primary"
                  variant="subtle"
                  size="xs"
                  class="font-mono font-bold"
                >
                  Authentic FIFA OVR
                </UBadge>
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
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-zinc-800/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-700/60'"
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
          How the Roulette Works
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 text-sm">
          Each draft round, the tournament wheel spins a random historical nation and year. Pick one player from that squad to lock into your tactical formation!
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
            <span class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
              Euro {{ previewSpinYear }}
            </span>
            <h3 class="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              {{ previewSpinCountryName }}
            </h3>
          </div>
        </div>

        <div class="flex justify-center gap-3">
          <UButton
            size="md"
            color="primary"
            variant="solid"
            leading-icon="i-lucide-dices"
            :label="isSpinningPreview ? 'Spinning Wheel...' : 'Test Spin the Wheel'"
            :loading="isSpinningPreview"
            class="rounded-full px-6 font-bold cursor-pointer"
            @click="spinPreview"
          />
        </div>
      </div>
    </section>

    <!-- ==================== 4 ERAS BENTO GRID ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
      <div class="max-w-xl mb-8 space-y-2">
        <span class="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-emerald-600 dark:text-emerald-400">
          Historical Depth
        </span>
        <h2 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
          Four Eras of Legends.
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 text-sm">
          Every Euro tournament generation brings unique legends, iconic tactical styles, and authentic player ratings.
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
              <span class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                {{ era.era }}
              </span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
                class="font-mono text-[10px]"
              >
                {{ era.tag }}
              </UBadge>
            </div>
            <h3 class="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              {{ era.title }}
            </h3>
            <p class="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
              {{ era.subtitle }}
            </p>
          </div>

          <!-- Notable Stars Tags -->
          <div class="pt-3 border-t border-zinc-200 dark:border-white/5">
            <p class="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-1.5 font-semibold">
              Notable Icons
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="star in era.stars"
                :key="star"
                class="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/8 text-zinc-700 dark:text-zinc-300"
              >
                {{ star }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== FOOTER CTA ==================== -->
    <section class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
      <div class="surface-card p-8 sm:p-12 space-y-5 max-w-2xl mx-auto">
        <UIcon
          name="i-lucide-trophy"
          class="size-10 text-gold-400 mx-auto"
        />
        <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
          Ready to Build Your Champion XI?
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 text-sm max-w-md mx-auto">
          Choose your formation, conquer the draft roulette, and test your dream team in a simulated European Championship.
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/draft/formation"
            class="btn-nested bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/20 mx-auto inline-flex"
          >
            <span>{{ $t('landing.cta_start') }}</span>
            <span class="btn-nested-icon bg-emerald-600">
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-white"
              />
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
