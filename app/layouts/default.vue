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
  <div class="relative min-h-dvh flex flex-col bg-zinc-50 dark:bg-[#06090e] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 overflow-x-clip">
    <!-- Global Stadium Night Atmospheric Lighting (Seamless mesh across whole window, zero cut-off) -->
    <div
      class="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <!-- Top Stadium Pitch Floodlight (Flows behind header and radiates smoothly into hero) -->
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[750px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.18)_0%,rgba(16,185,129,0.06)_45%,transparent_70%)] blur-[45px]" />

      <!-- Mid-right Electric Stadium Azure Floodlight -->
      <div class="absolute top-[28%] -right-48 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.10)_0%,transparent_70%)] blur-[60px]" />

      <!-- Bottom Championship Trophy Gold Glow (Radiates from footer/CTA upwards) -->
      <div class="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[1100px] h-[750px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.16)_0%,rgba(245,158,11,0.04)_50%,transparent_70%)] blur-[55px]" />
    </div>

    <!-- Top Sticky Navigation Bar (Translucent glass with seamless backdrop glow) -->
    <header class="sticky top-0 z-50 w-full border-b border-zinc-200/60 dark:border-white/5 bg-white/70 dark:bg-[#06090e]/60 backdrop-blur-xl transition-colors">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 shrink-0 group"
        >
          <div class="size-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <UIcon
              name="i-lucide-trophy"
              class="size-4 text-white"
            />
          </div>
          <span class="font-black text-lg tracking-tight text-zinc-900 dark:text-white">EuroDraft</span>
        </NuxtLink>

        <!-- Nav links + Active Draft Pill -->
        <nav class="flex items-center gap-2">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            size="sm"
            :label="link.label"
            class="font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg px-3"
          />

          <NuxtLink
            v-if="draft.filledSlots.length > 0 && !draft.isComplete"
            to="/draft"
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold"
          >
            <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Draft ({{ draft.filledSlots.length }}/11)</span>
          </NuxtLink>
        </nav>

        <!-- Right side: Language + Theme Toggle -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Language selector dropdown with flag -->
          <UDropdownMenu :items="languageItems">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :leading-icon="`i-circle-flags-${currentLocaleFlag}`"
              :label="currentLocaleName"
              class="font-mono font-bold text-xs rounded-lg px-2.5 py-1"
            />
          </UDropdownMenu>

          <!-- Theme toggle -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            class="rounded-lg"
            @click="isDark = !isDark"
          />
        </div>
      </div>
    </header>

    <!-- Page content with consistent container spacing -->
    <main class="relative z-10 flex-1 py-8">
      <slot />
    </main>

    <!-- Minimal footer with aligned max-w-5xl container -->
    <footer class="relative z-10 border-t border-zinc-200/60 dark:border-white/5 py-6 mt-12 bg-transparent">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-medium">
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
