<script setup lang="ts">
import CountryFlag from '~/components/shared/CountryFlag.vue'

const countryName = useCountryName()

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

// Cycling display during spin -- deliberately decoupled from the target props so
// the reveal only happens via this component's own animation timing, never as a
// side effect of the store updating (which happens instantly, before any spin
// animation starts -- see settleToTarget()/the props watcher below).
const displayCountry = ref(props.targetCountry || 'nl')
const displayYear = ref(props.targetYear || 1988)
const displayCountryName = ref(props.targetCountryName || countryName(displayCountry.value))

const SAMPLE_NATIONS = [
  'nl', 'fr', 'es', 'de', 'it', 'pt', 'dk', 'gr', 'gb-eng', 'cz', 'hr', 'be', 'pl', 'tr', 'at', 'se'
]

const SAMPLE_YEARS = [
  1964, 1968, 1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024
]

let spinInterval: ReturnType<typeof setInterval> | null = null

function settleToTarget() {
  displayCountry.value = props.targetCountry || 'nl'
  displayCountryName.value = props.targetCountryName || countryName(displayCountry.value)
  displayYear.value = props.targetYear || 1988
}

watch(() => props.isSpinning, (spinning) => {
  if (spinning) {
    let tick = 0
    const maxTicks = 8
    spinInterval = setInterval(() => {
      if (props.spinType === 'nation' || props.spinType === 'all') {
        const randCountry = SAMPLE_NATIONS[Math.floor(Math.random() * SAMPLE_NATIONS.length)]!
        displayCountry.value = randCountry
        displayCountryName.value = countryName(randCountry)
      } else {
        displayCountry.value = props.targetCountry || 'nl'
        displayCountryName.value = props.targetCountryName || countryName(displayCountry.value)
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
        settleToTarget()
        emit('spin-complete')
      }
    }, 65)
  } else {
    settleToTarget()
  }
}, { immediate: true })

// Covers changes to the target that happen *without* a spin animation (e.g. the
// very first squad on page load, set directly by the store with no isSpinning
// transition at all) -- without this, the flag/name silently keep showing their
// initial fallback ('nl') forever, since the watcher above only reacts to
// isSpinning changing. Guarded so it never fights the cycling animation above.
watch([() => props.targetCountry, () => props.targetYear, () => props.targetCountryName], () => {
  if (!props.isSpinning) settleToTarget()
})

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
          {{ $t('draft.european_squad_year', { year: displayYear }) }}
        </p>
        <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
          {{ displayCountryName }}
        </h2>
      </div>
    </div>
  </div>
</template>
