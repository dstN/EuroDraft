import { createApp, createRouter, toWebHandler, type EventHandler, type HTTPMethod } from 'h3'

interface CallOptions {
  method?: HTTPMethod
  headers?: Record<string, string>
  body?: string | Record<string, unknown>
}

/**
 * Dispatches a real h3 Request/Response round-trip through a single handler,
 * mounted at `routePath` (may contain `:param` segments matching h3's
 * router syntax -- Nitro's `[id].ts` files are tested with `/prefix/:id`).
 * Exercises the actual h3 request-parsing internals (readBody, getQuery,
 * getRouterParam, ...) rather than a hand-rolled fake event.
 */
export async function callRoute(
  handler: EventHandler,
  routePath: string,
  requestPath: string,
  opts: CallOptions = {}
) {
  const app = createApp()
  const router = createRouter()
  const method = opts.method ?? 'GET'
  // h3's router stores handlers under whatever case is passed here, but
  // looks them up via `event.method.toLowerCase()` -- registering with the
  // uppercase HTTPMethod type (as Nitro's route file suffixes imply) 404s.
  router.add(routePath, handler, method.toLowerCase())
  app.use(router)

  const webHandler = toWebHandler(app)
  const body = opts.body === undefined
    ? undefined
    : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)

  const request = new Request(`http://localhost${requestPath}`, {
    method,
    headers: {
      ...(body && typeof opts.body !== 'string' ? { 'content-type': 'application/json' } : {}),
      ...opts.headers
    },
    body
  })

  const response = await webHandler(request)
  const text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = undefined
  }

  return { status: response.status, headers: response.headers, text, json }
}
