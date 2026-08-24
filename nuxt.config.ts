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
    '/legal/**': { prerender: true },
    // Baseline security headers. CSP was built by inspecting the app's
    // actual output rather than a generic template: no third-party
    // scripts/styles/fonts/images anywhere (fonts, icons and flags are all
    // self-hosted -- see the GDPR export's own privacyArchitecture text),
    // and every runtime data fetch (/api/**, /eurodraft_db.json, /og/**)
    // is same-origin.
    //
    // script-src and style-src both need 'unsafe-inline': Nuxt/Nitro (this
    // version) has no built-in nonce or hash support for its own
    // SSR-emitted inline scripts -- verified against the actual rendered
    // output, not assumed. Three first-party inline <script> tags are
    // unavoidable without either a nonce-capable rendering hook this
    // Nitro version doesn't expose, or a new runtime dependency
    // (`nuxt-security` or similar): the import map, @nuxtjs/color-mode's
    // dark/light FOUC-prevention bootstrap, and Nuxt's own
    // `window.__NUXT__` runtime-config assignment. style-src's inline
    // `style` attributes come from Vue's `:style` bindings and a few SVG
    // elements. This is a real trade-off, not a false claim of strict
    // CSP: script injection reaching an inline <script> tag would still
    // execute. Every other directive stays strict, and everything the
    // audit actually flagged is still covered -- #25's OG-image injection
    // was into a *different*, unescaped-string-built SVG response (now
    // fixed at the source and served under its own separate, fully
    // locked-down policy below), not this app-wide policy, and the
    // in-app Vue templates have no v-html anywhere (verified) so nothing
    // here currently has a path to inject a script tag in the first
    // place. Verified zero *other* CSP violations against a production
    // build with Playwright across home, /legal, the formation picker,
    // and navigating into the draft room.
    '/**': {
      headers: {
        'Content-Security-Policy': [
          'default-src \'self\'',
          'script-src \'self\' \'unsafe-inline\'',
          'style-src \'self\' \'unsafe-inline\'',
          'img-src \'self\' data:',
          'font-src \'self\'',
          'connect-src \'self\'',
          'object-src \'none\'',
          'base-uri \'self\'',
          'form-action \'self\'',
          'frame-ancestors \'none\''
        ].join('; '),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Verify the Plesk vhost isn't already adding this (see
        // DEPLOYMENT.md) before relying on it -- two HSTS headers from
        // different layers is unspecified behavior, not just redundant.
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains'
      }
    },
    // /og/** serves attacker-reachable SVG (see server/utils/ogImage.ts,
    // which had a stored-XSS finding here) -- a tighter, standalone policy
    // rather than inheriting the app-wide one above.
    '/og/**': {
      headers: {
        'Content-Security-Policy': 'default-src \'none\'',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'node-server',
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
