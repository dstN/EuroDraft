<script setup lang="ts">
import type { DraftSlot, Player } from '~/types'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import RouletteWheelReel from '~/components/draft/RouletteWheelReel.vue'

definePageMeta({ layout: 'default' })

const draft = useDraftStore()
const roulette = useRouletteStore()

// Mobile view tab state: 'squad' | 'pitch'
const mobileTab = ref<'squad' | 'pitch'>('squad')

// Wheel spinning state for reel animation
const isSpinningReel = ref(false)

// Redirect if no formation selected
onMounted(() => {
  if (!draft.formation) {
    navigateTo('/draft/formation')
    return
  }
  if (!roulette.currentCountry) {
    spinWithAnimation()
  }
})

function spinWithAnimation() {
  isSpinningReel.value = true
  roulette.spin()
  setTimeout(() => {
    isSpinningReel.value = false
  }, 550)
}

function rerollYearWithAnimation() {
  isSpinningReel.value = true
  roulette.rerollYear()
  setTimeout(() => {
    isSpinningReel.value = false
  }, 500)
}

function rerollNationWithAnimation() {
  isSpinningReel.value = true
  roulette.rerollNation()
  setTimeout(() => {
    isSpinningReel.value = false
  }, 500)
}

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
      confirmDraft(player, compatible[0]!)
    }
  }
}

// When user clicks a slot on the Tactical Pitch
function onPitchSlotClick(slot: DraftSlot) {
  if (slot.player) return

  // If a player was already clicked, and this slot matches, confirm!
  if (selectedPlayer.value) {
    if (selectedPlayer.value.positions.includes(slot.position)) {
      confirmDraft(selectedPlayer.value, slot)
      return
    }
  }

  // Otherwise, select this slot to filter squad list to matching candidates
  selectedSlotId.value = selectedSlotId.value === slot.id ? null : slot.id
  selectedPlayer.value = null
}

function confirmDraft(player: Player, slot: DraftSlot) {
  draft.draftPlayer(slot.id, player)
  selectedPlayer.value = null
  selectedSlotId.value = null
  hoveredPlayer.value = null

  // If draft not complete, spin roulette for next nation/year with slot animation
  if (!draft.isComplete) {
    spinWithAnimation()
  } else {
    // Navigate straight to tournament
    navigateTo('/tournament')
  }
}

function cancelSelection() {
  selectedPlayer.value = null
  selectedSlotId.value = null
}

function positionColor(pos: string): string {
  if (pos === 'GK') return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 border-yellow-500/30'
  if (['CB', 'LB', 'RB'].includes(pos)) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
  return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
}

function isPlayerEligibleForSelectedSlot(player: Player): boolean {
  if (selectedSlotId.value) {
    const slot = draft.slots.find(s => s.id === selectedSlotId.value)
    if (!slot) return false
    return player.positions.includes(slot.position)
  }
  return draft.canDraftToAnySlot(player)
}

