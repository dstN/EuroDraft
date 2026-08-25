// Unit test setup — minimal stubs for Nuxt auto-imports
import { vi } from 'vitest'
import { ref, computed } from 'vue'
import { getCountryName } from '~/utils/country'

// Stub navigateTo so tests don't need a router
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useNuxtApp', vi.fn(() => ({ $i18n: { t: (k: string) => k } })))
vi.stubGlobal('useI18n', vi.fn(() => ({ t: (k: string) => k, te: () => false })))

// useCountryName (app/composables/useCountryName.ts) normally resolves through
// vue-i18n; outside a Nuxt build this stub falls back straight to the country
// utility, which is the same fallback the real composable uses for unknown codes.
vi.stubGlobal('useCountryName', vi.fn(() => (code: string) => getCountryName(code)))

// Pinia stores under app/stores/** rely on Nuxt auto-importing ref/computed
// -- outside a Nuxt build, nothing provides those globals, so a store
// errors with "ref is not defined" the moment defineStore()'s setup
// function runs.
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)

// useCookie (app/stores/audio.ts) is Nuxt's SSR-aware cookie composable --
// outside a Nuxt build there's no request/response to sync against, so this
// stub only reproduces the part unit tests actually exercise: a reactive
// ref seeded from `options.default()`.
vi.stubGlobal('useCookie', <T>(_name: string, options?: { default?: () => T }) => ref(options?.default?.()))
