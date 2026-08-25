<script setup lang="ts">
import type { Player, TournamentRunStats, MatchResult } from '~/types'

const props = defineProps<{
  open: boolean
  teamName: string
  teamEmblem: string
  formation: string
  squad: Player[]
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: TournamentRunStats | null
  matches: MatchResult[]
  groupStandingRank?: number
  groupPoints?: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const activeTab = ref<'text' | 'image'>('text')
const localePath = useLocalePath()

const cardData = useShareCardData(props)
const submission = useShareSubmission(props)
const {
  agreeToSave,
  shareLinkUrl,
  onConsentToggle,
  copyShareLink,
  copiedLink,
  isGeneratingLink,
  agreeToLeaderboard,
  isSubmittingLeaderboard,
  leaderboardSubmitted,
  leaderboardError,
  onLeaderboardToggle
} = submission
const { wordleShareText, copiedText, copyShareText } = useShareCardText(props, cardData, submission)
const { canvasRef, copiedImage, renderCanvas, copyCanvasImage, downloadCanvasImage } = useShareCardCanvas(props, cardData)

watch([() => props.open, activeTab], ([isOpen]) => {
  if (isOpen) {
    nextTick(() => {
      renderCanvas()
    })
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="emit('update:open', false)"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          class="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 sm:p-6 text-zinc-100 animate-scale-in max-h-[90vh]"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UIcon
                  name="i-lucide-share-2"
                  class="size-5"
                />
              </div>
              <h3
                id="share-modal-title"
                class="text-base sm:text-lg font-bold text-white"
              >
                {{ $t('share.title') }}
              </h3>
            </div>

            <button
              type="button"
              class="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
              :aria-label="$t('share.close_aria')"
              @click="emit('update:open', false)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-5"
              />
            </button>
          </div>

          <!-- Format Switcher -->
          <div class="flex p-1 bg-black/40 rounded-xl border border-white/5 select-none">
            <button
              type="button"
              class="flex-1 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              :class="activeTab === 'text' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'"
              @click="activeTab = 'text'"
            >
              <UIcon
                name="i-lucide-file-text"
                class="size-4"
              />
              <span>{{ $t('share.tab_text') }}</span>
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              :class="activeTab === 'image' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'"
              @click="activeTab = 'image'"
            >
              <UIcon
                name="i-lucide-image"
                class="size-4"
              />
              <span>{{ $t('share.tab_image') }}</span>
            </button>
          </div>

          <!-- Explicit Opt-in Link Sharing & Database Storage Consent -->
          <div class="p-3.5 rounded-xl bg-zinc-800/80 border border-white/5 space-y-2">
            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input
                v-model="agreeToSave"
                type="checkbox"
                class="mt-1 size-4 accent-emerald-500 rounded cursor-pointer"
                @change="onConsentToggle"
              >
              <div class="text-xs text-zinc-300 space-y-0.5">
                <span class="font-bold text-white">{{ $t('share.save_link_title') }}</span>
                <p class="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  {{ $t('share.save_link_desc', { domain: 'ed.rntm.de' }) }}
                </p>
              </div>
            </label>

            <!-- Generated Link Box if active -->
            <div
              v-if="agreeToSave && shareLinkUrl"
              class="flex items-center gap-2 pt-1"
            >
              <input
                readonly
                :value="shareLinkUrl"
                :aria-label="$t('share.your_link_aria')"
                class="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-emerald-300 select-all focus:outline-none"
              >
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold cursor-pointer transition-colors shrink-0"
                @click="copyShareLink"
              >
                {{ copiedLink ? $t('share.copied_link') : $t('share.copy_link') }}
              </button>
            </div>
            <div
              v-else-if="agreeToSave && isGeneratingLink"
              class="text-xs font-mono text-zinc-400 animate-pulse"
            >
              {{ $t('share.generating_link') }}
            </div>
          </div>

          <!-- Explicit Opt-in Leaderboard Submission Consent -->
          <div class="p-3.5 rounded-xl bg-zinc-800/80 border border-white/5 space-y-2">
            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input
                v-model="agreeToLeaderboard"
                type="checkbox"
                class="mt-1 size-4 accent-amber-500 rounded cursor-pointer"
                :disabled="leaderboardSubmitted"
                @change="onLeaderboardToggle"
              >
              <div class="text-xs text-zinc-300 space-y-0.5">
                <span class="font-bold text-white">{{ $t('share.leaderboard_title') }}</span>
                <p class="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  {{ $t('share.leaderboard_desc', { ovr: lineRatings.overall }) }}
                </p>
              </div>
            </label>

            <div
              v-if="isSubmittingLeaderboard"
              class="text-xs font-mono text-zinc-400 animate-pulse"
            >
              {{ $t('share.submitting') }}
            </div>
            <div
              v-else-if="leaderboardSubmitted"
              class="text-xs font-mono text-emerald-400 font-bold"
            >
              {{ $t('share.submitted') }} <NuxtLink
                :to="localePath('/leaderboard')"
                class="underline"
              >{{ $t('share.view_leaderboard') }}</NuxtLink>
            </div>
            <div
              v-else-if="leaderboardError"
              class="text-xs font-mono text-rose-400"
            >
              {{ leaderboardError }}
            </div>
          </div>

          <!-- TAB 1: TEXT FORMAT -->
          <div
            v-if="activeTab === 'text'"
            class="space-y-4"
          >
            <div class="relative">
              <textarea
                readonly
                rows="9"
                :value="wordleShareText"
                :aria-label="$t('share.text_summary_aria')"
                class="w-full p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 resize-none focus:outline-none select-all"
              />
            </div>

            <button
              type="button"
              class="w-full py-3 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              @click="copyShareText"
            >
              <UIcon
                :name="copiedText ? 'i-lucide-check' : 'i-lucide-copy'"
                class="size-4"
              />
              <span>{{ copiedText ? $t('share.copied_text') : $t('share.copy_text') }}</span>
            </button>
          </div>

          <!-- TAB 2: CANVAS IMAGE FORMAT -->
          <div
            v-else
            class="space-y-4 flex flex-col items-center"
          >
            <div class="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg bg-black">
              <canvas
                ref="canvasRef"
                class="w-full h-auto block"
              />
            </div>

            <div class="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                class="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                @click="copyCanvasImage"
              >
                <UIcon
                  :name="copiedImage ? 'i-lucide-check' : 'i-lucide-copy'"
                  class="size-4"
                />
                <span>{{ copiedImage ? $t('share.copied_image') : $t('share.copy_image') }}</span>
              </button>

              <button
                type="button"
                class="py-2.5 px-4 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10 cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                @click="downloadCanvasImage"
              >
                <UIcon
                  name="i-lucide-download"
                  class="size-4"
                />
                <span>{{ $t('share.download_png') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-active {
  opacity: 0;
}
</style>
