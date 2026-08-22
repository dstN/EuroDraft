// Unit test setup — minimal stubs for Nuxt auto-imports
import { vi } from 'vitest'

// Stub navigateTo so tests don't need a router
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useNuxtApp', vi.fn(() => ({ $i18n: { t: (k: string) => k } })))
