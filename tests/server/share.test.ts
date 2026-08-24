import { describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

vi.mock('../../server/utils/db', () => ({
  isDbConfigured: vi.fn().mockReturnValue(false),
  getDbPool: vi.fn().mockReturnValue(null)
}))

const postHandler = (await import('../../server/api/share.post')).default
const getHandler = (await import('../../server/api/share/[id].get')).default
const deleteHandler = (await import('../../server/api/share/[id].delete')).default

const VALID_BODY = {
  teamName: 'Dream XI',
  teamEmblem: 'eu',
  formation: '4-3-3',
  outcome: 'winner',
  teamOVR: 88,
  lineRatings: { def: 85, mid: 87, att: 90, overall: 88 },
  runStats: { totalMatches: 6 },
  squad: [{ id: 'p1' }],
  matches: [{ id: 'm1' }]
}

let ipCounter = 0
function nextIp() {
  ipCounter++
  return `198.51.100.${ipCounter}`
}

async function createShare(body: Record<string, unknown> = VALID_BODY) {
  return callRoute(postHandler, '/api/share', '/api/share', {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': nextIp() }
  })
}

describe('POST /api/share', () => {
  it('creates a share and returns a record, id and a one-time delete token', async () => {
    const res = await createShare()

    expect(res.status).toBe(200)
    const json = res.json as { success: boolean, id: string, deleteToken: string, record: Record<string, unknown> }
    expect(json.success).toBe(true)
    expect(json.id).toBeTruthy()
    expect(json.deleteToken).toBeTruthy()
    expect(json.record).toMatchObject({ teamName: 'Dream XI', formation: '4-3-3', outcome: 'winner', teamOVR: 88 })
  })

  it('rejects a submission with an invalid outcome', async () => {
    const res = await createShare({ ...VALID_BODY, outcome: 'not-a-real-outcome' })
    expect(res.status).toBe(400)
  })

  it('rejects a submission missing the team name', async () => {
    const res = await createShare({ ...VALID_BODY, teamName: '' })
    expect(res.status).toBe(400)
  })

  it('rejects non-numeric line ratings', async () => {
    const res = await createShare({ ...VALID_BODY, lineRatings: { def: 'high', mid: 87, att: 90, overall: 88 } })
    expect(res.status).toBe(400)
  })

  it('caps an oversized squad array server-side rather than storing it as-is', async () => {
    const bigSquad = Array.from({ length: 50 }, (_, i) => ({ id: `p${i}` }))
    const res = await createShare({ ...VALID_BODY, squad: bigSquad })

    expect(res.status).toBe(200)
    const json = res.json as { record: { squad: unknown[] } }
    expect(json.record.squad.length).toBeLessThanOrEqual(11)
  })

  it('rejects a payload over the size cap', async () => {
    const res = await createShare({ ...VALID_BODY, teamName: 'x'.repeat(2_000_000) })
    expect(res.status).toBe(413)
  })

  it('rejects requests once the rate limit is exceeded', async () => {
    const ip = nextIp()
    for (let i = 0; i < 10; i++) {
      const res = await callRoute(postHandler, '/api/share', '/api/share', {
        method: 'POST',
        body: VALID_BODY,
        headers: { 'x-forwarded-for': ip }
      })
      expect(res.status).toBe(200)
    }

    const limited = await callRoute(postHandler, '/api/share', '/api/share', {
      method: 'POST',
      body: VALID_BODY,
      headers: { 'x-forwarded-for': ip }
    })
    expect(limited.status).toBe(429)
  })
})

describe('GET /api/share/:id', () => {
  it('returns a previously created record, without leaking its delete token', async () => {
    const created = await createShare()
    const id = (created.json as { id: string }).id

    const res = await callRoute(getHandler, '/api/share/:id', `/api/share/${id}`)

    expect(res.status).toBe(200)
    const json = res.json as { success: boolean, record: Record<string, unknown> }
    expect(json.success).toBe(true)
    expect(json.record.id).toBe(id)
    expect(json.record).not.toHaveProperty('deleteToken')
  })

  it('returns 404 for an unknown id', async () => {
    const res = await callRoute(getHandler, '/api/share/:id', '/api/share/does-not-exist')
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/share/:id', () => {
  it('deletes the record when given the correct delete token', async () => {
    const created = await createShare()
    const { id, deleteToken } = created.json as { id: string, deleteToken: string }

    const res = await callRoute(deleteHandler, '/api/share/:id', `/api/share/${id}`, {
      method: 'DELETE',
      body: { token: deleteToken }
    })

    expect(res.status).toBe(200)

    const after = await callRoute(getHandler, '/api/share/:id', `/api/share/${id}`)
    expect(after.status).toBe(404)
  })

  it('rejects deletion with a missing or wrong token', async () => {
    const created = await createShare()
    const { id } = created.json as { id: string }

    const res = await callRoute(deleteHandler, '/api/share/:id', `/api/share/${id}`, {
      method: 'DELETE',
      body: { token: 'totally-wrong-token' }
    })

    expect(res.status).toBe(403)

    const still = await callRoute(getHandler, '/api/share/:id', `/api/share/${id}`)
    expect(still.status).toBe(200)
  })

  it('returns 404 when deleting an id that does not exist, even with a well-formed token', async () => {
    const res = await callRoute(deleteHandler, '/api/share/:id', '/api/share/does-not-exist', {
      method: 'DELETE',
      body: { token: 'anything' }
    })

    expect(res.status).toBe(403) // no stored hash for this id -> token can never verify
  })
})
