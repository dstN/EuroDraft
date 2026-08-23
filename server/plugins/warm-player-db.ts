import { loadPlayerDb } from '../utils/playerDb'

// Reading and JSON-parsing the ~2.8MB player database costs ~250ms -- fine
// once cached, but whichever request happens to be first after a server
// (re)start pays that cost inline (measured via Lighthouse: server response
// time on /draft/formation dropped from 280ms to 30ms once the cache was
// warm). Loading it at startup instead means real traffic never sees it.
//
// (Also tried pre-warming the page routes themselves via
// nitroApp.localFetch to dodge Nitro's lazy route-module loading cost too,
// but that runs outside a real request's async context and throws --
// Nuxt I18n's server context never gets set up. Not worth chasing further:
// the data-loading cost above is the dominant, fixable one.)
export default defineNitroPlugin(() => {
  loadPlayerDb().catch((err) => {
    console.error('[warm-player-db] failed to pre-load player database', err)
  })
})
