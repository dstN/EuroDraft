<script setup lang="ts">
import type { NuxtError } from '#app'
import AppLogo from '~/components/shared/AppLogo.vue'

const props = defineProps<{
  error: NuxtError
}>()

const STATUS_COPY: Record<number, { eyebrow: string, title: string, message: string }> = {
  400: {
    eyebrow: 'Foul',
    title: 'Bad Request',
    message: 'That request wasn\'t a legal play. Double-check what you sent and try again.'
  },
  404: {
    eyebrow: 'Offside',
    title: 'This Page Doesn\'t Exist',
    message: 'The page you\'re looking for was never drafted. Check the URL, or head back to the pitch.'
  },
  429: {
    eyebrow: 'Time Wasting',
    title: 'Slow Down',
    message: 'You\'re making requests faster than a counter-attack. Wait a moment and try again.'
  },
  500: {
    eyebrow: 'Var Review',
    title: 'Something Went Wrong',
    message: 'Our server hit a bad tackle. Try refreshing, or head back to the homepage.'
  },
  503: {
    eyebrow: 'Postponed',
    title: 'Service Unavailable',
    message: 'We\'re temporarily off the pitch for maintenance. Please check back shortly.'
  }
}

const statusCode = computed(() => props.error.statusCode ?? 500)

const copy = computed(() => STATUS_COPY[statusCode.value] ?? {
  eyebrow: 'Full Time',
  title: 'Unexpected Error',
  message: props.error.statusMessage || 'Something didn\'t go to plan. Try heading back to the homepage.'
})

useSeoMeta({
  title: `${statusCode.value} — EuroDraft`,
  robots: 'noindex'
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="relative min-h-dvh flex flex-col items-center justify-center text-zinc-900 dark:text-zinc-100 px-4">
    <div
      class="stadium-canvas"
      aria-hidden="true"
    />

    <main class="relative z-10 flex flex-col items-center gap-6 max-w-md text-center">
      <NuxtLink
        to="/"
        aria-label="EuroDraft Homepage"
        class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
      >
        <AppLogo
          variant="horizontal"
          size="lg"
        />
      </NuxtLink>

      <div class="surface-card p-8 space-y-5 w-full">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 dark:bg-emerald-950/60 text-xs uppercase font-mono tracking-[0.2em] font-bold text-emerald-800 dark:text-emerald-300">
            {{ copy.eyebrow }} · {{ statusCode }}
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            {{ copy.title }}
          </h1>
          <p class="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {{ copy.message }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-1">
          <button
            type="button"
            class="btn-nested bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white shadow-lg shadow-emerald-800/25 justify-center cursor-pointer font-bold w-full sm:w-auto"
            @click="goHome"
          >
            <span>Back to Homepage</span>
            <span class="btn-nested-icon bg-emerald-900 text-white">
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-white"
                aria-hidden="true"
              />
            </span>
          </button>
          <NuxtLink
            to="/draft/formation"
            class="rounded-full px-5 py-2.5 border border-zinc-300 dark:border-white/10 text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center w-full sm:w-auto"
          >
            Start Drafting
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
