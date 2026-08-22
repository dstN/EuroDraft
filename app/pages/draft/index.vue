<script setup lang="ts">
import type { DraftSlot, Player } from '~/types'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'

definePageMeta({ layout: 'default' })

const draft = useDraftStore()
const roulette = useRouletteStore()

// Mobile view tab state: 'squad' | 'pitch'
const mobileTab = ref<'squad' | 'pitch'>('squad')

// Redirect if no formation selected
onMounted(() => {
  if (!draft.formation) {
    navigateTo('/draft/formation')
    return
  }
  if (!roulette.currentCountry) {
    roulette.spin()
  }
})

// Selected player from squad list
const selectedPlayer = ref<Player | null>(null)
// Selected slot on pitch (if user clicks slot first)
const selectedSlotId = ref<string | null>(null)

// Hovered player for live feedback
const hoveredPlayer = ref<Player | null>(null)

// Highlighted slot IDs on pitch based on active player selection or hover
const highlightedSlotIds = computed(() => {
  const p = selectedPlayer.value || hoveredPlayer.value
  if (!p) return []
  return draft.getCompatibleSlots(p).map(s => s.id)
})

// When user clicks a player in the squad list
function onPlayerClick(player: Player) {
  if (!draft.canDraftToAnySlot(player)) return

  // If user had clicked a slot on pitch first, and this player is compatible, assign immediately!
  if (selectedSlotId.value) {
    const targetSlot = draft.slots.find(s => s.id === selectedSlotId.value)
    if (targetSlot && !targetSlot.player && player.positions.includes(targetSlot.position)) {
      confirmDraft(player, targetSlot)
      return
    }
  }

  // Toggle selection
  if (selectedPlayer.value?.id === player.id) {
    selectedPlayer.value = null
    return
  }

  selectedPlayer.value = player
  selectedSlotId.value = null

  // If only 1 compatible slot exists, auto-switch to pitch on mobile so user sees it
  if (mobileTab.value === 'squad') {
    const compatible = draft.getCompatibleSlots(player)
    if (compatible.length === 1) {
      // Auto-assign directly if only 1 single open slot exists!
      confirmDraft(player, compatible[0]!)
    }
  }
}

// When user clicks a slot on the Tactical Pitch
function onPitchSlotClick(slot: DraftSlot) {
  // If slot already has a player, do nothing
  if (slot.player) return

  // If a player was already selected from the squad, check if compatible and assign!
  if (selectedPlayer.value) {
    const isCompatible = selectedPlayer.value.positions.includes(slot.position)
    if (isCompatible) {
      confirmDraft(selectedPlayer.value, slot)
      return
    }
  }

  // Otherwise, select this slot on the pitch to filter/highlight compatible squad players!
  selectedSlotId.value = selectedSlotId.value === slot.id ? null : slot.id
  selectedPlayer.value = null
  if (mobileTab.value === 'pitch') {
    mobileTab.value = 'squad' // switch to squad list on mobile so user can pick
  }
}

// Squad scroll container ref for scroll-to-top on new team (Issue #2)
const squadScrollRef = ref<HTMLElement | null>(null)

function confirmDraft(player: Player, slot: DraftSlot) {
  draft.draftPlayer(slot.id, player)
  selectedPlayer.value = null
  selectedSlotId.value = null

  if (draft.isComplete) {
    navigateTo('/tournament')
    return
  }
  roulette.spin()
  // Scroll squad list back to top so user sees the new team from the start (Issue #2)
  nextTick(() => {
    if (squadScrollRef.value) {
      squadScrollRef.value.scrollTop = 0
    }
  })
}

function cancelSelection() {
  selectedPlayer.value = null
  selectedSlotId.value = null
}

// Check if a player in the squad is eligible for the currently selected slot on pitch
function isPlayerEligibleForSelectedSlot(player: Player): boolean {
  if (!selectedSlotId.value) return draft.canDraftToAnySlot(player)
  const targetSlot = draft.slots.find(s => s.id === selectedSlotId.value)
  if (!targetSlot) return draft.canDraftToAnySlot(player)
  return player.positions.includes(targetSlot.position) && !targetSlot.player
}

// Position badge color
function positionColor(pos: string): 'info' | 'success' | 'warning' | 'error' | 'neutral' {
  if (pos === 'GK') return 'info'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'success'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'warning'
  return 'error'
}
</script>

