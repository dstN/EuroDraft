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
    preset: 'node-server',
    // mysql2 is pure JS (no native bindings) but Nitro's default externals
    // heuristic still leaves it out of the bundle -- inline it so the deploy
    // artifact needs no node_modules on the server. See DEPLOYMENT.md.
    externals: {
      inline: ['mysql2']
    },
    // On the node-server preset, the static-asset manifest embedded in the
    // server bundle is frozen while `.output/public` is still empty --
    // compression that runs later in the same build (including this option)
    // produces real .br/.gz files, but the manifest never learns about them,
    // so they're never actually served (verified: no Content-Encoding header
    // even with this enabled). The `build` npm script works around it by
    // building twice: the second build's manifest scan sees the .br/.gz
    // files the first build's `compressPublicAssets` pass already left on
    // disk, since they're already present in `.output/public` before that
    // second build's rollup step ever starts.
    compressPublicAssets: { gzip: true, brotli: true }
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