const currentCountryDisplayName = computed(() => {
  return roulette.currentSquad[0]?.countryName ?? roulette.currentCountry?.toUpperCase() ?? ''
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
    <!-- Top HUD Bar: Team Identity & Progress (Clean surface-card) -->
    <div class="surface-card p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Left: Team Identity & OVR -->
        <div class="flex items-center gap-3.5">
          <CountryFlag
            :country="draft.teamEmblem || 'eu'"
            size="md"
          />
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>{{ draft.teamName || 'Dream XI' }}</span>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                {{ draft.teamOVR }} OVR
              </span>
            </h2>
            <p class="text-xs text-zinc-500 font-mono">
              Drafted {{ draft.filledSlots.length }} / 11 Players
            </p>
          </div>
        </div>

        <!-- Formation badge & Mobile Tab Switcher -->
        <div class="flex items-center justify-between sm:justify-end gap-3">
          <div class="flex items-center gap-2">
            <UBadge
              color="neutral"
              variant="outline"
              size="md"
              class="font-mono font-black text-xs"
            >
              {{ draft.formation?.label }}
            </UBadge>
          </div>

          <!-- Mobile Tab Toggle (< lg) -->
          <div class="lg:hidden flex items-center p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
              :class="mobileTab === 'squad' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-700 dark:text-zinc-300'"
              @click="mobileTab = 'squad'"
            >
              🎲 Squad ({{ roulette.squadWithEligibility.filter(p => p.canDraft).length }})
            </button>
            <button
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
              :class="mobileTab === 'pitch' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-700 dark:text-zinc-300'"
              @click="mobileTab = 'pitch'"
            >
              🏟️ Pitch ({{ draft.filledSlots.length }}/11)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Guidance Banner (shows current selection state) -->
    <div
      v-if="selectedPlayer || selectedSlotId"
      class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-emerald-500/15 dark:bg-emerald-950/70 border-emerald-500/50 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm shadow-md animate-pulse"
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

    <!-- Main drafting area: 2-column on desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <!-- Left column: Roulette & Squad Selection -->
      <div
        class="space-y-6 lg:col-span-7 flex flex-col"
        :class="{ 'hidden lg:flex': mobileTab === 'pitch' }"
      >
        <!-- Current team card (Clean single surface-card) -->
        <div class="surface-card p-5 space-y-4 flex-1 flex flex-col">
          <!-- Team header with Animated Roulette Reel -->
          <div class="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/5">
            <RouletteWheelReel
              :is-spinning="isSpinningReel"
              :target-country="roulette.currentCountry"
              :target-year="roulette.currentYear"
              :target-country-name="currentCountryDisplayName"
              @spin-complete="isSpinningReel = false"
            />

            <!-- Reroll controls -->
            <div class="flex flex-col gap-1.5 items-end shrink-0">
              <div class="flex gap-1.5">
                <UTooltip
                  :text="$t('draft.reroll_year_hint', { nation: currentCountryDisplayName })"
                  :delay-duration="300"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    :label="$t('draft.reroll_year')"
                    leading-icon="i-lucide-calendar"
                    class="rounded-lg font-bold"
                    :disabled="draft.rerollsRemaining <= 0 || isSpinningReel"
                    @click="rerollYearWithAnimation"
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
                    class="rounded-lg font-bold"
                    :disabled="draft.rerollsRemaining <= 0 || isSpinningReel"
                    @click="rerollNationWithAnimation"
                  />
                </UTooltip>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-bold">
                {{ $t('draft.rerolls_remaining', { count: draft.rerollsRemaining }) }}
              </p>
            </div>
          </div>

          <!-- Squad list (Position-sorted: Goalkeepers -> Defenders -> Midfielders -> Forwards) -->
          <div
            ref="squadScrollRef"
            class="space-y-1.5 max-h-[55vh] lg:max-h-[62vh] overflow-y-auto custom-scroll pr-1 flex-1"
          >
            <template
              v-for="(entry, idx) in roulette.squadWithEligibility"
              :key="entry.player.id"
            >
              <!-- Position Category Section Header -->
              <div
                v-if="idx === 0 || roulette.squadWithEligibility[idx - 1]?.player.basePosition !== entry.player.basePosition"
                class="pt-3 pb-1 px-1 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 select-none"
              >
                <span>{{ entry.player.basePosition }}s</span>
                <div class="flex-1 h-px bg-zinc-200 dark:bg-white/10" />
              </div>

              <button
                type="button"
                class="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 border cursor-pointer select-none"
                :class="[
                  selectedPlayer?.id === entry.player.id
                    ? 'bg-emerald-600/25 border-emerald-500 ring-2 ring-emerald-500 shadow-md scale-[1.01]'
                    : isPlayerEligibleForSelectedSlot(entry.player)
                      ? 'bg-zinc-50 hover:bg-emerald-50/80 dark:bg-zinc-800/70 dark:hover:bg-emerald-950/40 border-zinc-200/80 dark:border-white/5 hover:border-emerald-400/50 shadow-sm active:scale-[0.99]'
                      : 'bg-zinc-100/50 dark:bg-zinc-900/30 border-transparent opacity-35 cursor-not-allowed'
                ]"
                :disabled="!isPlayerEligibleForSelectedSlot(entry.player)"
                @mouseenter="hoveredPlayer = entry.player"
                @mouseleave="hoveredPlayer = null"
                @click="onPlayerClick(entry.player)"
              >
                <!-- Shirt number -->
                <span class="w-6 text-center font-mono text-xs text-zinc-600 dark:text-zinc-400 font-bold shrink-0">
                  {{ entry.player.shirtNumber ?? '–' }}
                </span>

                <!-- Position badge -->
                <span
                  class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 w-9 text-center"
                  :class="positionColor(entry.player.primaryPosition)"
                >
                  {{ entry.player.primaryPosition }}
                </span>

                <!-- Name -->
                <span class="flex-1 text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {{ entry.player.name }}
                </span>

                <!-- OVR rating badge -->
                <span
                  class="font-mono text-xs font-black px-2 py-0.5 rounded-md border shrink-0"
                  :class="entry.player.stats.overall >= 90
                    ? 'bg-gold-500/15 border-gold-500/40 text-gold-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    : entry.player.stats.overall >= 85
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

      <!-- Right column: Tactical Pitch Formation -->
      <div
        class="flex flex-col lg:col-span-5"
        :class="{ 'hidden lg:flex': mobileTab === 'squad' }"
      >
        <div class="surface-card p-5 space-y-4 flex-1 flex flex-col">
          <div class="flex items-center justify-between px-1 shrink-0">
            <div>
              <h3 class="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Tactical Pitch</span>
                <span class="text-xs font-mono font-normal text-zinc-500">({{ draft.formation?.label }})</span>
              </h3>
            </div>
            <span class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
              {{ draft.filledSlots.length }}/11 Selected
            </span>
          </div>

          <!-- Pitch fills remaining card height -->
          <div class="flex-1 min-h-[420px]">
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
</template>
