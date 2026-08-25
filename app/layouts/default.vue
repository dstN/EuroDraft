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

// Below sm, the horizontally-scrolling nav below has no visual hint that
// more links exist off-screen -- in practice, on a phone-width viewport
// only Draft/Tournament fit before the language/audio/theme controls eat
// the rest of the header, so Compare/Leaderboard/Legal were reachable only
// by a swipe nobody discovers. This is replaced by a full off-canvas menu
// (slide-in panel + backdrop) below sm, rather than a small inline dropdown.
const isMobileMenuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => {
  isMobileMenuOpen.value = false
})

// Lock body scroll while the off-canvas menu is open, and let Escape close it.
// The Escape listener has to be global (not bound on the panel itself) --
// focus isn't guaranteed to be inside the panel (e.g. it stays on the
// hamburger button that opened it), so a keydown handler scoped to the
// panel would never see the event bubble through it.
watch(isMobileMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isMobileMenuOpen.value) isMobileMenuOpen.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onGlobalKeydown)
})

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

        <!-- Nav links (sm and up) + Active Draft Pill -->
        <nav
          class="hidden sm:flex items-center gap-1 sm:gap-2 min-w-0"
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

        <!-- Right side: Mobile menu toggle + Language + Theme Toggle -->
        <div class="flex items-center gap-1 sm:gap-2 shrink-0">
          <!-- Mobile navigation toggle (below sm, opens the off-canvas menu) -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-menu"
            class="sm:hidden rounded-lg text-zinc-900 dark:text-zinc-100 p-1"
            aria-controls="mobile-nav-panel"
            :aria-expanded="isMobileMenuOpen"
            :aria-label="$t('nav.open_menu_aria')"
            @click="isMobileMenuOpen = true"
          />

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

    <!-- Mobile off-canvas navigation menu (below sm only): full-height slide-in
         panel + backdrop, teleported to <body> so it isn't clipped by the
         header's own stacking context and truly covers the viewport. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="sm:hidden fixed inset-0 z-[100] bg-black/50"
          @click="isMobileMenuOpen = false"
        />
      </Transition>
      <Transition
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <nav
          v-if="isMobileMenuOpen"
          id="mobile-nav-panel"
          class="sm:hidden fixed inset-y-0 right-0 z-[101] w-[80%] max-w-xs h-dvh bg-white dark:bg-[#0a0f16] shadow-2xl flex flex-col"
          :aria-label="$t('nav.main_navigation_aria')"
        >
          <div class="flex items-center justify-between h-16 px-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
            <AppLogo variant="horizontal" />
            <UButton
              size="sm"
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              :aria-label="$t('nav.close_menu_aria')"
              class="rounded-lg text-zinc-900 dark:text-zinc-100"
              @click="isMobileMenuOpen = false"
            />
          </div>

          <div class="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            <UButton
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              variant="ghost"
              color="neutral"
              size="lg"
              :label="link.label"
              class="justify-start font-semibold text-base text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white rounded-lg px-3 py-3 w-full"
            />

            <NuxtLink
              v-if="draft.filledSlots.length > 0 && !draft.isComplete"
              :to="localePath('/draft')"
              class="inline-flex items-center gap-1.5 mx-3 mt-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold self-start"
            >
              <span
                class="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              <span>{{ $t('nav.draft_progress_badge', { count: draft.filledSlots.length }) }}</span>
            </NuxtLink>
          </div>
        </nav>
      </Transition>
    </Teleport>

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
