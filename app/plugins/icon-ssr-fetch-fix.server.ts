import { _api } from '@iconify/vue'

// @nuxt/icon's own plugin wires Iconify's icon-loading fetch to
// `$fetch.native` (a raw fetch() with no baseURL/local-dispatch support --
// see ofetch's `$fetch.native = (...args) => fetch(...args)`). That works
// client-side, where a relative URL resolves against `window.location`, but
// server-side, Node's global fetch() has no page context to resolve a
// relative URL against, so every SSR call to Iconify's registered "server"
// provider (`/api/_nuxt_icon/...`) throws immediately. The result: every
// icon renders as an empty placeholder in the SSR HTML (visible pop-in once
// the client re-fetches it) plus a "[Icon] failed to load" warning per icon,
// per render. Confirmed still present in the latest available @nuxt/icon
// (2.5.1) -- this is an upstream bug, not a config mistake on our side.
//
// Fix: re-point Iconify's fetch at this request's own local-fetch instance
// (`useRequestFetch()`, NOT `.native`), which *does* dispatch relative URLs
// straight into this same server's route handlers -- Nitro's h3 app binds
// it per-request as a plain callable (`event.$fetch`), not a full ofetch
// instance, so it returns the parsed body directly (or throws a FetchError
// with `.response.status` on a non-2xx), rather than exposing `.raw()`/
// `.native`. Iconify's loader expects a Fetch-API-shaped `{status, json()}`
// back, so wrap the parsed result (or the thrown status) into that shape.
export default defineNuxtPlugin({
  name: 'icon-ssr-fetch-fix',
  setup() {
    const requestFetch = useRequestFetch()
    _api.setFetch(async (input: RequestInfo | URL) => {
      try {
        const data = await requestFetch(input.toString())
        return { status: 200, json: async () => data } as Response
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status ?? 500
        return { status, json: async () => null } as Response
      }
    })
  }
})
