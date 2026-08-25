<script setup lang="ts">
import type { NuxtError } from '#app'
import AppLogo from '~/components/shared/AppLogo.vue'

const props = defineProps<{
  error: NuxtError
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const STATUS_KEYS: Record<number, string> = {
  400: 'error.status_400',
  404: 'error.status_404',
  429: 'error.status_429',
  500: 'error.status_500',
  503: 'error.status_503'
}

const statusCode = computed(() => props.error.statusCode ?? 500)

const copy = computed(() => {
  const key = STATUS_KEYS[statusCode.value]
  if (key) {
    return {
      eyebrow: t(`${key}.eyebrow`),
      title: t(`${key}.title`),
      message: t(`${key}.message`)
    }
  }
  return {
    eyebrow: t('error.status_fallback.eyebrow'),
    title: t('error.status_fallback.title'),
    message: props.error.statusMessage || t('error.status_fallback.message')
  }
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
        :to="localePath('/')"
        :aria-label="$t('error.home_aria')"
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
            <span>{{ $t('error.back_home') }}</span>
            <span class="btn-nested-icon bg-emerald-900 text-white">
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-white"
                aria-hidden="true"
              />
            </span>
          </button>
          <NuxtLink
            :to="localePath('/draft/formation')"
            class="rounded-full px-5 py-2.5 border border-zinc-300 dark:border-white/10 text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center w-full sm:w-auto"
          >
            {{ $t('landing.cta_start') }}
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
