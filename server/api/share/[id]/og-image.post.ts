import { verifyDeleteToken, saveOgImage } from '../../../utils/shareStorage'
import { checkRateLimit } from '../../../utils/rateLimit'

// Accepts the raw PNG bytes of the client-rendered result card (the same
// canvas used by the "Squad Card (PNG)" download tab in
// TournamentShareModal.vue) and stores it as the /r/:id page's OpenGraph
// image, replacing the old server-rendered SVG that Discord and most
// social-embed crawlers don't render at all.
//
// Ownership is proven the same way DELETE /api/share/:id already does --
// via the one-time deleteToken returned from POST /api/share -- so a
// stranger who only knows the (public) share ID can't overwrite someone
// else's result image.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MAX_IMAGE_BYTES = 3_000_000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  if (!checkRateLimit(`share-og-image:${ip}`, { windowMs: 10 * 60 * 1000, max: 20 })) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please wait a few minutes before trying again.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing share ID.' })
  }

  const token = getHeader(event, 'x-share-token') ?? ''
  if (!await verifyDeleteToken(id, token)) {
    throw createError({ statusCode: 403, statusMessage: 'Missing or invalid share token for this share ID.' })
  }

  const body = await readRawBody(event, false)
  if (!body || body.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image body.' })
  }
  if (body.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Image too large.' })
  }
  if (!body.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw createError({ statusCode: 400, statusMessage: 'Body is not a valid PNG image.' })
  }

  const saved = await saveOgImage(id, body)
  if (!saved) {
    throw createError({ statusCode: 404, statusMessage: 'Shared run record not found, or OG image storage is unavailable in this environment.' })
  }

  return { success: true }
})
