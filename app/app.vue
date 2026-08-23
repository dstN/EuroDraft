<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'
import AppLoadingScreen from '~/components/shared/AppLoadingScreen.vue'

const { locale } = useI18n()

// Wire Nuxt UI components to current i18n locale
const uiLocale = computed(() => locales[locale.value as keyof typeof locales] ?? locales.en)

// Propagate lang + dir to <html>
useHead({
  htmlAttrs: {
    lang: computed(() => locale.value),
    dir: computed(() => uiLocale.value?.dir ?? 'ltr')
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
    { name: 'theme-color', content: '#060b10' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'application-name', content: 'EuroDraft' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/favicon.svg' },
    { rel: 'manifest', href: '/manifest.webmanifest' }
  ]
})

useSeoMeta({
  title: 'EuroDraft — Draft Your Euro Dream Team',
  description: 'Pick legendary players from Europe\'s top continental tournaments since 1960 and battle for glory in a full simulated tournament.',
  ogTitle: 'EuroDraft — Draft Your Euro Dream Team',
  ogDescription: 'Pick legendary players from 64 years of European tournament history and simulate a full continental championship.',
  ogImage: '/og-image.svg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'EuroDraft — Draft Your Euro Dream Team',
  twitterDescription: 'Pick legendary players from 64 years of European tournament history and simulate a full continental championship.',
  twitterImage: '/og-image.svg'
})

const appLoading = useAppLoading()
const isInitialLoading = ref(true)

// Silky route transitions: runs full animation cycle with ±10% subtle variance
const router = useRouter()
router.beforeEach((to, from) => {
  if (to.path !== from.path && !isInitialLoading.value) {
    appLoading.show(undefined, getRandomAnimationDuration(1250))
  }
})

onMounted(() => {
  // Graceful fadeout after full initial entrance animation completes
  setTimeout(() => {
    isInitialLoading.value = false
  }, getRandomAnimationDuration(1250))
})
</script>

<template>
  <UApp :locale="uiLocale">
    <AppLoadingScreen
      :show="isInitialLoading || appLoading.isLoading.value"
      :message="appLoading.loadingMessage.value"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
