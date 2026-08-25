<script setup lang="ts">
defineProps<{
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
}>()

const emit = defineEmits<{
  playAgain: []
  share: []
}>()

const localePath = useLocalePath()
</script>

<template>
  <div
    class="surface-card p-6 sm:p-8 text-center space-y-4 relative overflow-hidden"
    :class="outcome === 'winner' ? 'bg-gradient-to-b from-amber-500/20 via-transparent to-transparent border-amber-500/50 ring-1 ring-amber-500/40 shadow-2xl' : ''"
  >
    <!-- 1. Winner / Champion -->
    <div
      v-if="outcome === 'winner'"
      class="space-y-2"
    >
      <UIcon
        name="i-lucide-trophy"
        class="size-16 mx-auto mb-2 text-amber-400 animate-bounce"
      />
      <h2 class="gold-text text-3xl sm:text-5xl font-black">
        {{ $t('results.champion_title') }}
      </h2>
      <p class="text-zinc-700 dark:text-zinc-300 max-w-md mx-auto text-sm font-medium">
        {{ $t('results.champion_subtitle') }}
      </p>
    </div>

    <!-- 2. Runner-Up / Finalist -->
    <div
      v-else-if="outcome === 'runner_up'"
      class="space-y-2"
    >
      <UIcon
        name="i-lucide-medal"
        class="size-14 mx-auto mb-2 text-slate-300"
      />
      <h2 class="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white">
        {{ $t('results.runner_up_title') }}
      </h2>
      <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
        {{ $t('results.runner_up_subtitle') }}
      </p>
    </div>

    <!-- 3. Semi-Finalist -->
    <div
      v-else-if="outcome === 'semi_final'"
      class="space-y-2"
    >
      <UIcon
        name="i-lucide-award"
        class="size-12 mx-auto mb-2 text-amber-600"
      />
      <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
        {{ $t('results.semi_final_title') }}
      </h2>
      <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
        {{ $t('results.semi_final_subtitle') }}
      </p>
    </div>

    <!-- 4. Quarter-Finalist -->
    <div
      v-else-if="outcome === 'quarter_final'"
      class="space-y-2"
    >
      <UIcon
        name="i-lucide-shield-alert"
        class="size-12 mx-auto mb-2 text-zinc-400"
      />
      <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
        {{ $t('results.quarter_final_title') }}
      </h2>
      <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
        {{ $t('results.quarter_final_subtitle') }}
      </p>
    </div>

    <!-- 5. Group Stage Eliminated -->
    <div
      v-else
      class="space-y-2"
    >
      <UIcon
        name="i-lucide-flag-off"
        class="size-12 mx-auto mb-2 text-zinc-500"
      />
      <h2 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
        {{ $t('results.group_stage_title') }}
      </h2>
      <p class="text-zinc-600 dark:text-zinc-300 max-w-md mx-auto text-sm">
        {{ $t('results.group_stage_subtitle') }}
      </p>
    </div>

    <!-- Action Buttons (Play Again, Share Results, Exit Home) -->
    <div class="pt-3 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="rounded-full px-6 py-2.5 font-bold text-sm bg-emerald-900 hover:bg-emerald-800 text-white cursor-pointer shadow-lg inline-flex items-center gap-2 transition-all active:scale-[0.99]"
        @click="emit('playAgain')"
      >
        <UIcon
          name="i-lucide-refresh-cw"
          class="size-4"
        />
        <span>{{ $t('results.play_again') }}</span>
      </button>

      <button
        type="button"
        class="rounded-full px-6 py-2.5 font-bold text-sm bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white cursor-pointer shadow-lg inline-flex items-center gap-2 transition-all active:scale-[0.99]"
        @click="emit('share')"
      >
        <UIcon
          name="i-lucide-share-2"
          class="size-4"
        />
        <span>{{ $t('results.share') }}</span>
      </button>

      <NuxtLink
        :to="localePath('/history')"
        class="rounded-full px-5 py-2.5 font-bold text-sm bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white inline-flex items-center gap-2 transition-colors"
      >
        <UIcon
          name="i-lucide-history"
          class="size-4"
        />
        <span>{{ $t('results.view_history') }}</span>
      </NuxtLink>

      <NuxtLink
        :to="localePath('/')"
        class="rounded-full px-5 py-2.5 font-bold text-sm bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white inline-flex items-center gap-2 transition-colors"
      >
        <UIcon
          name="i-lucide-home"
          class="size-4"
        />
        <span>{{ $t('results.exit_home') }}</span>
      </NuxtLink>
    </div>

    <!-- Scroll Notice -->
    <p class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 pt-2">
      {{ $t('results.scroll_notice') }}
    </p>
  </div>
</template>
