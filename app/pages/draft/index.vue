<script setup lang="ts">
import type { DraftSlot, Player } from '~/types'
import FormationPitch from '~/components/draft/FormationPitch.vue'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import RouletteWheelReel from '~/components/draft/RouletteWheelReel.vue'
import PlayerStatCardModal from '~/components/draft/PlayerStatCardModal.vue'
import AppLogo from '~/components/shared/AppLogo.vue'
import DraftSquadList from '~/components/draft/DraftSquadList.vue'

definePageMeta({ layout: 'default', middleware: ['ensure-database'] })

const draft = useDraftStore()
const roulette = useRouletteStore()
const appLoading = useAppLoading()
const audio = useAudioStore()
const { t, te } = useI18n()

// Player stat inspection modal state
const inspectedPlayer = ref<Player | null>(null)
const isStatModalOpen = ref(false)

function inspectPlayer(player: Player) {
  inspectedPlayer.value = player
  isStatModalOpen.value = true
  audio.playTick()
}

function onPlayerDraftFromModal(player: Player) {
  onPlayerClick(player)
}

// Mobile view tab state: 'squad' | 'pitch'
const mobileTab = ref<'squad' | 'pitch'>('squad')

// Mobile touch swipe gestures
const touchStartX = ref(0)
const touchStartY = ref(0)

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1 && e.touches[0]) {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.changedTouches.length === 1 && e.changedTouches[0]) {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const dx = endX - touchStartX.value
    const dy = endY - touchStartY.value

    // Check if horizontal swipe is significant and predominantly horizontal
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0 && mobileTab.value === 'squad') {
        // Swipe left: squad -> pitch
        mobileTab.value = 'pitch'
        audio.playTick()
      } else if (dx > 0 && mobileTab.value === 'pitch') {
        // Swipe right: pitch -> squad
        mobileTab.value = 'squad'
        audio.playTick()
      }
    }
  }
}

// Wheel spinning state for reel animation
const isSpinningReel = ref(false)

// In-card loading transition state (logo animation confined to squad card only)
const isCardTransitioning = ref(false)
const currentSpinType = ref<'all' | 'nation' | 'year'>('all')

// Flying player disc animation state
interface FlyingToken {
  player: Player
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
}

const flyingToken = ref<FlyingToken | null>(null)
const pulsingSlotId = ref<string | null>(null)

// Handle browser/phone physical back button or swipe gesture
function handlePopState(_event: PopStateEvent) {
  // If we are currently showing the pitch on mobile due to player selection or tab
  if (mobileTab.value === 'pitch') {
    mobileTab.value = 'squad'
    selectedPlayer.value = null
    selectedSlotId.value = null
    hoveredPlayer.value = null
  }
}

// Redirect if no formation selected or if draft already complete
onMounted(() => {
  if (!draft.formation) {
    navigateTo('/draft/formation')
    return
  }
  if (draft.isComplete) {
    navigateTo('/tournament')
    return
  }
  if (!roulette.currentCountry) {
    roulette.spin()
  }
  window.addEventListener('popstate', handlePopState)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState)
})

function spinWithAnimation() {
  if (isCardTransitioning.value) return
  currentSpinType.value = 'all'
  isCardTransitioning.value = true
  isSpinningReel.value = true
  audio.playSpinTick()
  roulette.spin()

  const duration = getRandomAnimationDuration(1050)
  setTimeout(() => {
    isCardTransitioning.value = false
    isSpinningReel.value = false
  }, duration)
}

function rerollYearWithAnimation() {
  if (draft.rerollsRemaining <= 0 || isSpinningReel.value || isCardTransitioning.value) return
  currentSpinType.value = 'year'
  isCardTransitioning.value = true
  isSpinningReel.value = true
  audio.playReroll()
  roulette.rerollYear()

  const duration = getRandomAnimationDuration(1050)
  setTimeout(() => {
    isCardTransitioning.value = false
    isSpinningReel.value = false
  }, duration)
}

