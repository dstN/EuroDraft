import { getSharedRun } from '../../utils/shareStorage'
import { renderShareOgImage } from '../../utils/ogImage'

export default defineEventHandler(async (event) => {
  const shareId = getRouterParam(event, 'id') ?? ''
  const record = await getSharedRun(shareId)

  setHeader(event, 'content-type', 'image/svg+xml')
  setHeader(event, 'cache-control', record ? 'public, max-age=86400' : 'public, max-age=60')

  return renderShareOgImage(record)
})
