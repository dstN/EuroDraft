import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

vi.mock('../../server/utils/db', () => ({
  isDbConfigured: vi.fn().mockReturnValue(false),
  getDbPool: vi.fn().mockReturnValue(null)
}))

const shareHandler = (await import('../../server/api/share.post')).default
const exportHandler = (await import('../../server/api/gdpr/export.post')).default
const deleteHandler = (await import('../../server/api/gdpr/delete.post')).default

let ipCounter = 0
async function createShare() {
  ipCounter++
  const res = await callRoute(shareHandler, '/api/share', '/api/share', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${ipCounter}` },
    body: {
      teamName: 'Dream XI',
      formation: '4-3-3',
      outcome: 'winner',
      teamOVR: 88,
      lineRatings: { def: 85, mid: 87, att: 90, overall: 88 }
    }
  })
  return res.json as { id: string, deleteToken: string }
}

describe('POST /api/gdpr/export', () => {
  it('returns the matching server record when id + token are proven', async () => {
    const { id, deleteToken } = await createShare()

    const res = await callRoute(exportHandler, '/api/gdpr/export', '/api/gdpr/export', {
      method: 'POST',
      body: { shares: [{ id, token: deleteToken }] }
    })

    expect(res.status).toBe(200)
    const json = res.json as { serverStoredRecords: { id: string }[] }
    expect(json.serverStoredRecords).toHaveLength(1)
    expect(json.serverStoredRecords[0]!.id).toBe(id)
  })

  it('silently excludes entries with a wrong token rather than erroring', async () => {
    const { id } = await createShare()

    const res = await callRoute(exportHandler, '/api/gdpr/export', '/api/gdpr/export', {
      method: 'POST',
      body: { shares: [{ id, token: 'wrong-token' }] }
    })

    expect(res.status).toBe(200)
    const json = res.json as { serverStoredRecords: unknown[] }
    expect(json.serverStoredRecords).toHaveLength(0)
  })

  it('returns an empty result for an empty/missing shares array', async () => {
    const res = await callRoute(exportHandler, '/api/gdpr/export', '/api/gdpr/export', {
      method: 'POST',
      body: {}
    })

    expect(res.status).toBe(200)
    const json = res.json as { serverStoredRecords: unknown[] }
    expect(json.serverStoredRecords).toHaveLength(0)
  })
})

describe('POST /api/gdpr/delete', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the matching server record when id + token are proven', async () => {
    const { id, deleteToken } = await createShare()

    const res = await callRoute(deleteHandler, '/api/gdpr/delete', '/api/gdpr/delete', {
      method: 'POST',
      body: { shares: [{ id, token: deleteToken }] }
    })

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true, deletedCount: 1, deletedIds: [id] })
  })

  it('does not delete anything when the token is wrong', async () => {
    const { id } = await createShare()

    const res = await callRoute(deleteHandler, '/api/gdpr/delete', '/api/gdpr/delete', {
      method: 'POST',
      body: { shares: [{ id, token: 'wrong-token' }] }
    })

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true, deletedCount: 0 })

    const exportRes = await callRoute(exportHandler, '/api/gdpr/export', '/api/gdpr/export', {
      method: 'POST',
      body: { shares: [{ id, token: 'wrong-token' }] }
    })
    expect((exportRes.json as { serverStoredRecords: unknown[] }).serverStoredRecords).toHaveLength(0)
  })

  it('returns deletedCount 0 for an empty shares array without touching storage', async () => {
    const res = await callRoute(deleteHandler, '/api/gdpr/delete', '/api/gdpr/delete', {
      method: 'POST',
      body: {}
    })

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true, deletedCount: 0 })
  })
})