function rerollNationWithAnimation() {
  if (draft.rerollsRemaining <= 0 || isSpinningReel.value || isCardTransitioning.value) return
  currentSpinType.value = 'nation'
  isCardTransitioning.value = true
  isSpinningReel.value = true
  audio.playReroll()
  roulette.rerollNation()

  const duration = getRandomAnimationDuration(1050)
  setTimeout(() => {
    isCardTransitioning.value = false
    isSpinningReel.value = false
  }, duration)
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
  audio.playTick()

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
    goBackToSquad()
    return
  }

  selectedPlayer.value = player
  selectedSlotId.value = null

  // On mobile: smoothly switch to pitch view and push a state to history so back gesture stays on squad list
  mobileTab.value = 'pitch'
  if (typeof window !== 'undefined') {
    window.history.pushState({ eurodraft_mobile_view: 'pitch' }, '')
  }
}

// When user clicks a slot on the Tactical Pitch
function onPitchSlotClick(slot: DraftSlot) {
  if (slot.player) return
  audio.playTick()

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
  audio.playDraftChime()

  let sourceEl: HTMLElement | null = null
  let targetEl: HTMLElement | null = null

  if (typeof document !== 'undefined') {
    sourceEl = document.getElementById(`player-item-${player.id}`)
    targetEl = document.getElementById(`pitch-slot-${slot.id}`)
  }

  // If both elements are rendered and visible, animate flying disc token!
  if (sourceEl && targetEl) {
    const sRect = sourceEl.getBoundingClientRect()
    const tRect = targetEl.getBoundingClientRect()

    flyingToken.value = {
      player,
      x: sRect.left + sRect.width / 2,
      y: sRect.top + sRect.height / 2,
      scale: 1.2,
      rotation: -8,
      opacity: 1
    }

    // Trigger transition to target slot coordinates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (flyingToken.value) {
          flyingToken.value.x = tRect.left + tRect.width / 2
          flyingToken.value.y = tRect.top + tRect.height / 2
          flyingToken.value.scale = 1.0
          flyingToken.value.rotation = 0
        }
      })
    })

    setTimeout(() => {
      flyingToken.value = null
      pulsingSlotId.value = slot.id
      draft.draftPlayer(slot.id, player)
      selectedPlayer.value = null
      selectedSlotId.value = null
      hoveredPlayer.value = null

      setTimeout(() => {
        if (pulsingSlotId.value === slot.id) pulsingSlotId.value = null
      }, 700)

      if (draft.isComplete) {
        appLoading.show('Preparing Tournament Simulation...', getRandomAnimationDuration(1250))
        navigateTo('/tournament')
        return
      }

      if (typeof window !== 'undefined' && window.history.state?.eurodraft_mobile_view === 'pitch') {
        window.history.back()
      }
      mobileTab.value = 'squad'
      spinWithAnimation()
    }, 420)
  } else {
    // Immediate assignment with touchdown pulse
    pulsingSlotId.value = slot.id
    draft.draftPlayer(slot.id, player)
    selectedPlayer.value = null
    selectedSlotId.value = null
    hoveredPlayer.value = null

    setTimeout(() => {
      if (pulsingSlotId.value === slot.id) pulsingSlotId.value = null
    }, 700)

    if (draft.isComplete) {
      appLoading.show('Preparing Tournament Simulation...', getRandomAnimationDuration(1250))
      navigateTo('/tournament')
      return
    }

    if (typeof window !== 'undefined' && window.history.state?.eurodraft_mobile_view === 'pitch') {
      window.history.back()
    }
    mobileTab.value = 'squad'
    spinWithAnimation()
  }
}

function goBackToSquad() {
  audio.playTick()
  mobileTab.value = 'squad'
  selectedPlayer.value = null
  selectedSlotId.value = null
  hoveredPlayer.value = null
  if (typeof window !== 'undefined' && window.history.state?.eurodraft_mobile_view === 'pitch') {
    window.history.back()
  }
}

function cancelSelection() {
  goBackToSquad()
}

function isPlayerEligibleForSelectedSlot(player: Player): boolean {
  if (selectedSlotId.value) {
    const slot = draft.slots.find(s => s.id === selectedSlotId.value)
    if (slot) return player.positions.includes(slot.position)
  }
  return draft.canDraftToAnySlot(player)
}

const currentCountryDisplayName = computed(() => {
  const code = roulette.currentCountry?.toLowerCase() ?? 'de'
  return te(`countries.${code}`) ? t(`countries.${code}`) : getCountryName(code)
})

