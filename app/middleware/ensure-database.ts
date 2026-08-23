// The player database (~2.8MB) used to load eagerly at the app root on every
// page -- including ones that never touch it, like the homepage and legal
// pages -- via app.vue's `await db.load()`. Under Lighthouse's throttled
// network simulation that alone accounted for ~17s of FCP/LCP, since
// useAsyncData embeds its fetched payload directly into the SSR HTML.
//
// Only the draft and tournament stores actually call useDatabase(), so only
// their routes need this middleware (added via definePageMeta({ middleware })
// on draft/formation.vue, draft/index.vue, and tournament/index.vue).
export default defineNuxtRouteMiddleware(async () => {
  const db = useDatabase()
  if (!db.isLoaded) {
    await db.load()
  }
})
