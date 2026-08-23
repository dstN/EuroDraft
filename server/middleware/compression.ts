import compression from 'compression'
import { fromNodeMiddleware } from 'h3'

// Compresses SSR-rendered pages and API/JSON responses. Static assets
// (_nuxt/*) are unaffected by this -- Nitro's internal public-asset handler
// answers those requests before user middleware runs, and already serves
// pre-compressed .br/.gz siblings on its own (see the `build` npm script
// and nuxt.config.ts's `compressPublicAssets` comment for why that needs a
// two-pass build to work on the node-server preset).
//
// Error responses (4xx/5xx) are explicitly excluded. Root cause (found via
// a `statusCode`-logging filter): Nitro doesn't render an error page
// directly -- on a 404/thrown error it internally re-fetches
// `/__nuxt_error?...` (status 200) to get the rendered HTML, then reuses
// those bytes as the outer response's body under the *outer* request's own
// status code. That inner request has statusCode 200, so it passed
// straight through this middleware and got compressed -- but the outer
// response doesn't forward that Content-Encoding through consistently,
// so the client received `Content-Encoding: br` with zero actual bytes:
// every error page (any 404, any thrown error) rendered as a blank page
// for every real visitor, since virtually all browsers request
// compression. Confirmed via curl: identical request with vs without
// Accept-Encoding was the only difference between the real page and
// nothing at all. Error pages are small anyway, so skipping compression
// for them (and their internal render fetch) costs nothing.
export default fromNodeMiddleware(compression({
  filter: (req, res) => {
    if (res.statusCode >= 400) return false
    if (req.url?.startsWith('/__nuxt_error')) return false
    return compression.filter(req, res)
  }
}))
