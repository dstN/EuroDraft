<script setup lang="ts">
import AppLogo from '~/components/shared/AppLogo.vue'

defineProps<{
  show: boolean
  message?: string | null
}>()
</script>

<template>
  <Transition name="splash-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#060b10] text-zinc-900 dark:text-white select-none transition-colors duration-200"
      role="status"
      aria-live="polite"
      aria-label="Loading EuroDraft"
    >
      <!-- Deep Stadium Atmospheric Lights (Fixed backdrop) -->
      <div
        class="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[120px] animate-pulse" />
        <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[100px]" />
      </div>

      <!-- Centered Animated Logo Loader (without "BUILD YOUR LEGACY" text) -->
      <div class="relative z-10 flex flex-col items-center gap-7 px-6 text-center">
        <AppLogo
          variant="loader"
          size="lg"
          :animated="true"
        />

        <!-- Micro Stadium Progress Bar -->
        <div class="w-52 sm:w-64 h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden relative shadow-inner">
          <div class="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 rounded-full animate-loading-bar" />
        </div>

        <!-- Optional Contextual Simulation / Transition Message -->
        <p
          v-if="message"
          class="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-emerald-700 dark:text-emerald-400 animate-pulse mt-1"
        >
          {{ message }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes loadingBar {
  0% {
    width: 0%;
    transform: translateX(-100%);
  }
  50% {
    width: 70%;
    transform: translateX(20%);
  }
  100% {
    width: 100%;
    transform: translateX(100%);
  }
}

.animate-loading-bar {
  animation: loadingBar 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* Instant entrance to prevent any micro-flash of the upcoming page */
.splash-fade-enter-active {
  transition: none !important;
  opacity: 1 !important;
}

/* Smooth Fade Out Transition */
.splash-fade-leave-active {
  transition: opacity 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.splash-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
