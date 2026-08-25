<script setup lang="ts">
import AppLogo from '~/components/shared/AppLogo.vue'

const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const draft = useDraftStore()
const audio = useAudioStore()
const localePath = useLocalePath()

const navLinks = computed(() => [
  { label: t('nav.draft'), to: localePath('/draft/formation') },
  { label: t('nav.tournament'), to: localePath('/tournament') },
  { label: t('nav.compare'), to: localePath('/compare') },
  { label: t('nav.leaderboard'), to: localePath('/leaderboard') },
  { label: t('nav.legal'), to: localePath('/legal') }
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
  en: 'gb-eng',
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

const currentLocaleFlag = computed(() => LOCALE_FLAG_MAP[locale.value] ?? 'gb-eng')
const currentLocaleName = computed(() => {
  const found = (locales.value as Array<{ code: string, name: string }>).find(l => l.code === locale.value)
  return found?.code.toUpperCase() ?? 'EN'
})
</script>

<template>
  <div class="relative min-h-dvh flex flex-col text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
    <!-- Skip to Main Content link for keyboard accessibility (WCAG AAA & Best Practice) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-800 focus:text-white focus:font-bold focus:rounded-lg focus:shadow-xl focus:ring-2 focus:ring-white focus:outline-none"
    >
      {{ $t('common.skip_to_content') }}
    </a>

    <!-- Authentic Stadium Matchday Canvas Background (Fixed behind everything, zero cuts) -->
    <div
      class="stadium-canvas"
      aria-hidden="true"
    />

    <!-- Top Sticky Navigation Bar (Seamless glass, zero hard borders) -->
    <header class="sticky top-0 z-50 w-full bg-white/40 dark:bg-[#060b10]/40 backdrop-blur-md border-b border-black/[0.04] dark:border-white/[0.04] transition-colors">
      <div class="max-w-5xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-1 sm:gap-4 w-full">
        <!-- Official App Logo -->
        <NuxtLink
          :to="localePath('/')"
          class="flex items-center gap-1.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-0.5"
          :aria-label="$t('nav.homepage_aria')"
        >
          <AppLogo variant="horizontal" />
        </NuxtLink>

        <!-- Nav links + Active Draft Pill (horizontally scrollable so it never pushes
             the language/theme controls off-screen once it has more links than a
             narrow viewport can show at once) -->
        <nav
          class="nav-scroll flex items-center gap-1 sm:gap-2 min-w-0 overflow-x-auto"
          :aria-label="$t('nav.main_navigation_aria')"
        >
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            variant="ghost"
            color="neutral"
            size="sm"
            :label="link.label"
            class="font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white rounded-lg px-1.5 sm:px-3 py-1 shrink-0"
          />

          <NuxtLink
            v-if="draft.filledSlots.length > 0 && !draft.isComplete"
            :to="localePath('/draft')"
            class="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold shrink-0"
          >
            <span
              class="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            <span>{{ $t('nav.draft_progress_badge', { count: draft.filledSlots.length }) }}</span>
          </NuxtLink>
        </nav>

        <!-- Right side: Language + Theme Toggle -->
        <div class="flex items-center gap-1 sm:gap-2 shrink-0">
          <!-- Language selector dropdown with flag -->
          <UDropdownMenu :items="languageItems">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :leading-icon="`i-circle-flags-${currentLocaleFlag}`"
              :aria-label="$t('nav.change_language_aria')"
              class="font-mono font-bold text-xs rounded-lg px-1.5 sm:px-2.5 py-1 text-zinc-900 dark:text-zinc-100"
            >
              <span class="hidden sm:inline">{{ currentLocaleName }}</span>
              <span class="sm:hidden uppercase">{{ locale }}</span>
            </UButton>
          </UDropdownMenu>

          <!-- Audio Sound Effects Toggle -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="audio.isMuted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
            :aria-label="audio.isMuted ? $t('nav.unmute_aria') : $t('nav.mute_aria')"
            class="rounded-lg text-zinc-900 dark:text-zinc-100 p-1"
            @click="audio.toggleMute()"
          />

          <!-- Theme toggle -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            :aria-label="isDark ? $t('nav.light_mode_aria') : $t('nav.dark_mode_aria')"
            class="rounded-lg text-zinc-900 dark:text-zinc-100 p-1"
            @click="isDark = !isDark"
          />
        </div>
      </div>
    </header>

    <!-- Page content with consistent container spacing -->
    <main
      id="main-content"
      class="relative z-10 flex-1 py-8 focus:outline-none"
      tabindex="-1"
    >
      <slot />
    </main>

    <!-- Minimal footer with aligned max-w-5xl container -->
    <footer class="relative z-10 border-t border-black/[0.04] dark:border-white/[0.04] py-6 mt-12 bg-transparent">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
        <span>{{ $t('nav.footer_tagline') }}</span>
        <div class="flex items-center gap-6">
          <NuxtLink
            :to="localePath('/legal')"
            class="text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors underline-offset-4 hover:underline font-bold"
          >
            {{ $t('nav.legal') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/legal?tab=contact')"
            class="text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors underline-offset-4 hover:underline font-bold"
          >
            {{ $t('legal.tab_contact') }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
