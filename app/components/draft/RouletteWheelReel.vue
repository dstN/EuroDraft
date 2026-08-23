<script setup lang="ts">
import CountryFlag from '~/components/shared/CountryFlag.vue'

const props = withDefaults(defineProps<{
  isSpinning: boolean
  targetCountry: string | null
  targetYear: number | null
  targetCountryName?: string
  spinType?: 'all' | 'nation' | 'year'
}>(), {
  spinType: 'all'
})

const emit = defineEmits<{
  (e: 'spin-complete'): void
}>()

// Cycling display during spin
const displayCountry = ref(props.targetCountry || 'nl')
const displayYear = ref(props.targetYear || 1988)

const SAMPLE_NATIONS = [
  'nl', 'fr', 'es', 'de', 'it', 'pt', 'dk', 'gr', 'gb-eng', 'cz', 'hr', 'be', 'pl', 'tr', 'at', 'se'
]

const SAMPLE_YEARS = [
  1964, 1968, 1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024
]

let spinInterval: ReturnType<typeof setInterval> | null = null

watch(() => props.isSpinning, (spinning) => {
  if (spinning) {
    let tick = 0
    const maxTicks = 8
    spinInterval = setInterval(() => {
      if (props.spinType === 'nation' || props.spinType === 'all') {
        const randCountry = SAMPLE_NATIONS[Math.floor(Math.random() * SAMPLE_NATIONS.length)]!
        displayCountry.value = randCountry
      } else {
        displayCountry.value = props.targetCountry || 'nl'
      }

      if (props.spinType === 'year' || props.spinType === 'all') {
        const randYear = SAMPLE_YEARS[Math.floor(Math.random() * SAMPLE_YEARS.length)]!
        displayYear.value = randYear
      } else {
        displayYear.value = props.targetYear || 1988
      }

      tick++
      if (tick >= maxTicks) {
        if (spinInterval) clearInterval(spinInterval)
        displayCountry.value = props.targetCountry || 'nl'
        displayYear.value = props.targetYear || 1988
        emit('spin-complete')
      }
    }, 65)
  } else {
    displayCountry.value = props.targetCountry || 'nl'
    displayYear.value = props.targetYear || 1988
  }
}, { immediate: true })

onUnmounted(() => {
  if (spinInterval) clearInterval(spinInterval)
})
</script>

<template>
  <div class="relative overflow-hidden py-1">
    <!-- Slot Reel Display -->
    <div
      class="flex items-center gap-3 transition-transform duration-200"
      :class="isSpinning ? 'scale-105 opacity-85 blur-[0.5px]' : 'scale-100 opacity-100'"
    >
      <div
        class="transition-transform duration-150 shrink-0"
        :class="isSpinning ? 'animate-bounce' : ''"
      >
        <CountryFlag
          :country="displayCountry"
          size="lg"
        />
      </div>

      <div class="min-w-0">
        <p class="text-xs font-mono font-black uppercase tracking-[0.15em] text-emerald-950 dark:text-emerald-300">
          European Squad · {{ displayYear }}
        </p>
        <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
          {{ targetCountryName || getCountryName(displayCountry) }}
        </h2>
      </div>
    </div>
  </div>
</template>
