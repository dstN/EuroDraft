import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

vi.mock('../../server/utils/db', () => ({
  isDbConfigured: vi.fn(),
  getDbPool: vi.fn()
}))

const { isDbConfigured, getDbPool } = await import('../../server/utils/db') as unknown as {
  isDbConfigured: ReturnType<typeof vi.fn>
  getDbPool: ReturnType<typeof vi.fn>
}
const getHandler = (await import('../../server/api/leaderboard.get')).default
const postHandler = (await import('../../server/api/leaderboard.post')).default

const VALID_BODY = {
  teamName: 'Dream XI',
  teamEmblem: 'eu',
  formation: '4-3-3',
  outcome: 'winner',
  ovr: 88,
  lineRatings: { def: 85, mid: 87, att: 90 }
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns an empty, unconfigured response when the DB is not configured', async () => {
    isDbConfigured.mockReturnValue(false)

    const res = await callRoute(getHandler, '/api/leaderboard', '/api/leaderboard')

    expect(res.status).toBe(200)
    expect(res.json).toEqual({ success: true, configured: false, entries: [] })
  })

  it('queries and returns entries when the DB is configured', async () => {
    isDbConfigured.mockReturnValue(true)
    const query = vi.fn().mockResolvedValue([[{ id: 1, teamName: 'Dream XI' }]])
    getDbPool.mockReturnValue({ query })

    const res = await callRoute(getHandler, '/api/leaderboard', '/api/leaderboard?limit=10')

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true, configured: true, entries: [{ id: 1, teamName: 'Dream XI' }] })
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [10])
  })

  it('orders by score (outcome + OVR), not ovr alone -- a winner must always outrank a group-stage exit regardless of submission order', async () => {
    isDbConfigured.mockReturnValue(true)
    const query = vi.fn().mockResolvedValue([[]])
    getDbPool.mockReturnValue({ query })

    await callRoute(getHandler, '/api/leaderboard', '/api/leaderboard?limit=10')

    const sql = query.mock.calls[0]![0] as string
    expect(sql).toMatch(/ORDER BY\s+score DESC/i)
    expect(sql).not.toMatch(/ORDER BY\s+ovr DESC/i)
  })

  it('clamps an out-of-range limit into [1, 100]', async () => {
    isDbConfigured.mockReturnValue(true)
    const query = vi.fn().mockResolvedValue([[]])
    getDbPool.mockReturnValue({ query })

    await callRoute(getHandler, '/api/leaderboard', '/api/leaderboard?limit=99999')

    expect(query).toHaveBeenCalledWith(expect.any(String), [100])
  })
})

describe('POST /api/leaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 503 when the DB is not configured', async () => {
    isDbConfigured.mockReturnValue(false)

    const res = await callRoute(postHandler, '/api/leaderboard', '/api/leaderboard', { method: 'POST', body: VALID_BODY })

    expect(res.status).toBe(503)
  })

  it('inserts a row and returns its id when the DB is configured', async () => {
    isDbConfigured.mockReturnValue(true)
    const query = vi.fn().mockResolvedValue([{ insertId: 42 }])
    getDbPool.mockReturnValue({ query })

    const res = await callRoute(postHandler, '/api/leaderboard', '/api/leaderboard', { method: 'POST', body: VALID_BODY })

    expect(res.status).toBe(200)
    expect(res.json).toEqual({ success: true, id: 42 })
  })

  it('rejects an invalid outcome even with the DB configured', async () => {
    isDbConfigured.mockReturnValue(true)
    getDbPool.mockReturnValue({ query: vi.fn() })

    const res = await callRoute(postHandler, '/api/leaderboard', '/api/leaderboard', {
      method: 'POST',
      body: { ...VALID_BODY, outcome: 'not-real' }
    })

    expect(res.status).toBe(400)
  })

  it('rejects out-of-range ratings', async () => {
    isDbConfigured.mockReturnValue(true)
    getDbPool.mockReturnValue({ query: vi.fn() })

    const res = await callRoute(postHandler, '/api/leaderboard', '/api/leaderboard', {
      method: 'POST',
      body: { ...VALID_BODY, ovr: 250 }
    })

    expect(res.status).toBe(400)
  })
})
