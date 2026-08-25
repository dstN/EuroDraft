<script setup lang="ts">
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import type { DraftHistoryEntry } from '~/utils/draftHistory'

definePageMeta({ layout: 'default' })

const entries = ref<DraftHistoryEntry[]>([])
const expandedIds = ref<Set<string>>(new Set())

onMounted(() => {
  entries.value = getDraftHistory()
})

function toggleExpanded(id: string) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

function removeEntry(id: string) {
  deleteDraftHistoryEntry(id)
  entries.value = entries.value.filter(e => e.id !== id)
  expandedIds.value.delete(id)
}

function clearAll() {
  clearDraftHistory()
  entries.value = []
  expandedIds.value.clear()
}

const { t, te } = useI18n()
const localePath = useLocalePath()

function outcomeLabel(outcome: string): string {
  const key = `outcomes.${outcome}`
  return te(key) ? t(key) : outcome
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-3 sm:px-6 space-y-6">
    <div class="text-center space-y-2 pt-2">
      <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
        {{ $t('history.badge') }}
      </div>
      <h1 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('history.title') }}
      </h1>
      <p class="text-zinc-700 dark:text-zinc-300 text-sm max-w-lg mx-auto">
        {{ $t('history.subtitle') }}
      </p>
    </div>

    <div
      v-if="entries.length === 0"
      class="surface-card p-10 text-center space-y-3 max-w-lg mx-auto"
    >
      <UIcon
        name="i-lucide-history"
        class="size-10 text-zinc-500 mx-auto"
      />
      <h2 class="text-lg font-bold text-zinc-900 dark:text-white">
        {{ $t('history.empty_title') }}
      </h2>
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        {{ $t('history.empty_desc') }}
      </p>
      <NuxtLink
        :to="localePath('/draft/formation')"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-colors"
      >
        <span>{{ $t('landing.cta_start') }}</span>
      </NuxtLink>
    </div>

    <template v-else>
      <div class="flex justify-end">
        <UButton
          size="xs"
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          :label="$t('history.clear_all')"
          @click="clearAll"
        />
      </div>

      <div class="space-y-3">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="surface-card overflow-hidden"
        >
          <button
            type="button"
            class="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
            @click="toggleExpanded(entry.id)"
          >
            <CountryFlag
              :country="entry.teamEmblem || 'eu'"
              size="sm"
              class="shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {{ entry.teamName }}
              </p>
              <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                {{ entry.formation }} · {{ outcomeLabel(entry.outcome) }} · {{ formatDate(entry.createdAt) }}
              </p>
            </div>
            <span class="font-mono font-black text-lg text-emerald-700 dark:text-emerald-400 shrink-0">
              {{ entry.teamOVR }}
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :aria-label="$t('history.delete_aria', { name: entry.teamName })"
              @click.stop="removeEntry(entry.id)"
            />
            <UIcon
              :name="expandedIds.has(entry.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-4 text-zinc-500 shrink-0"
            />
          </button>

          <div
            v-if="expandedIds.has(entry.id)"
            class="p-4 border-t border-zinc-200 dark:border-white/5 space-y-4"
          >
            <div class="grid grid-cols-4 gap-2 text-center">
              <div>
                <p class="text-[10px] uppercase font-mono font-bold text-zinc-500">
                  {{ $t('compare.line_defense') }}
                </p>
                <p class="font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {{ entry.lineRatings.def }}
                </p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-mono font-bold text-zinc-500">
                  {{ $t('compare.line_midfield') }}
                </p>
                <p class="font-mono font-black text-sky-700 dark:text-sky-400">
                  {{ entry.lineRatings.mid }}
                </p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-mono font-bold text-zinc-500">
                  {{ $t('compare.line_attack') }}
                </p>
                <p class="font-mono font-black text-amber-700 dark:text-amber-400">
                  {{ entry.lineRatings.att }}
                </p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-mono font-bold text-zinc-500">
                  {{ $t('compare.line_overall') }}
                </p>
                <p class="font-mono font-black text-zinc-900 dark:text-white">
                  {{ entry.lineRatings.overall }}
                </p>
              </div>
            </div>

            <div
              v-if="entry.squad.length > 0"
              class="w-full max-w-md mx-auto h-[380px]"
            >
              <FormationPitch
                :slots="entry.squad.map((p, idx) => ({ id: `${p.primaryPosition}-${idx}`, position: p.draftedPosition || p.primaryPosition, player: p }))"
                :interactive="false"
                class="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
