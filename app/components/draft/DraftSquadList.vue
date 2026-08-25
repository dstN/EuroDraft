<script setup lang="ts">
import type { DraftSlot, Player } from '~/types'

const props = defineProps<{
  squadWithEligibility: { player: Player, canDraft: boolean, compatibleSlots: DraftSlot[] }[]
  selectedPlayerId: string | undefined
  isPlayerEligible: (player: Player) => boolean
  squadKey?: string
}>()

const emit = defineEmits<{
  selectPlayer: [player: Player]
  inspectPlayer: [player: Player]
  hoverPlayer: [player: Player | null]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

// Reset scroll position whenever a genuinely new squad is loaded (spin/reroll),
// not just when eligibility flags update within the same squad -- otherwise a
// freshly-drafted squad opens at the same scroll offset the previous squad was
// left at, which reads as broken/unfinished rather than a fresh list.
watch(() => props.squadKey, () => {
  scrollContainer.value?.scrollTo({ top: 0 })
})

function positionColor(pos: string): string {
  if (pos === 'GK') return 'bg-yellow-500/15 text-yellow-950 dark:text-yellow-300 border-yellow-500/30'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-500/30'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30'
  return 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30'
}
</script>

<template>
  <div
    ref="scrollContainer"
    class="space-y-2 max-h-[60vh] lg:max-h-[62vh] overflow-y-auto custom-scroll p-1.5 flex-1"
  >
    <template
      v-for="(entry, idx) in squadWithEligibility"
      :key="entry.player.id"
    >
      <!-- Position Category Section Header -->
      <div
        v-if="idx === 0 || squadWithEligibility[idx - 1]?.player.basePosition !== entry.player.basePosition"
        class="pt-2.5 pb-1 px-1 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.15em] text-zinc-700 dark:text-zinc-300 select-none"
      >
        <span>{{ $t(`draft.category_plural.${entry.player.basePosition}`) }}</span>
        <div class="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
      </div>

      <div
        :id="`player-item-${entry.player.id}`"
        class="w-full flex items-center gap-1.5 rounded-xl p-1 transition-all duration-150 border select-none"
        :class="[
          selectedPlayerId === entry.player.id
            ? 'bg-emerald-500/20 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-inset ring-emerald-500 shadow-md'
            : isPlayerEligible(entry.player)
              ? 'bg-zinc-50 hover:bg-emerald-50/80 dark:bg-zinc-800/70 dark:hover:bg-emerald-950/40 border-zinc-200/80 dark:border-white/5 hover:border-emerald-400/50 shadow-sm'
              : 'bg-zinc-100/50 dark:bg-zinc-900/30 border-transparent opacity-40'
        ]"
        @mouseenter="emit('hoverPlayer', entry.player)"
        @mouseleave="emit('hoverPlayer', null)"
      >
        <!-- Main Draft Selection Button -->
        <button
          type="button"
          class="flex-1 flex items-center gap-3 px-2.5 py-1.5 text-left rounded-lg transition-transform focus:outline-none"
          :class="isPlayerEligible(entry.player) ? 'cursor-pointer active:scale-[0.99]' : 'cursor-not-allowed'"
          :disabled="!isPlayerEligible(entry.player)"
          :aria-label="$t('draft.aria_draft_player', { name: entry.player.name, position: entry.player.primaryPosition, rating: entry.player.stats.overall })"
          @click="emit('selectPlayer', entry.player)"
        >
          <!-- Shirt number -->
          <span class="w-6 text-center font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
            {{ entry.player.shirtNumber ?? '–' }}
          </span>

          <!-- Position badge with generous padding -->
          <span
            class="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md border uppercase shrink-0 min-w-[42px] text-center tracking-wider leading-none shadow-xs"
            :class="positionColor(entry.player.primaryPosition)"
          >
            {{ entry.player.primaryPosition }}
          </span>

          <!-- Name -->
          <span class="flex-1 min-w-0 text-sm font-bold text-zinc-900 dark:text-white truncate">
            {{ entry.player.name }}
          </span>

          <!-- OVR rating badge with generous padding -->
          <span
            class="font-mono text-xs font-black px-2.5 py-1 rounded-md border shrink-0 leading-none"
            :class="entry.player.stats.overall >= 90
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
              : entry.player.stats.overall >= 85
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-300'
                : 'bg-zinc-200/60 dark:bg-zinc-800 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300'"
          >
            {{ entry.player.stats.overall }}
          </span>

          <!-- Action icon -->
          <UIcon
            v-if="selectedPlayerId === entry.player.id"
            name="i-lucide-check-circle"
            class="size-4 text-emerald-500 shrink-0"
          />
          <UIcon
            v-else-if="isPlayerEligible(entry.player)"
            name="i-lucide-circle-plus"
            class="size-4 text-emerald-500 shrink-0"
          />
          <UIcon
            v-else
            name="i-lucide-lock"
            class="size-3.5 text-zinc-400 dark:text-zinc-600 shrink-0"
          />
        </button>

        <!-- Dedicated Info Button to Inspect Full Stat Card -->
        <button
          type="button"
          class="size-8 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus:outline-none"
          :title="$t('draft.view_stats_title')"
          :aria-label="$t('draft.aria_view_stats', { name: entry.player.name })"
          @click="emit('inspectPlayer', entry.player)"
        >
          <UIcon
            name="i-lucide-info"
            class="size-4"
          />
        </button>
      </div>
    </template>
  </div>
</template>
