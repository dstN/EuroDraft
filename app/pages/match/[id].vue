<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })
const route = useRoute()
const tournament = useTournamentStore()

const matchId = computed(() => route.params.id as string)

// Find the match in tournament player matches or groups or knockouts
const match = computed<MatchResult | undefined>(() => {
  const allMatches = [
    ...tournament.groups.flatMap(g => g.matches),
    ...tournament.knockoutBracket.quarterFinals,
    ...tournament.knockoutBracket.semiFinals,
    ...(tournament.knockoutBracket.final ? [tournament.knockoutBracket.final] : [])
  ]
  return allMatches.find(m => m.id === matchId.value)
})

// Ticker progressive animation state
const revealedEvents = ref<number>(0)
const isPlaying = ref(true)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (match.value?.events) {
    revealedEvents.value = 1
    timer = setInterval(() => {
      if (!match.value) return
      if (revealedEvents.value < match.value.events.length) {
        revealedEvents.value++
      } else {
        isPlaying.value = false
        if (timer !== null) clearInterval(timer)
      }
    }, 600)
  }
})

onUnmounted(() => {
  if (timer !== null) clearInterval(timer)
})

function showAll() {
  if (match.value) {
    revealedEvents.value = match.value.events.length
    isPlaying.value = false
    if (timer !== null) clearInterval(timer)
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
    <!-- Back to tournament -->
    <div>
      <UButton
        to="/tournament"
        variant="ghost"
        color="neutral"
        size="sm"
        leading-icon="i-lucide-arrow-left"
        label="Back to Tournament Hub"
        class="font-semibold"
      />
    </div>

    <template v-if="match">
      <!-- Scoreboard Header Card (Clean surface-card) -->
      <div class="surface-card p-6 sm:p-8 space-y-6">
        <div class="text-center">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono tracking-[0.2em] font-bold">
            {{ match.phase }}
          </span>
        </div>

        <div class="flex items-center justify-between gap-4">
          <!-- Team A -->
          <div class="flex-1 flex flex-col items-center text-center space-y-2">
            <CountryFlag
              :country="match.teamA.team.country"
              size="lg"
            />
            <h2 class="text-base sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              {{ match.teamA.team.countryName }}
            </h2>
            <p class="text-xs text-zinc-400 font-mono font-bold">
              OVR {{ match.teamA.team.averageOVR }}
            </p>
          </div>

          <!-- Score -->
          <div class="text-center px-4">
            <div class="font-mono text-4xl sm:text-5xl font-black text-emerald-500 dark:text-emerald-400 tracking-wider drop-shadow-md">
              {{ match.teamA.goals }} – {{ match.teamB.goals }}
            </div>
            <p
              v-if="match.penalties"
              class="text-xs text-zinc-400 mt-1 font-mono font-bold"
            >
              ({{ match.penalties.teamA }} – {{ match.penalties.teamB }} penalties)
            </p>
            <p
              v-else-if="match.extraTime"
              class="text-xs text-zinc-400 mt-1 font-mono font-semibold"
            >
              after extra time
            </p>
          </div>

          <!-- Team B -->
          <div class="flex-1 flex flex-col items-center text-center space-y-2">
            <CountryFlag
              :country="match.teamB.team.country"
              size="lg"
            />
            <h2 class="text-base sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              {{ match.teamB.team.countryName }}
            </h2>
            <p class="text-xs text-zinc-400 font-mono font-bold">
              OVR {{ match.teamB.team.averageOVR }}
            </p>
          </div>
        </div>

        <!-- Section Comparison Tactical Bars -->
        <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2 text-xs">
          <div class="flex justify-between items-center text-zinc-400 font-mono">
            <span class="font-bold text-zinc-300">{{ match.teamA.team.attackRating }}</span>
            <span class="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Attack</span>
            <span class="font-bold text-zinc-300">{{ match.teamB.team.attackRating }}</span>
          </div>
          <div class="flex justify-between items-center text-zinc-400 font-mono">
            <span class="font-bold text-zinc-300">{{ match.teamA.team.midfieldRating }}</span>
            <span class="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Midfield</span>
            <span class="font-bold text-zinc-300">{{ match.teamB.team.midfieldRating }}</span>
          </div>
          <div class="flex justify-between items-center text-zinc-400 font-mono">
            <span class="font-bold text-zinc-300">{{ match.teamA.team.defenseRating }}</span>
            <span class="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Defense</span>
            <span class="font-bold text-zinc-300">{{ match.teamB.team.defenseRating }}</span>
          </div>
        </div>
      </div>

      <!-- Live Ticker Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
            <UIcon
              name="i-lucide-activity"
              class="size-4 text-emerald-400"
            />
            {{ $t('match.live_ticker') }}
          </h3>
          <UButton
            v-if="isPlaying"
            size="xs"
            variant="outline"
            color="neutral"
            label="Fast Forward"
            trailing-icon="i-lucide-fast-forward"
            class="rounded-full font-semibold"
            @click="showAll"
          />
        </div>

        <!-- Events List -->
        <div class="space-y-2.5">
          <div
            v-for="(event, i) in match.events.slice(0, revealedEvents)"
            :key="i"
            class="ticker-line rounded-xl p-4 border flex items-start gap-3.5 text-sm transition-all shadow-sm"
            :class="[
              event.type === 'goal'
                ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-900 dark:text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : event.type === 'yellow-card' || event.type === 'red-card'
                  ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/40 text-amber-900 dark:text-amber-100'
                  : event.type === 'extra-time' || event.type === 'penalty-shootout'
                    ? 'bg-violet-500/10 dark:bg-violet-950/30 border-violet-500/40 text-violet-900 dark:text-violet-100'
                    : 'bg-white/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-white/5 text-zinc-700 dark:text-zinc-300'
            ]"
          >
            <span class="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 w-8 shrink-0">
              {{ event.minute }}'
            </span>
            <div class="flex-1">
              <p class="leading-relaxed font-medium">
                {{ event.description }}
              </p>
            </div>
            <span
              v-if="event.type === 'goal'"
              class="font-mono font-black text-xs px-2 py-0.5 rounded bg-emerald-500 text-white shrink-0 shadow-sm"
            >
              {{ event.scoreA }}–{{ event.scoreB }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="text-center py-16 space-y-4">
        <p class="text-zinc-400">
          Match not found or tournament not yet simulated.
        </p>
        <UButton
          to="/tournament"
          color="primary"
          label="Return to Tournament"
          class="rounded-full px-6 font-semibold"
        />
      </div>
    </template>
  </div>
</template>
