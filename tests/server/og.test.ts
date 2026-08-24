import { describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

vi.mock('../../server/utils/db', () => ({
  isDbConfigured: vi.fn().mockReturnValue(false),
  getDbPool: vi.fn().mockReturnValue(null)
}))

const shareHandler = (await import('../../server/api/share.post')).default
const ogHandler = (await import('../../server/routes/og/[id]')).default

describe('GET /og/:id', () => {
  it('renders the OG image for an existing share, cached for a day', async () => {
    const created = await callRoute(shareHandler, '/api/share', '/api/share', {
      method: 'POST',
      headers: { 'x-forwarded-for': '198.51.100.50' },
      body: {
        teamName: 'Dream XI',
        formation: '4-3-3',
        outcome: 'winner',
        teamOVR: 88,
        lineRatings: { def: 85, mid: 87, att: 90, overall: 88 }
      }
    })
    const { id } = created.json as { id: string }

    const res = await callRoute(ogHandler, '/og/:id', `/og/${id}`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('cache-control')).toBe('public, max-age=86400')
    expect(res.text).toContain('Dream XI')
  })

  it('renders the fallback card (short cache) for an unknown id, rather than erroring', async () => {
    const res = await callRoute(ogHandler, '/og/:id', '/og/does-not-exist')

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(res.headers.get('cache-control')).toBe('public, max-age=60')
    expect(res.text).toContain('<svg')
  })
})
