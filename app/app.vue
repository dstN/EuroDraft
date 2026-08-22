<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

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
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#080c14' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title: 'EuroDraft — Draft Your Euro Dream Team',
  description: 'Pick legendary players from every UEFA European Championship since 1960 and battle for glory in a full simulated tournament.',
  ogTitle: 'EuroDraft',
  ogDescription: 'Draft historical Euro players and simulate a full European Championship.',
  twitterCard: 'summary_large_image'
})

// Load the database once at app root
const db = useDatabase()
await db.load()
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
