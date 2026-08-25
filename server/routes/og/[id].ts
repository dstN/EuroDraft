import { getSharedRun, getOgImage } from '../../utils/shareStorage'
import { renderShareOgImage } from '../../utils/ogImage'

export default defineEventHandler(async (event) => {
  const shareId = getRouterParam(event, 'id') ?? ''

  // Prefer the real rendered result-card PNG (uploaded right after share
  // creation -- see POST /api/share/:id/og-image) over the hand-drawn SVG
  // fallback, which social-embed crawlers like Discord's don't render.
  const image = await getOgImage(shareId)
  if (image) {
    setHeader(event, 'content-type', 'image/png')
    setHeader(event, 'cache-control', 'public, max-age=86400')
    return image
  }

  const record = await getSharedRun(shareId)

  setHeader(event, 'content-type', 'image/svg+xml')
  setHeader(event, 'cache-control', record ? 'public, max-age=86400' : 'public, max-age=60')

  return renderShareOgImage(record)
})
