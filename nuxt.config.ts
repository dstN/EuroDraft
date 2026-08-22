// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'error', 'warning', 'success', 'info', 'neutral']
    }
  },

  routeRules: {
    '/legal/**': { prerender: true }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'node-server'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    families: [
      { name: 'Geist', provider: 'local' },
      { name: 'Geist Mono', provider: 'local' }
    ]
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'pl', name: 'Polski', file: 'pl.json' },
      { code: 'tr', name: 'Türkçe', file: 'tr.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' }
    ],
    defaultLocale: 'en',
    langDir: 'locales/'
  },

  // @nuxt/icon, @nuxt/fonts, @nuxtjs/color-mode are auto-registered by @nuxt/ui
  icon: {
    serverBundle: {
      collections: ['lucide', 'circle-flags', 'simple-icons']
    }
  }
})
