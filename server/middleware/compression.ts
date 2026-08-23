import compression from 'compression'
import { fromNodeMiddleware } from 'h3'

// Compresses SSR-rendered pages and API/JSON responses. Static assets
// (_nuxt/*) are unaffected by this -- Nitro's internal public-asset handler
// answers those requests before user middleware runs, and already serves
// pre-compressed .br/.gz siblings on its own (see the `build` npm script
// and nuxt.config.ts's `compressPublicAssets` comment for why that needs a
// two-pass build to work on the node-server preset).
export default fromNodeMiddleware(compression())
