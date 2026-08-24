// Unit test setup — minimal stubs for Nuxt auto-imports
import { vi } from 'vitest'
import { ref, computed } from 'vue'

// Stub navigateTo so tests don't need a router
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useNuxtApp', vi.fn(() => ({ $i18n: { t: (k: string) => k } })))

// Pinia stores under app/stores/** rely on Nuxt auto-importing ref/computed
// (only app/stores/audio.ts imports them explicitly) -- outside a Nuxt build,
// nothing provides those globals, so any other store errors with
// "ref is not defined" the moment defineStore()'s setup function runs.
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
