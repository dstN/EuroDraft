<script setup lang="ts">
import AppLogo from '~/components/shared/AppLogo.vue'

defineProps<{
  show: boolean
}>()
</script>

<template>
  <Transition name="splash-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060b10] select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading EuroDraft"
    >
      <!-- Deep Stadium Atmospheric Lights (Fixed backdrop) -->
      <div
        class="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[110px] animate-pulse" />
        <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[220px] bg-amber-500/10 rounded-full blur-[90px]" />
      </div>

      <!-- Centered Animated Logo Loader (without "BUILD YOUR LEGACY" text) -->
      <div class="relative z-10 flex flex-col items-center gap-6">
        <AppLogo
          variant="loader"
          size="lg"
          :animated="true"
        />

        <!-- High-End Micro Stadium Progress Bar -->
        <div class="w-44 h-1 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
          <div class="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 rounded-full animate-loading-bar" />
        </div>
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

/* Smooth Fade Out Transition */
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
}
</style>