<template>
  <div class="relative min-h-[calc(100dvh-5rem)] pb-12">
    <!-- Full-screen flag background overlay -->
    <div
      v-if="roulette.currentCountry"
      class="flag-bg-overlay opacity-30 dark:opacity-20"
      aria-hidden="true"
    >
      <div
        class="w-full h-full"
        :style="`background: linear-gradient(135deg, hsl(${(roulette.currentCountry?.charCodeAt(0) ?? 0) * 37 % 360}, 60%, 25%), hsl(${(roulette.currentCountry?.charCodeAt(1) ?? 0) * 53 % 360}, 50%, 15%))`"
      />
    </div>

    <div class="relative z-10 max-w-6xl mx-auto px-4 py-6 space-y-6">
      <!-- Top header bar: Progress + Team Stats -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div class="space-y-1.5 flex-1 max-w-md">
          <div class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span class="font-semibold">{{ $t('draft.progress', { filled: draft.filledSlots.length }) }}</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ draft.teamOVR > 0 ? `Squad OVR ${draft.teamOVR}` : '' }}</span>
          </div>
          <UProgress
            :value="draft.filledSlots.length"
            :max="11"
            color="primary"
            class="h-2"
          />
        </div>

        <!-- Formation badge & Mobile Tab Switcher -->
        <div class="flex items-center justify-between sm:justify-end gap-3">
          <div class="flex items-center gap-2">
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
              class="font-mono font-bold"
            >
              {{ draft.formation?.label }}
            </UBadge>
          </div>

          <!-- Mobile Tab Toggle (< lg) -->
          <div class="lg:hidden flex items-center p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
              :class="mobileTab === 'squad' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'"
              @click="mobileTab = 'squad'"
            >
              🎲 Roulette ({{ roulette.squadWithEligibility.filter(p => p.canDraft).length }})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
              :class="mobileTab === 'pitch' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'"
              @click="mobileTab = 'pitch'"
            >
              🏟️ Pitch ({{ draft.filledSlots.length }}/11)
            </button>
          </div>
        </div>
      </div>

      <!-- Action Guidance Banner (shows current selection state) -->
      <div
        v-if="selectedPlayer || selectedSlotId"
        class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-emerald-500/10 dark:bg-emerald-950/60 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm animate-pulse"
      >
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-arrow-right-circle"
            class="size-5 text-emerald-500 shrink-0"
          />
          <span v-if="selectedPlayer">
            Selected: <strong class="font-bold text-zinc-900 dark:text-white">{{ selectedPlayer.name }}</strong> ({{ selectedPlayer.primaryPosition }}). Click any <strong>glowing slot on the pitch</strong> to place them!
          </span>
          <span v-else-if="selectedSlotId">
            Targeting slot: <strong class="font-bold text-zinc-900 dark:text-white">{{ draft.slots.find(s => s.id === selectedSlotId)?.position }}</strong>. Click an eligible player from the squad list!
          </span>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          label="Cancel"
          icon="i-lucide-x"
          @click="cancelSelection"
        />
      </div>

      <!-- Main drafting area: 2-column on desktop; items-stretch so both columns share height (Issue #1) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Left column: Roulette & Squad Selection -->
        <div
          class="space-y-6 lg:col-span-7"
          :class="{ 'hidden lg:block': mobileTab === 'pitch' }"
        >
          <!-- Current team card -->
          <div class="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5 shadow-lg space-y-4">
            <!-- Team header -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-[0.12em]">
                  Euro {{ roulette.currentYear }}
                </p>
                <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <CountryFlag
                    v-if="roulette.currentCountry"
                    :country="roulette.currentCountry"
                    size="lg"
                  />
                  <span>{{ roulette.currentCountry?.toUpperCase() }}</span>
                </h2>
              </div>

              <!-- Reroll controls -->
              <div class="flex flex-col gap-1.5 items-end">
                <div class="flex gap-1.5">
                  <UTooltip
                    :text="$t('draft.reroll_year_hint', { nation: roulette.currentCountry })"
                    :delay-duration="300"
                  >
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      :label="$t('draft.reroll_year')"
                      leading-icon="i-lucide-calendar"
                      :disabled="draft.rerollsRemaining <= 0"
                      @click="roulette.rerollYear()"
                    />
                  </UTooltip>
                  <UTooltip
                    :text="$t('draft.reroll_nation_hint', { year: roulette.currentYear })"
                    :delay-duration="300"
                  >
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="outline"
                      :label="$t('draft.reroll_nation')"
                      leading-icon="i-lucide-globe"
                      :disabled="draft.rerollsRemaining <= 0"
                      @click="roulette.rerollNation()"
                    />
                  </UTooltip>
                </div>
                <p class="text-[10px] text-zinc-500 font-medium">
                  {{ $t('draft.rerolls_remaining', { count: draft.rerollsRemaining }) }}
                </p>
              </div>
            </div>

            <!-- Squad list (Position-sorted: Goalkeepers -> Defenders -> Midfielders -> Forwards) -->
            <div
              ref="squadScrollRef"
              class="space-y-1 max-h-[55vh] lg:max-h-[62vh] overflow-y-auto custom-scroll pr-1"
            >
              <template
                v-for="(entry, idx) in roulette.squadWithEligibility"
                :key="entry.player.id"
              >
                <!-- Position Category Section Header -->
                <div
                  v-if="idx === 0 || roulette.squadWithEligibility[idx - 1]?.player.basePosition !== entry.player.basePosition"
                  class="pt-3 pb-1 px-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 select-none"
                >
                  <span>{{ entry.player.basePosition }}s</span>
                  <div class="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  class="w-full flex items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-all duration-150 border"
                  :class="[
                    selectedPlayer?.id === entry.player.id
                      ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400 shadow-md'
                      : isPlayerEligibleForSelectedSlot(entry.player)
                        ? 'bg-zinc-50 hover:bg-emerald-50/80 dark:bg-zinc-800/60 dark:hover:bg-emerald-950/40 border-zinc-200/80 dark:border-white/5 hover:border-emerald-400/50 cursor-pointer shadow-sm active:scale-[0.99]'
                        : 'bg-zinc-100/50 dark:bg-zinc-900/30 border-transparent opacity-35 cursor-not-allowed'
                  ]"
                  :disabled="!isPlayerEligibleForSelectedSlot(entry.player)"
                  @mouseenter="hoveredPlayer = entry.player"
                  @mouseleave="hoveredPlayer = null"
                  @click="onPlayerClick(entry.player)"
                >
                  <!-- Shirt number -->
                  <span class="w-6 text-center font-mono text-xs text-zinc-400 font-bold shrink-0">
                    {{ entry.player.shirtNumber ?? '–' }}
                  </span>

                  <!-- Position badge -->
                  <UBadge
                    :color="positionColor(entry.player.primaryPosition)"
                    variant="soft"
                    size="xs"
                    class="font-mono text-[10px] font-bold shrink-0 w-9 justify-center"
                  >
                    {{ entry.player.primaryPosition }}
                  </UBadge>

                  <!-- Name -->
                  <span class="flex-1 text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {{ entry.player.name }}
                  </span>

                  <!-- OVR rating badge -->
                  <span
                    class="font-mono text-xs font-black px-2 py-0.5 rounded-md border shrink-0"
                    :class="entry.player.stats.overall >= 85
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                      : 'bg-zinc-200/60 dark:bg-zinc-800 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300'"
                  >
                    {{ entry.player.stats.overall }}
                  </span>

                  <!-- Action icon -->
                  <UIcon
                    v-if="selectedPlayer?.id === entry.player.id"
                    name="i-lucide-check-circle"
                    class="size-4 text-emerald-400 shrink-0"
                  />
                  <UIcon
                    v-else-if="isPlayerEligibleForSelectedSlot(entry.player)"
                    name="i-lucide-circle-plus"
                    class="size-4 text-emerald-500 shrink-0"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-lock"
                    class="size-3.5 text-zinc-400 dark:text-zinc-600 shrink-0"
                  />
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Right column: Tactical Pitch Formation (Issue #1: height matches squad panel) -->
        <div
          class="flex flex-col lg:col-span-5"
          :class="{ 'hidden lg:block': mobileTab === 'squad' }"
        >
          <!-- Tactical Pitch card: fills full column height -->
          <div class="flex flex-col flex-1 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-4 shadow-lg space-y-3">
            <div class="flex items-center justify-between px-1 shrink-0">
              <div>
                <h3 class="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>Tactical Pitch</span>
                  <span class="text-xs font-normal text-zinc-500">({{ draft.formation?.label }})</span>
                </h3>
              </div>
              <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {{ draft.filledSlots.length }}/11 Selected
              </span>
            </div>

            <!-- Pitch fills remaining card height -->
            <div class="flex-1 min-h-0">
              <FormationPitch
                :slots="draft.slots"
                :active-slot-id="selectedSlotId"
                :highlighted-slot-ids="highlightedSlotIds"
                :interactive="true"
                class="h-full"
                @select-slot="onPitchSlotClick"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