const formationShortName = computed(() => {
  return draft.formation?.label.replace(/\s*\([^)]*\)/, '') ?? draft.formation?.id ?? '4-3-3'
})
</script>

<template>
  <div
    class="max-w-5xl mx-auto px-3 sm:px-6 space-y-4 sm:space-y-6"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- Top HUD Bar: Team Identity & Progress (Clean surface-card) -->
    <div class="surface-card p-3 sm:p-4">
      <div class="flex items-center justify-between gap-3">
        <!-- Left: Team Identity & OVR -->
        <div class="flex items-center gap-3 min-w-0">
          <CountryFlag
            :country="draft.teamEmblem || 'eu'"
            size="md"
            class="shrink-0"
          />
          <div class="min-w-0">
            <h1 class="text-base sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <span class="truncate">{{ draft.teamName || 'Dream XI' }}</span>
              <span class="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-500/40 shadow-xs shrink-0">
                {{ draft.teamOVR }} OVR
              </span>
            </h1>
            <p class="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold">
              Drafted {{ draft.filledSlots.length }} / 11 Players
            </p>
          </div>
        </div>

        <!-- Right: Formation + mode badges -->
        <div class="shrink-0 flex items-center gap-1.5">
          <span
            v-if="draft.isLegendMode"
            class="px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/15 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-mono font-black text-xs shadow-xs"
          >
            ⭐ Legend
          </span>
          <span class="px-3 py-1 rounded-full border border-zinc-300 dark:border-white/15 bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-mono font-black text-xs shadow-xs">
            {{ formationShortName }}
          </span>
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
        <div class="surface-card p-4 sm:p-5 space-y-4 flex-1 flex flex-col relative overflow-hidden">
          <!-- In-Card Loading Transition with Animated Logo Loader (confined to this card only) -->
          <Transition name="card-splash">
            <div
              v-if="isCardTransitioning"
              class="absolute inset-0 w-full h-full z-40 flex flex-col items-center justify-center bg-[#060b10] rounded-[inherit] p-6 text-center space-y-4 select-none"
              role="status"
              aria-live="polite"
              aria-label="Loading next squad"
            >
              <AppLogo
                variant="loader"
                size="md"
                :animated="true"
              />
              <div class="w-40 sm:w-48 h-1 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                <div class="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 rounded-full animate-loading-bar" />
              </div>
              <p class="text-xs font-mono font-bold tracking-widest uppercase text-white animate-pulse">
                {{ currentSpinType === 'year' ? 'Rerolling Tournament Year...' : currentSpinType === 'nation' ? 'Rerolling National Squad...' : 'Spinning Next Squad...' }}
              </p>
            </div>
          </Transition>

          <!-- Dead-end: no remaining squad has a draftable player for the open slots -->
          <div
            v-if="roulette.noValidSquadsRemaining"
            class="flex flex-col items-center text-center gap-3 py-10 px-4"
          >
            <UIcon
              name="i-lucide-shield-alert"
              class="size-10 text-amber-500"
            />
            <h2 class="text-base font-black text-zinc-900 dark:text-white">
              No More Eligible Squads
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs">
              {{ draft.isLegendMode
                ? "No remaining historical squad has a 90+ rated player for your open positions. Try a different formation — some position combinations are too scarce in Legend Mode."
                : "No remaining historical squad has a player who fits your open positions." }}
            </p>
            <UButton
              color="primary"
              label="Choose a Different Formation"
              class="rounded-full font-bold"
              @click="navigateTo('/draft/formation')"
            />
          </div>

          <!-- Team header with Animated Roulette Reel -->
          <div
            v-else
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/5"
          >
            <RouletteWheelReel
              :is-spinning="isSpinningReel"
              :spin-type="currentSpinType"
              :target-country="roulette.currentCountry"
              :target-year="roulette.currentYear"
              :target-country-name="currentCountryDisplayName"
              @spin-complete="isSpinningReel = false"
            />

            <!-- Reroll controls (hidden in Challenge Mode) -->
            <div
              v-if="!draft.isChallengeMode"
              class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-1 sm:pt-0"
            >
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
              <p class="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                {{ $t('draft.rerolls_remaining', { count: draft.rerollsRemaining }) }}
              </p>
            </div>

            <!-- Challenge Mode badge -->
            <div
              v-else
              class="flex sm:flex-col items-center sm:items-end justify-center gap-1 shrink-0 pt-1 sm:pt-0"
            >
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-950/70 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-mono font-black uppercase tracking-wider">
                🎲 {{ $t('draft.challenge_mode') }}
              </span>
              <p class="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold">
                {{ $t('draft.no_rerolls') }}
              </p>
            </div>
          </div>

          <!-- Squad list (Position-sorted: Goalkeepers -> Defenders -> Midfielders -> Forwards) -->
          <DraftSquadList
            v-if="!roulette.noValidSquadsRemaining"
            :squad-with-eligibility="roulette.squadWithEligibility"
            :selected-player-id="selectedPlayer?.id"
            :is-player-eligible="isPlayerEligibleForSelectedSlot"
            @select-player="onPlayerClick"
            @inspect-player="inspectPlayer"
            @hover-player="hoveredPlayer = $event"
          />
        </div>
      </div>

      <!-- Right column: Tactical Pitch Formation -->
      <div
        class="flex flex-col lg:col-span-5"
        :class="{ 'hidden lg:flex': mobileTab === 'squad' }"
      >
        <div class="surface-card p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
          <!-- Mobile Pitch Navigation Bar (Visible only on mobile when viewing pitch) -->
          <div class="lg:hidden flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/10">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-xs cursor-pointer transition-colors border border-zinc-300/60 dark:border-white/10 select-none"
              @click="goBackToSquad"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4 text-emerald-500"
              />
              <span>Back to Squad</span>
            </button>
            <div
              v-if="selectedPlayer"
              class="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 truncate"
            >
              <span class="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10">{{ selectedPlayer.primaryPosition }}</span>
              <span class="truncate max-w-[130px]">{{ selectedPlayer.name }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between px-1 shrink-0">
            <div>
              <h2 class="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Tactical Pitch</span>
                <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">({{ formationShortName }})</span>
              </h2>
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
              :pulse-slot-id="pulsingSlotId"
              :interactive="true"
              class="h-full"
              @select-slot="onPitchSlotClick"
              @inspect-player="inspectPlayer"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Player Stat Card Modal -->
    <PlayerStatCardModal
      v-model:open="isStatModalOpen"
      :player="inspectedPlayer"
      :can-draft="inspectedPlayer ? isPlayerEligibleForSelectedSlot(inspectedPlayer) : false"
      @draft="onPlayerDraftFromModal"
    />

    <!-- Flying Player Disc Token Animation (Physics trajectory from list to pitch slot) -->
    <Teleport to="body">
      <div
        v-if="flyingToken"
        class="fixed pointer-events-none z-50 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none"
        :style="{
          left: `${flyingToken.x}px`,
          top: `${flyingToken.y}px`,
          transform: `translate(-50%, -50%) scale(${flyingToken.scale}) rotate(${flyingToken.rotation}deg)`,
          opacity: flyingToken.opacity
        }"
      >
        <div class="size-11 sm:size-12 rounded-full bg-zinc-950/95 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.9)] flex flex-col items-center justify-center">
          <span class="font-mono font-black text-xs sm:text-sm text-emerald-300">{{ flyingToken.player.stats.overall }}</span>
          <span class="font-mono text-[8px] sm:text-[9px] text-zinc-300 leading-none">{{ flyingToken.player.primaryPosition }}</span>
        </div>
        <div class="mt-1 px-2 py-0.5 rounded bg-zinc-900/95 border border-white/20 text-[9px] font-bold text-white font-mono shadow-xl truncate max-w-[85px] text-center">
          {{ flyingToken.player.name }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.card-splash-enter-active,
.card-splash-leave-active {
  transition: opacity 0.25s ease;
}

.card-splash-enter-from,
.card-splash-leave-to {
  opacity: 0;
}

@keyframes cardLoadingBar {
  0% {
    width: 0%;
    transform: translateX(-100%);
  }
  50% {
    width: 75%;
    transform: translateX(20%);
  }
  100% {
    width: 100%;
    transform: translateX(100%);
  }
}

.animate-loading-bar {
  animation: cardLoadingBar 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
</style>
