<script setup lang="ts">
import type { MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import LiveMatchBroadcast from '~/components/tournament/LiveMatchBroadcast.vue'

const { t } = useI18n()

// Shared list UI for both the group-stage and knockout match sections of
// tournament/index.vue -- previously duplicated near-verbatim between the
// two (same expand/collapse card, same event-timeline breakdown), differing
// only in how each match's phase label is derived.
const props = defineProps<{
  variant: 'group' | 'knockout'
  matches: MatchResult[]
  activeMatch: MatchResult | null
  playerTeamId: string
  opponentTeam: (match: MatchResult) => { country: string, countryName: string, year: number }
  matchResultLabel: (match: MatchResult) => string
  matchResultBadgeClass: (match: MatchResult) => string
  getNotableMatchEvents: (match: MatchResult) => MatchResult['events']
}>()

const emit = defineEmits<{
  completed: []
}>()

const expandedIds = ref<Set<string>>(new Set())

const activeMatchEl = ref<HTMLElement | null>(null)

// Auto-scroll to the live match whenever a new one starts (group and knockout
// share this component, but only one list has a non-null activeMatch at a
// time, so this never fights with the other instance). `immediate: true`
// matters here: the knockout list is a fresh component instance that first
// mounts already showing an active match (group -> knockout is a v-if
// transition, not a prop change on an existing instance), so a non-immediate
// watcher would never fire for that first knockout match.
watch(() => props.activeMatch?.id, (id) => {
  if (!id) return
  nextTick(() => {
    activeMatchEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}, { immediate: true })

function toggleExpanded(matchId: string) {
  if (expandedIds.value.has(matchId)) {
    expandedIds.value.delete(matchId)
  } else {
    expandedIds.value.add(matchId)
  }
}

function phaseLabel(match: MatchResult, index: number): string {
  if (props.variant === 'group') return t('tournament.matchday_short', { n: index + 1 })
  if (match.phase === 'quarter-final') return t('tournament.quarter_final_short')
  if (match.phase === 'semi-final') return t('tournament.semi_final_short')
  return t('tournament.final')
}

function matchSubtitle(match: MatchResult): string {
  if (props.variant === 'group') {
    return t('tournament.group_goals_subtitle', { count: match.events.filter(e => e.type === 'goal').length })
  }
  return t('tournament.phase_subtitle', { phase: t(`tournament.${match.phase === 'quarter-final' ? 'quarter_final' : 'semi_final'}`).toUpperCase() })
}
</script>

<template>
  <div class="space-y-3">
    <!-- Active Live Match -->
    <div
      v-if="activeMatch"
      ref="activeMatchEl"
      class="space-y-3"
    >
      <LiveMatchBroadcast
        :key="activeMatch.id"
        :match="activeMatch"
        :player-team-id="playerTeamId"
        :speed-ms="400"
        @completed="emit('completed')"
      />
    </div>

    <!-- Completed Matches List (Auto-collapsed with click-to-expand details) -->
    <div
      v-if="matches.length > 0"
      class="space-y-2.5"
    >
      <div
        v-for="(match, mIdx) in matches"
        :key="match.id"
        class="surface-card overflow-hidden transition-all"
      >
        <button
          type="button"
          class="w-full p-3.5 sm:p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] transition-colors select-none"
          @click="toggleExpanded(match.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="text-xs font-mono font-bold uppercase shrink-0"
              :class="variant === 'group' ? 'text-zinc-700 dark:text-zinc-300' : 'text-amber-900 dark:text-amber-400'"
            >
              {{ phaseLabel(match, mIdx) }}
            </span>
            <CountryFlag
              :country="opponentTeam(match).country"
              size="sm"
            />
            <div class="min-w-0">
              <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {{ $t('tournament.vs') }} {{ $t(`countries.${opponentTeam(match).country.toLowerCase()}`, opponentTeam(match).countryName) }} '{{ opponentTeam(match).year }}
              </p>
              <p class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                {{ matchSubtitle(match) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <span
              class="font-mono font-black text-xs px-2.5 py-1 rounded-md border shrink-0 leading-none shadow-xs"
              :class="matchResultBadgeClass(match)"
            >
              {{ matchResultLabel(match) }}
            </span>
            <UIcon
              :name="expandedIds.has(match.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-4 text-zinc-700 dark:text-zinc-300"
            />
          </div>
        </button>

        <!-- Expanded Match Events Breakdown (Eliminates empty placeholder lines) -->
        <div
          v-if="expandedIds.has(match.id)"
          class="p-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 space-y-2 text-xs font-mono"
        >
          <div
            v-if="getNotableMatchEvents(match).length === 0"
            class="text-zinc-700 dark:text-zinc-300 italic py-1"
          >
            {{ $t('tournament.no_notable_events') }}
          </div>
          <div
            v-for="(ev, eIdx) in getNotableMatchEvents(match)"
            :key="eIdx"
            class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 py-0.5"
          >
            <span class="font-bold w-7 text-zinc-700 dark:text-zinc-300 shrink-0">{{ ev.minute }}'</span>
            <span v-if="ev.type === 'goal'">
              ⚽ {{ $t('tournament.event_goal') }}: <strong class="text-emerald-700 dark:text-emerald-400 font-bold">{{ ev.playerName }}</strong>
              <span
                v-if="ev.assistPlayerName"
                class="text-zinc-700 dark:text-zinc-300 font-semibold"
              > {{ $t('tournament.event_assist', { name: ev.assistPlayerName }) }}</span>
            </span>
            <span v-else-if="ev.type === 'yellow-card'">
              🟨 {{ $t('tournament.event_yellow') }}: <span class="font-semibold">{{ ev.playerName }}</span>
            </span>
            <span v-else-if="ev.type === 'red-card'">
              🟥 {{ $t('tournament.event_red') }}: <strong class="text-rose-600 dark:text-rose-400 font-bold">{{ ev.playerName }}</strong>
            </span>
            <span
              v-else-if="ev.type === 'penalty-shootout'"
              class="font-semibold text-violet-700 dark:text-violet-400"
            >
              {{ ev.description }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
