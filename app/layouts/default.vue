<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const draft = useDraftStore()

const navLinks = computed(() => [
  { label: t('nav.draft'), to: '/draft/formation' },
  { label: t('nav.tournament'), to: '/tournament' }
])

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(val: boolean) {
    colorMode.preference = val ? 'dark' : 'light'
  }
})

const LOCALE_FLAG_MAP: Record<string, string> = {
  en: 'gb',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  ru: 'ru'
}

// Supported locales with display names
const availableLocales = computed(() => {
  return (locales.value as Array<{ code: string, name: string }>).map(l => ({
    label: l.name,
    value: l.code,
    flag: LOCALE_FLAG_MAP[l.code] ?? l.code,
    active: l.code === locale.value
  }))
})

const languageItems = computed(() => [
  availableLocales.value.map(l => ({
    label: l.label,
    icon: `i-circle-flags-${l.flag}`,
    onSelect: () => {
      setLocale(l.value as Parameters<typeof setLocale>[0])
    }
  }))
])

const currentLocaleFlag = computed(() => LOCALE_FLAG_MAP[locale.value] ?? 'gb')
const currentLocaleName = computed(() => {
  const found = (locales.value as Array<{ code: string, name: string }>).find(l => l.code === locale.value)
  return found?.code.toUpperCase() ?? 'EN'
})
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-zinc-50 dark:bg-pitch-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
    <!-- Floating glass nav pill -->
    <header class="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
      <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-full border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <!-- Logo -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 shrink-0"
        >
          <div class="size-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <UIcon
              name="i-lucide-trophy"
              class="size-3.5 text-white"
            />
          </div>
          <span class="font-black text-base tracking-tight text-zinc-900 dark:text-white">EuroDraft</span>
        </NuxtLink>

        <!-- Nav links + Active Draft Pill -->
        <nav class="flex items-center gap-1.5">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            size="sm"
            :label="link.label"
            class="font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-full px-3"
          />

          <NuxtLink
            v-if="draft.filledSlots.length > 0 && !draft.isComplete"
            to="/draft"
            class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold"
          >
            <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Draft ({{ draft.filledSlots.length }}/11)</span>
          </NuxtLink>
        </nav>

        <!-- Right side: Language + Theme Toggle -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Language selector dropdown with flag -->
          <UDropdownMenu :items="languageItems">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              :leading-icon="`i-circle-flags-${currentLocaleFlag}`"
              :label="currentLocaleName"
              class="font-mono font-bold text-xs rounded-full"
            />
          </UDropdownMenu>

          <!-- Theme toggle -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            class="rounded-full"
            @click="isDark = !isDark"
          />
        </div>
      </div>
    </header>

    <!-- Page content with top padding for the floating nav -->
    <main class="flex-1 pt-20">
      <slot />
    </main>

    <!-- Minimal footer -->
    <footer class="border-t border-zinc-200 dark:border-white/5 py-6 px-6 mt-12">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-medium">
        <span>EuroDraft — The Historical European Championship Simulator</span>
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/legal/impressum"
            class="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
          >
            {{ $t('nav.impressum') }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
