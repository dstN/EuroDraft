import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

vi.mock('../../server/utils/db', () => ({
  isDbConfigured: vi.fn(),
  getDbPool: vi.fn()
}))

const { isDbConfigured, getDbPool } = await import('../../server/utils/db') as unknown as {
  isDbConfigured: ReturnType<typeof vi.fn>
  getDbPool: ReturnType<typeof vi.fn>
}
const handler = (await import('../../server/api/health.get')).default

describe('GET /api/health', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    ;($fetch as unknown as { raw: ReturnType<typeof vi.fn> }).raw = vi.fn().mockResolvedValue({ status: 200 })
    delete process.env.NODE_ENV
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PASS
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('is healthy (200) when the DB is unconfigured and the player DB asset is reachable', async () => {
    isDbConfigured.mockReturnValue(false)

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ status: 'ok', database: 'not_configured', playerDatabase: 'ok' })
  })

  it('is healthy (200) and reports "connected" when the DB is configured and reachable', async () => {
    isDbConfigured.mockReturnValue(true)
    getDbPool.mockReturnValue({ query: vi.fn().mockResolvedValue([[]]) })

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ status: 'ok', database: 'connected' })
  })

  it('is unhealthy (503) when the DB is configured but unreachable', async () => {
    isDbConfigured.mockReturnValue(true)
    getDbPool.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) })

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(503)
    expect(res.json).toMatchObject({ status: 'unhealthy', database: 'disconnected' })
    expect((res.json as { problems: string[] }).problems).toContain('DATABASE_URL')
  })

  it('is unhealthy (503) when the player database static asset is unreachable', async () => {
    isDbConfigured.mockReturnValue(false)
    ;($fetch as unknown as { raw: ReturnType<typeof vi.fn> }).raw = vi.fn().mockRejectedValue(new Error('404'))

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(503)
    expect(res.json).toMatchObject({ playerDatabase: 'unreachable' })
  })

  it('flags SMTP as a problem only when unconfigured in production', async () => {
    isDbConfigured.mockReturnValue(false)
    process.env.NODE_ENV = 'production'

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(503)
    expect(res.json).toMatchObject({ contactForm: 'not_configured' })
    expect((res.json as { problems: string[] }).problems).toContain('SMTP_HOST/SMTP_PASS')
  })

  it('does not flag SMTP outside production', async () => {
    isDbConfigured.mockReturnValue(false)

    const res = await callRoute(handler, '/api/health', '/api/health')

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ contactForm: 'not_configured' })
  })
})
