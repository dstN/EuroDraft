<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

const props = defineProps<{
  match: MatchResult
  playerTeamId: string
  speedMs?: number
}>()

const emit = defineEmits<{
  (e: 'completed'): void
}>()

const revealedEventsCount = ref(1)
const isFinished = ref(false)

const currentEvents = computed(() => {
  return props.match.events.slice(0, revealedEventsCount.value)
})

const currentScoreA = computed(() => {
  const goalEvents = currentEvents.value.filter(e => e.type === 'goal')
  if (goalEvents.length === 0) return 0
  return goalEvents[goalEvents.length - 1]?.scoreA ?? 0
})

const currentScoreB = computed(() => {
  const goalEvents = currentEvents.value.filter(e => e.type === 'goal')
  if (goalEvents.length === 0) return 0
  return goalEvents[goalEvents.length - 1]?.scoreB ?? 0
})

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  revealedEventsCount.value = 1
  const intervalMs = props.speedMs || 450

  timer = setInterval(() => {
    if (revealedEventsCount.value < props.match.events.length) {
      revealedEventsCount.value++
    } else {
      isFinished.value = true
      if (timer) clearInterval(timer)
      setTimeout(() => {
        emit('completed')
      }, 900)
    }
  }, intervalMs)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function skipCurrentMatch() {
  revealedEventsCount.value = props.match.events.length
  isFinished.value = true
  if (timer) clearInterval(timer)
  setTimeout(() => {
    emit('completed')
  }, 200)
}
</script>

<template>
  <div class="surface-card p-5 sm:p-6 space-y-5 animate-scale-in">
    <!-- Live Stage Header -->
    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full bg-rose-600 animate-ping" />
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-rose-700 dark:text-rose-400">
          Live Match · {{ match.phase.toUpperCase() }}
        </span>
      </div>

      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        trailing-icon="i-lucide-fast-forward"
        label="Fast Forward Match"
        class="font-mono text-xs font-bold cursor-pointer"
        @click="skipCurrentMatch"
      />
    </div>

    <!-- Live Scoreboard -->
    <div class="flex items-center justify-between gap-4 py-2">
      <!-- Team A -->
      <div class="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
        <CountryFlag
          :country="match.teamA.team.country"
          size="lg"
        />
        <h3
          class="text-sm sm:text-base font-black truncate max-w-full"
          :class="match.teamA.team.id === playerTeamId ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'"
        >
          {{ match.teamA.team.countryName }}
        </h3>
        <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-bold">
          OVR {{ match.teamA.team.averageOVR }}
        </span>
      </div>

      <!-- Live Score Numbers with Pop Animation on Change -->
      <div class="text-center px-4 shrink-0">
        <div class="font-mono text-3xl sm:text-5xl font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
          {{ currentScoreA }} – {{ currentScoreB }}
        </div>
        <p
          v-if="isFinished && match.penalties"
          class="text-xs font-mono text-amber-700 dark:text-amber-300 font-bold mt-1"
        >
          ({{ match.penalties.teamA }}–{{ match.penalties.teamB }} pens)
        </p>
        <p
          v-else
          class="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 mt-1 font-bold"
        >
          {{ isFinished ? 'Full-Time' : 'In Progress' }}
        </p>
      </div>

      <!-- Team B -->
      <div class="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
        <CountryFlag
          :country="match.teamB.team.country"
          size="lg"
        />
        <h3
          class="text-sm sm:text-base font-black truncate max-w-full"
          :class="match.teamB.team.id === playerTeamId ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'"
        >
          {{ match.teamB.team.countryName }}
        </h3>
        <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-bold">
          OVR {{ match.teamB.team.averageOVR }}
        </span>
      </div>
    </div>

    <!-- Live Commentary Feed -->
    <div class="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/10 max-h-48 overflow-y-auto custom-scroll pr-1">
      <div
        v-for="(ev, idx) in currentEvents"
        :key="idx"
        class="flex items-start gap-2.5 text-xs p-2 rounded-lg transition-all"
        :class="[
          ev.type === 'goal'
            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 shadow-sm'
            : ev.type === 'yellow-card' || ev.type === 'red-card'
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30'
              : 'bg-zinc-100 dark:bg-white/5 text-zinc-800 dark:text-zinc-200'
        ]"
      >
        <span class="font-mono font-bold text-zinc-600 dark:text-zinc-400 w-7 shrink-0">{{ ev.minute }}'</span>
        <span class="flex-1 leading-snug">{{ ev.description }}</span>
        <span
          v-if="ev.type === 'goal'"
          class="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-emerald-700 text-white shrink-0"
        >
          {{ ev.scoreA }}–{{ ev.scoreB }}
        </span>
      </div>
    </div>
  </div>
</template>
