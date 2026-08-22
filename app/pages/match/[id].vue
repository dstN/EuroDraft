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
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-8">
    <!-- Back to tournament -->
    <div>
      <UButton
        to="/tournament"
        variant="ghost"
        color="neutral"
        size="sm"
        leading-icon="i-lucide-arrow-left"
        label="Back to Tournament"
      />
    </div>

    <template v-if="match">
      <!-- Scoreboard Header Card -->
      <div class="rounded-2xl border border-white/10 p-6 bg-surface-900/80 backdrop-blur-xl shadow-2xl space-y-6">
        <div class="text-center">
          <UBadge
            color="primary"
            variant="soft"
            size="xs"
            class="uppercase tracking-widest font-mono font-bold"
          >
            {{ match.phase }}
          </UBadge>
        </div>

        <div class="flex items-center justify-between gap-4">
          <!-- Team A -->
          <div class="flex-1 flex flex-col items-center text-center space-y-2">
            <CountryFlag
              :country="match.teamA.team.country"
              size="lg"
            />
            <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
              {{ match.teamA.team.countryName }}
            </h2>
            <p class="text-xs text-zinc-400 font-mono">
              OVR {{ match.teamA.team.averageOVR }}
            </p>
          </div>

          <!-- Score -->
          <div class="text-center px-4">
            <div class="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-wider">
              {{ match.teamA.goals }} – {{ match.teamB.goals }}
            </div>
            <p
              v-if="match.penalties"
              class="text-xs text-zinc-400 mt-1 font-mono"
            >
              ({{ match.penalties.teamA }} – {{ match.penalties.teamB }} pens)
            </p>
            <p
              v-else-if="match.extraTime"
              class="text-xs text-zinc-400 mt-1 font-mono"
            >
              a.e.t.
            </p>
          </div>

          <!-- Team B -->
          <div class="flex-1 flex flex-col items-center text-center space-y-2">
            <CountryFlag
              :country="match.teamB.team.country"
              size="lg"
            />
            <h2 class="text-base sm:text-lg font-bold text-white tracking-tight">
              {{ match.teamB.team.countryName }}
            </h2>
            <p class="text-xs text-zinc-400 font-mono">
              OVR {{ match.teamB.team.averageOVR }}
            </p>
          </div>
        </div>

        <!-- Section Comparison Bars -->
        <div class="pt-4 border-t border-white/5 space-y-2 text-xs">
          <div class="flex justify-between text-zinc-400 font-mono">
            <span>{{ match.teamA.team.attackRating }}</span>
            <span class="text-zinc-500 uppercase">Attack</span>
            <span>{{ match.teamB.team.attackRating }}</span>
          </div>
          <div class="flex justify-between text-zinc-400 font-mono">
            <span>{{ match.teamA.team.midfieldRating }}</span>
            <span class="text-zinc-500 uppercase">Midfield</span>
            <span>{{ match.teamB.team.midfieldRating }}</span>
          </div>
          <div class="flex justify-between text-zinc-400 font-mono">
            <span>{{ match.teamA.team.defenseRating }}</span>
            <span class="text-zinc-500 uppercase">Defense</span>
            <span>{{ match.teamB.team.defenseRating }}</span>
          </div>
        </div>
      </div>

      <!-- Live Ticker Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <UIcon
              name="i-lucide-activity"
              class="size-4 text-emerald-400"
            />
            {{ $t('match.live_ticker') }}
          </h3>
          <UButton
            v-if="isPlaying"
            size="xs"
            variant="ghost"
            color="neutral"
            label="Fast Forward"
            trailing-icon="i-lucide-fast-forward"
            @click="showAll"
          />
        </div>

        <!-- Events List -->
        <div class="space-y-2.5">
          <div
            v-for="(event, i) in match.events.slice(0, revealedEvents)"
            :key="i"
            class="ticker-line rounded-xl p-3.5 border flex items-start gap-3 text-sm transition-all"
            :class="[
              event.type === 'goal'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : event.type === 'yellow-card' || event.type === 'red-card'
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : 'bg-zinc-900/50 border-white/5 text-zinc-300'
            ]"
          >
            <span class="font-mono text-xs font-bold text-zinc-400 w-8 shrink-0">
              {{ event.minute }}'
            </span>
            <div class="flex-1">
              <p class="leading-relaxed">
                {{ event.description }}
              </p>
            </div>
            <span
              v-if="event.type === 'goal'"
              class="font-mono font-bold text-xs text-emerald-400 shrink-0"
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
        />
      </div>
    </template>
  </div>
</template>
