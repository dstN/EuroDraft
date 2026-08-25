<script setup lang="ts">
import type { Player, PlayerTournamentStats, TournamentRunStats } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

type SortField = 'name' | 'primaryPosition' | 'overall' | 'matches' | 'minutes' | 'goals' | 'assists' | 'ga' | 'rating'

const props = defineProps<{
  runStats: TournamentRunStats
  sortedPlayerStats: PlayerTournamentStats[]
  sortField: SortField
  sortOrder: 'asc' | 'desc'
  setSort: (field: SortField) => void
}>()

const emit = defineEmits<{
  inspectPlayer: [player: Player]
}>()

function ariaSortFor(field: SortField): 'ascending' | 'descending' | 'none' {
  if (props.sortField !== field) return 'none'
  return props.sortOrder === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
      <h2 class="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
        <UIcon
          name="i-lucide-bar-chart-2"
          class="size-5 text-emerald-600 dark:text-emerald-400 shrink-0"
        />
        <span>{{ $t('tournament.player_performance') }}</span>
      </h2>
      <span class="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider shrink-0 whitespace-nowrap self-start sm:self-auto px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10">
        {{ $t('tournament.top_performers') }}
      </span>
    </div>

    <!-- 4 Top Performer Spotlight Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- MVP / Most G+A -->
      <button
        type="button"
        class="surface-card p-4 space-y-2 text-left w-full transition-all disabled:cursor-not-allowed"
        :class="runStats.mvp ? 'cursor-pointer hover:border-amber-500/40' : ''"
        :disabled="!runStats.mvp"
        @click="runStats.mvp ? emit('inspectPlayer', runStats.mvp.player) : undefined"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">{{ $t('tournament.mvp') }}</span>
          <UIcon
            name="i-lucide-sparkles"
            class="size-4 text-amber-500"
          />
        </div>
        <template v-if="runStats.mvp">
          <div class="flex items-center gap-2">
            <CountryFlag
              :country="runStats.mvp.player.country"
              size="sm"
            />
            <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {{ runStats.mvp.player.name }}
            </p>
          </div>
          <p class="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
            {{ runStats.mvp.ga }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">{{ $t('tournament.ga_breakdown', { goals: runStats.mvp.goals, assists: runStats.mvp.assists }) }}</span>
          </p>
        </template>
        <template v-else>
          <p class="text-xs text-zinc-500 italic py-2">
            —
          </p>
        </template>
      </button>

      <!-- Top Scorer -->
      <button
        type="button"
        class="surface-card p-4 space-y-2 text-left w-full transition-all disabled:cursor-not-allowed"
        :class="runStats.topScorer && runStats.topScorer.goals > 0 ? 'cursor-pointer hover:border-amber-500/40' : ''"
        :disabled="!runStats.topScorer || runStats.topScorer.goals === 0"
        @click="runStats.topScorer ? emit('inspectPlayer', runStats.topScorer.player) : undefined"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">{{ $t('tournament.golden_boot') }}</span>
          <UIcon
            name="i-lucide-award"
            class="size-4 text-amber-500"
          />
        </div>
        <template v-if="runStats.topScorer && runStats.topScorer.goals > 0">
          <div class="flex items-center gap-2">
            <CountryFlag
              :country="runStats.topScorer.player.country"
              size="sm"
            />
            <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {{ runStats.topScorer.player.name }}
            </p>
          </div>
          <p class="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
            {{ runStats.topScorer.goals }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">{{ $t('tournament.goals_label') }}</span>
          </p>
        </template>
        <template v-else>
          <p class="text-xs text-zinc-500 italic py-2">
            {{ $t('tournament.no_goals_scored') }}
          </p>
        </template>
      </button>

      <!-- Top Playmaker -->
      <button
        type="button"
        class="surface-card p-4 space-y-2 text-left w-full transition-all disabled:cursor-not-allowed"
        :class="runStats.topAssister && runStats.topAssister.assists > 0 ? 'cursor-pointer hover:border-emerald-500/40' : ''"
        :disabled="!runStats.topAssister || runStats.topAssister.assists === 0"
        @click="runStats.topAssister ? emit('inspectPlayer', runStats.topAssister.player) : undefined"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">{{ $t('tournament.top_playmaker') }}</span>
          <UIcon
            name="i-lucide-crosshair"
            class="size-4 text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <template v-if="runStats.topAssister && runStats.topAssister.assists > 0">
          <div class="flex items-center gap-2">
            <CountryFlag
              :country="runStats.topAssister.player.country"
              size="sm"
            />
            <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {{ runStats.topAssister.player.name }}
            </p>
          </div>
          <p class="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            {{ runStats.topAssister.assists }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">{{ $t('tournament.assists_label') }}</span>
          </p>
        </template>
        <template v-else>
          <p class="text-xs text-zinc-500 italic py-2">
            {{ $t('tournament.no_assists_recorded') }}
          </p>
        </template>
      </button>

      <!-- Efficiency -->
      <button
        type="button"
        class="surface-card p-4 space-y-2 text-left w-full transition-all disabled:cursor-not-allowed"
        :class="runStats.bestGAPer90 ? 'cursor-pointer hover:border-sky-500/40' : ''"
        :disabled="!runStats.bestGAPer90"
        @click="runStats.bestGAPer90 ? emit('inspectPlayer', runStats.bestGAPer90.player) : undefined"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400">{{ $t('tournament.efficiency') }}</span>
          <UIcon
            name="i-lucide-gauge"
            class="size-4 text-sky-600 dark:text-sky-400"
          />
        </div>
        <template v-if="runStats.bestGAPer90">
          <div class="flex items-center gap-2">
            <CountryFlag
              :country="runStats.bestGAPer90.player.country"
              size="sm"
            />
            <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
              {{ runStats.bestGAPer90.player.name }}
            </p>
          </div>
          <p class="text-xl font-black font-mono text-sky-700 dark:text-sky-400">
            {{ runStats.bestGAPer90.gaPer90 }} <span class="text-xs text-zinc-600 dark:text-zinc-400 font-bold">{{ $t('tournament.ga_per_90') }}</span>
          </p>
        </template>
        <template v-else>
          <p class="text-xs text-zinc-500 italic py-2">
            —
          </p>
        </template>
      </button>
    </div>

    <!-- Extended All-Players Performance Table (with Interactive Sorting) -->
    <div class="surface-card p-4 sm:p-5 space-y-4 overflow-hidden">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
        <h3 class="text-xs sm:text-sm font-bold font-mono uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
          {{ $t('tournament.complete_performance_table') }}
        </h3>
        <span class="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-bold">{{ $t('tournament.starters_click_hint') }}</span>
      </div>

      <div class="overflow-x-auto custom-scroll -mx-2 sm:mx-0 px-2 sm:px-0">
        <table class="w-full min-w-[620px] text-left text-xs font-mono">
          <thead>
            <tr class="text-zinc-600 dark:text-zinc-400 uppercase border-b border-zinc-200 dark:border-white/10 pb-2 font-bold select-none">
              <th
                scope="col"
                class="py-2.5 px-2"
                :aria-sort="ariaSortFor('name')"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                  @click="setSort('name')"
                >
                  {{ $t('tournament.table_player') }} <span v-if="sortField === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2"
                :aria-sort="ariaSortFor('primaryPosition')"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                  @click="setSort('primaryPosition')"
                >
                  {{ $t('tournament.table_pos') }} <span v-if="sortField === 'primaryPosition'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2"
                :aria-sort="ariaSortFor('overall')"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                  @click="setSort('overall')"
                >
                  {{ $t('draft.stats.overall') }} <span v-if="sortField === 'overall'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center"
                :aria-sort="ariaSortFor('matches')"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                  @click="setSort('matches')"
                >
                  {{ $t('tournament.table_played') }} <span v-if="sortField === 'matches'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center"
                :aria-sort="ariaSortFor('minutes')"
              >
                <button
                  type="button"
                  class="cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                  @click="setSort('minutes')"
                >
                  {{ $t('tournament.table_min') }} <span v-if="sortField === 'minutes'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400 font-black"
                :aria-sort="ariaSortFor('goals')"
              >
                <button
                  type="button"
                  class="cursor-pointer"
                  @click="setSort('goals')"
                >
                  {{ $t('tournament.table_goals') }} <span v-if="sortField === 'goals'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center text-sky-700 dark:text-sky-400 font-bold"
                :aria-sort="ariaSortFor('assists')"
              >
                <button
                  type="button"
                  class="cursor-pointer"
                  @click="setSort('assists')"
                >
                  {{ $t('tournament.table_assists') }} <span v-if="sortField === 'assists'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center font-black text-amber-700 dark:text-amber-400"
                :aria-sort="ariaSortFor('ga')"
              >
                <button
                  type="button"
                  class="cursor-pointer"
                  @click="setSort('ga')"
                >
                  {{ $t('tournament.table_ga') }} <span v-if="sortField === 'ga'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center text-amber-700 dark:text-amber-300"
              >
                🟨
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400"
              >
                🟥
              </th>
              <th
                scope="col"
                class="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-400 font-black"
                :aria-sort="ariaSortFor('rating')"
              >
                <button
                  type="button"
                  class="cursor-pointer"
                  @click="setSort('rating')"
                >
                  {{ $t('tournament.table_rating') }} <span v-if="sortField === 'rating'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-white/10">
            <tr
              v-for="p in sortedPlayerStats"
              :key="p.player.id"
              class="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors group"
            >
              <td class="py-2.5 px-2 font-bold text-zinc-900 dark:text-white">
                <button
                  type="button"
                  class="w-full flex items-center gap-2 text-left cursor-pointer group-hover:text-emerald-400 transition-colors"
                  :title="$t('tournament.click_view_attributes')"
                  @click="emit('inspectPlayer', p.player)"
                >
                  <CountryFlag
                    :country="p.player.country"
                    size="sm"
                  />
                  <span class="truncate max-w-[7.5rem] sm:max-w-[12rem]">{{ p.player.name }}</span>
                  <UIcon
                    name="i-lucide-info"
                    class="size-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                </button>
              </td>
              <td class="py-2.5 px-2 text-zinc-600 dark:text-zinc-400 font-semibold">
                {{ $t(`draft.positions.${p.player.primaryPosition}`) }}
              </td>
              <td
                class="py-2.5 px-2 font-black"
                :class="p.player.stats.overall >= 90 ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-800 dark:text-zinc-200'"
              >
                {{ p.player.stats.overall }}
              </td>
              <td class="py-2.5 px-2 text-center text-zinc-800 dark:text-zinc-200 font-semibold">
                {{ p.matches }}
              </td>
              <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                {{ p.minutes }}'
              </td>
              <td class="py-2.5 px-2 text-center font-black text-emerald-700 dark:text-emerald-400">
                {{ p.goals }}
              </td>
              <td class="py-2.5 px-2 text-center font-bold text-sky-700 dark:text-sky-400">
                {{ p.assists }}
              </td>
              <td class="py-2.5 px-2 text-center font-black text-amber-700 dark:text-amber-400">
                {{ p.ga }}
              </td>
              <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                {{ p.yellowCards }}
              </td>
              <td class="py-2.5 px-2 text-center text-zinc-600 dark:text-zinc-400">
                {{ p.redCards }}
              </td>
              <td class="py-2.5 px-2 text-right font-black text-emerald-700 dark:text-emerald-400">
                {{ p.rating }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
