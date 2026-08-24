<script setup lang="ts">
import type { Player, MatchResult, TournamentTeam } from '~/types'
import { useMatchEngine, calculateSectionRatings } from '~/composables/useMatchEngine'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import LiveMatchBroadcast from '~/components/tournament/LiveMatchBroadcast.vue'

definePageMeta({ layout: 'default' })

interface SharedRun {
  teamName: string
  teamEmblem: string
  formation: string
  teamOVR: number
  outcome: string
  lineRatings: { def: number, mid: number, att: number, overall: number }
  squad: Player[]
}

const route = useRoute()
const { simulateMatch } = useMatchEngine()

function extractShareId(input: string): string {
  return input.trim().replace(/^https?:\/\/[^/]+\/r\//, '').replace(/\/+$/, '')
}

const slotA = ref<SharedRun | null>(null)
const slotB = ref<SharedRun | null>(null)
const idInputA = ref('')
const idInputB = ref('')
const loadingA = ref(false)
const loadingB = ref(false)
const errorA = ref('')
const errorB = ref('')

async function loadSlot(which: 'a' | 'b') {
  const raw = which === 'a' ? idInputA.value : idInputB.value
  if (!raw.trim()) return
  const id = extractShareId(raw)

  if (which === 'a') {
    loadingA.value = true
    errorA.value = ''
  } else {
    loadingB.value = true
    errorB.value = ''
  }

  try {
    const res = await $fetch<{ success: boolean, record: SharedRun }>(`/api/share/${id}`)
    if (which === 'a') slotA.value = res.record
    else slotB.value = res.record
  } catch {
    const message = 'Squad not found — check the link and try again.'
    if (which === 'a') errorA.value = message
    else errorB.value = message
  } finally {
    if (which === 'a') loadingA.value = false
    else loadingB.value = false
  }
  matchResult.value = null
}

function clearSlot(which: 'a' | 'b') {
  if (which === 'a') {
    slotA.value = null
    idInputA.value = ''
    errorA.value = ''
  } else {
    slotB.value = null
    idInputB.value = ''
    errorB.value = ''
  }
  matchResult.value = null
}

// Pre-fill from query params (?a=id&b=id) — e.g. linked from a share page's "Compare" CTA
onMounted(() => {
  const qa = route.query.a
  const qb = route.query.b
  if (typeof qa === 'string' && qa) {
    idInputA.value = qa
    loadSlot('a')
  }
  if (typeof qb === 'string' && qb) {
    idInputB.value = qb
    loadSlot('b')
  }
})

const bothLoaded = computed(() => !!slotA.value && !!slotB.value)

function toTournamentTeam(run: SharedRun, id: string): TournamentTeam {
  const ratings = calculateSectionRatings(run.squad)
  return {
    id,
    country: run.teamEmblem || 'eu',
    year: 0,
    countryName: run.teamName,
    squad: run.squad,
    isPlayerTeam: false,
    averageOVR: ratings.averageOVR,
    attackRating: ratings.attackRating,
    midfieldRating: ratings.midfieldRating,
    defenseRating: ratings.defenseRating,
    goalkeepingRating: ratings.goalkeepingRating
  }
}

const matchResult = ref<MatchResult | null>(null)
const isBroadcasting = ref(false)

function simulateShowdown() {
  if (!slotA.value || !slotB.value) return
  const teamA = toTournamentTeam(slotA.value, 'squad-a')
  const teamB = toTournamentTeam(slotB.value, 'squad-b')
  const seed = Math.floor(Math.random() * 1_000_000_000)
  matchResult.value = simulateMatch(teamA, teamB, 'final', seed)
  isBroadcasting.value = true
}

function onBroadcastCompleted() {
  isBroadcasting.value = false
}

const showdownLabel = computed(() => {
  if (!matchResult.value || !slotA.value || !slotB.value) return ''
  const { teamA, teamB, penalties, extraTime } = matchResult.value
  const aetSuffix = extraTime ? ' (AET)' : ''
  if (penalties) {
    const aWon = penalties.teamA > penalties.teamB
    return `${slotA.value.teamName} ${teamA.goals}–${teamB.goals} (${penalties.teamA}–${penalties.teamB} pens) ${slotB.value.teamName} — ${aWon ? slotA.value.teamName : slotB.value.teamName} win on penalties`
  }
  if (teamA.goals === teamB.goals) return `${slotA.value.teamName} ${teamA.goals}–${teamB.goals}${aetSuffix} ${slotB.value.teamName} — Draw`
  const winner = teamA.goals > teamB.goals ? slotA.value.teamName : slotB.value.teamName
  return `${slotA.value.teamName} ${teamA.goals}–${teamB.goals}${aetSuffix} ${slotB.value.teamName} — ${winner} win`
})

function advantageClass(valueA: number, valueB: number, side: 'a' | 'b'): string {
  const mine = side === 'a' ? valueA : valueB
  const other = side === 'a' ? valueB : valueA
  if (mine > other) return 'text-emerald-500 dark:text-emerald-400'
  if (mine < other) return 'text-zinc-500 dark:text-zinc-500'
  return 'text-zinc-700 dark:text-zinc-300'
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-3 sm:px-6 space-y-6">
    <div class="text-center space-y-2 pt-2">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
        Head-to-Head Comparison
      </div>
      <h1 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        Compare Two Dream XIs
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm max-w-lg mx-auto">
        Paste two shared EuroDraft links to compare squads side-by-side and simulate a showdown between them.
      </p>
    </div>

    <!-- Squad Slots -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div class="surface-card p-5 space-y-4">
        <template v-if="!slotA">
          <p class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
            Squad A
          </p>
          <div class="flex gap-2">
            <UInput
              v-model="idInputA"
              placeholder="Paste share link or ID"
              class="flex-1 font-mono text-sm"
              @keyup.enter="loadSlot('a')"
            />
            <UButton
              color="primary"
              :loading="loadingA"
              label="Load"
              @click="loadSlot('a')"
            />
          </div>
          <p
            v-if="errorA"
            class="text-xs text-rose-600 dark:text-rose-400 font-semibold"
          >
            {{ errorA }}
          </p>
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <CountryFlag
                :country="slotA.teamEmblem || 'eu'"
                size="md"
              />
              <div class="min-w-0">
                <h2 class="font-black text-zinc-900 dark:text-white truncate">
                  {{ slotA.teamName }}
                </h2>
                <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-bold">
                  {{ slotA.formation }} · {{ slotA.teamOVR }} OVR
                </p>
              </div>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              @click="clearSlot('a')"
            />
          </div>
        </template>
      </div>

      <div class="surface-card p-5 space-y-4">
        <template v-if="!slotB">
          <p class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
            Squad B
          </p>
          <div class="flex gap-2">
            <UInput
              v-model="idInputB"
              placeholder="Paste share link or ID"
              class="flex-1 font-mono text-sm"
              @keyup.enter="loadSlot('b')"
            />
            <UButton
              color="primary"
              :loading="loadingB"
              label="Load"
              @click="loadSlot('b')"
            />
          </div>
          <p
            v-if="errorB"
            class="text-xs text-rose-600 dark:text-rose-400 font-semibold"
          >
            {{ errorB }}
          </p>
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <CountryFlag
                :country="slotB.teamEmblem || 'eu'"
                size="md"
              />
              <div class="min-w-0">
                <h2 class="font-black text-zinc-900 dark:text-white truncate">
                  {{ slotB.teamName }}
                </h2>
                <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-bold">
                  {{ slotB.formation }} · {{ slotB.teamOVR }} OVR
                </p>
              </div>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              @click="clearSlot('b')"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Side-by-Side Stat Comparison -->
    <div
      v-if="bothLoaded && slotA && slotB"
      class="surface-card p-5 sm:p-6 space-y-4"
    >
      <p class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 text-center">
        Squad Ratings
      </p>
      <div
        v-for="stat in [
          { label: 'Defense', a: slotA.lineRatings.def, b: slotB.lineRatings.def },
          { label: 'Midfield', a: slotA.lineRatings.mid, b: slotB.lineRatings.mid },
          { label: 'Attack', a: slotA.lineRatings.att, b: slotB.lineRatings.att },
          { label: 'Overall', a: slotA.lineRatings.overall, b: slotB.lineRatings.overall }
        ]"
        :key="stat.label"
        class="flex items-center gap-3"
      >
        <span
          class="w-12 text-right font-mono font-black text-lg shrink-0"
          :class="advantageClass(stat.a, stat.b, 'a')"
        >{{ stat.a }}</span>
        <div class="flex-1 flex items-center gap-1">
          <div class="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden flex justify-end">
            <div
              class="h-full bg-emerald-500 rounded-full"
              :style="{ width: `${Math.min(100, (stat.a / Math.max(stat.a, stat.b, 1)) * 100)}%` }"
            />
          </div>
          <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 w-16 text-center shrink-0">{{ stat.label }}</span>
          <div class="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
            <div
              class="h-full bg-sky-500 rounded-full ml-auto"
              :style="{ width: `${Math.min(100, (stat.b / Math.max(stat.a, stat.b, 1)) * 100)}%` }"
            />
          </div>
        </div>
        <span
          class="w-12 text-left font-mono font-black text-lg shrink-0"
          :class="advantageClass(stat.a, stat.b, 'b')"
        >{{ stat.b }}</span>
      </div>

      <div class="pt-2 flex justify-center">
        <UButton
          size="lg"
          color="primary"
          icon="i-lucide-swords"
          label="Simulate Head-to-Head Showdown"
          class="rounded-full font-black px-8"
          :disabled="isBroadcasting"
          @click="simulateShowdown"
        />
      </div>
    </div>

    <!-- Live Showdown Broadcast -->
    <LiveMatchBroadcast
      v-if="matchResult"
      :key="matchResult.id"
      :match="matchResult"
      player-team-id="squad-a"
      @completed="onBroadcastCompleted"
    />

    <!-- Final Result + Rematch -->
    <div
      v-if="matchResult && !isBroadcasting"
      class="surface-card p-6 text-center space-y-4"
    >
      <p class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
        {{ showdownLabel }}
      </p>
      <UButton
        variant="outline"
        color="neutral"
        icon="i-lucide-rotate-ccw"
        label="Rematch"
        class="rounded-full font-bold"
        @click="simulateShowdown"
      />
    </div>
  </div>
</template>
