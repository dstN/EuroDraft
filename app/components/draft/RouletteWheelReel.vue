<script setup lang="ts">
import CountryFlag from '~/components/shared/CountryFlag.vue'

const props = defineProps<{
  isSpinning: boolean
  targetCountry: string | null
  targetYear: number | null
  targetCountryName?: string
}>()

const emit = defineEmits<{
  (e: 'spin-complete'): void
}>()

// Cycling display during spin
const displayCountry = ref(props.targetCountry || 'nl')
const displayYear = ref(props.targetYear || 1988)

const SAMPLE_NATIONS = [
  { code: 'nl', year: 1988 },
  { code: 'fr', year: 2000 },
  { code: 'es', year: 2012 },
  { code: 'de', year: 1996 },
  { code: 'it', year: 2020 },
  { code: 'pt', year: 2016 },
  { code: 'dk', year: 1992 },
  { code: 'gr', year: 2004 },
  { code: 'gb-eng', year: 1996 },
  { code: 'cz', year: 1996 },
  { code: 'hr', year: 2018 }
]

let spinInterval: ReturnType<typeof setInterval> | null = null

watch(() => props.isSpinning, (spinning) => {
  if (spinning) {
    let tick = 0
    const maxTicks = 8
    spinInterval = setInterval(() => {
      const pick = SAMPLE_NATIONS[Math.floor(Math.random() * SAMPLE_NATIONS.length)]!
      displayCountry.value = pick.code
      displayYear.value = pick.year
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
        <p class="text-xs font-mono font-bold uppercase tracking-[0.15em] text-emerald-800 dark:text-emerald-300">
          Euro {{ displayYear }} Squad
        </p>
        <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
          {{ targetCountryName || displayCountry.toUpperCase() }}
        </h2>
      </div>
    </div>
  </div>
</template>
