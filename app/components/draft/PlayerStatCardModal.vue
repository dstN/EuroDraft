<script setup lang="ts">
import type { Player, PositionCode } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'

const props = defineProps<{
  open: boolean
  player: Player | null
  canDraft?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'draft', player: Player): void
}>()

function close() {
  emit('update:open', false)
}

function handleDraft() {
  if (props.player) {
    emit('draft', props.player)
    close()
  }
}

// Card Tier based on OVR rating
const cardTier = computed<'legend' | 'star' | 'starter'>(() => {
  const ovr = props.player?.stats.overall ?? 75
  if (ovr >= 90) return 'legend'
  if (ovr >= 84) return 'star'
  return 'starter'
})

const tierStyles = computed(() => {
  switch (cardTier.value) {
    case 'legend':
      return {
        glow: 'shadow-[0_0_50px_rgba(251,191,36,0.25)] border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        ovrText: 'text-amber-400',
        headerGrad: 'from-amber-400 to-yellow-200'
      }
    case 'star':
      return {
        glow: 'shadow-[0_0_40px_rgba(16,185,129,0.2)] border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 via-zinc-900 to-zinc-950',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        ovrText: 'text-emerald-400',
        headerGrad: 'from-emerald-400 to-teal-200'
      }
    default:
      return {
        glow: 'shadow-[0_0_30px_rgba(56,189,248,0.15)] border-sky-500/30 bg-gradient-to-b from-sky-950/20 via-zinc-900 to-zinc-950',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        ovrText: 'text-sky-400',
        headerGrad: 'from-sky-400 to-blue-200'
      }
  }
})

interface StatItem {
  key: string
  label: string
  fullName: string
  val: number
  icon: string
}

const statsList = computed<StatItem[]>(() => {
  if (!props.player) return []
  const s = props.player.stats
  return [
    { key: 'pac', label: 'PAC', fullName: 'Pace & Acceleration', val: s.pace, icon: 'i-lucide-zap' },
    { key: 'sho', label: 'SHO', fullName: 'Shooting & Finishing', val: s.shooting, icon: 'i-lucide-crosshair' },
    { key: 'pas', label: 'PAS', fullName: 'Passing & Vision', val: s.passing, icon: 'i-lucide-sparkles' },
    { key: 'dri', label: 'DRI', fullName: 'Dribbling & Agility', val: s.dribbling, icon: 'i-lucide-activity' },
    { key: 'def', label: 'DEF', fullName: 'Defending & Tackling', val: s.defending, icon: 'i-lucide-shield' },
    { key: 'phy', label: 'PHY', fullName: 'Physical & Strength', val: s.physical, icon: 'i-lucide-dumbbell' }
  ]
})

function getStatColorClass(val: number) {
  if (val >= 85) return 'text-emerald-400 bg-emerald-500'
  if (val >= 75) return 'text-amber-400 bg-amber-500'
  return 'text-sky-400 bg-sky-500'
}

function getPositionColor(pos: PositionCode) {
  if (pos === 'GK') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (['LB', 'CB', 'RB'].includes(pos)) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open && player"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        @click.self="close"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-stat-card-title"
          class="relative w-full max-w-md rounded-2xl border p-5 sm:p-6 transition-all select-none overflow-hidden"
          :class="tierStyles.glow"
        >
          <!-- Close Button -->
          <button
            type="button"
            class="absolute top-4 right-4 z-20 size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close stat card"
            @click="close"
          >
            <UIcon
              name="i-lucide-x"
              class="size-5"
            />
          </button>

          <!-- Top Badge: Tier + Year Edition -->
          <div class="flex items-center justify-between gap-2 pr-8 mb-4">
            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
              :class="tierStyles.badge"
            >
              {{ cardTier === 'legend' ? '⭐ Legendary Master' : cardTier === 'star' ? '✨ Continental Star' : '🛡️ Tournament Starter' }}
            </span>
            <span class="text-xs font-mono font-bold text-zinc-400">
              Euro {{ player.year }}
            </span>
          </div>

          <!-- Main Player Header: OVR + Flag + Name -->
          <div class="flex items-center gap-4 pb-4 border-b border-white/10">
            <!-- Large OVR Hexagon/Square -->
            <div class="flex flex-col items-center justify-center size-16 sm:size-18 rounded-2xl bg-black/60 border border-white/15 shrink-0 shadow-inner">
              <span
                class="text-2xl sm:text-3xl font-black font-mono leading-none"
                :class="tierStyles.ovrText"
              >
                {{ player.stats.overall }}
              </span>
              <span class="text-[9px] font-mono font-bold tracking-widest text-zinc-400 mt-0.5">
                GES
              </span>
            </div>

            <!-- Identity: Name + Nation + Primary Position -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <CountryFlag
                  :country="player.country"
                  size="sm"
                  class="size-5 shrink-0"
                />
                <span class="text-xs font-bold font-mono text-zinc-300 truncate">
                  {{ player.countryName }}
                </span>
                <span
                  v-if="player.shirtNumber"
                  class="text-[11px] font-mono font-bold text-zinc-500"
                >
                  #{{ player.shirtNumber }}
                </span>
              </div>

              <h3
                id="player-stat-card-title"
                class="text-lg sm:text-xl font-black text-white tracking-tight truncate"
              >
                {{ player.name }}
              </h3>

              <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-mono font-black border"
                  :class="getPositionColor(player.primaryPosition)"
                >
                  {{ player.primaryPosition }}
                </span>
                <span class="text-[11px] font-mono text-zinc-400">
                  {{ player.basePosition }}
                </span>
              </div>
            </div>
          </div>

          <!-- Playable Positions Section -->
          <div class="mt-3.5 pb-3 border-b border-white/10">
            <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <UIcon
                name="i-lucide-map-pin"
                class="size-3.5 text-emerald-400"
              />
              <span>Tactical Slot Eligibility</span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span
                v-for="pos in player.positions"
                :key="pos"
                class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                :class="getPositionColor(pos)"
              >
                {{ pos }}
              </span>
            </div>
          </div>

          <!-- 6-Attribute Breakdown (PAC / SHO / PAS / DRI / DEF / PHY) -->
          <div class="mt-3.5 space-y-2.5">
            <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-sliders"
                  class="size-3.5 text-amber-400"
                />
                <span>Attribute Ratings</span>
              </span>
              <span class="text-[10px] font-mono text-zinc-500">Scale 0–99</span>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div
                v-for="stat in statsList"
                :key="stat.key"
                class="flex flex-col gap-1"
              >
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-zinc-300 font-bold flex items-center gap-1.5">
                    <UIcon
                      :name="stat.icon"
                      class="size-3 text-zinc-400"
                    />
                    {{ stat.label }}
                  </span>
                  <span
                    class="font-black"
                    :class="getStatColorClass(stat.val).split(' ')[0]"
                  >
                    {{ stat.val }}
                  </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getStatColorClass(stat.val).split(' ')[1]"
                    :style="{ width: `${stat.val}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-5 flex items-center gap-2.5">
            <button
              v-if="canDraft"
              type="button"
              class="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              @click="handleDraft"
            >
              <UIcon
                name="i-lucide-user-plus"
                class="size-4"
              />
              <span>Draft Player</span>
            </button>
            <button
              type="button"
              class="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              :class="canDraft ? '' : 'flex-1'"
              @click="close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
