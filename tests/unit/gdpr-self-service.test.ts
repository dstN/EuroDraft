import { describe, expect, it } from 'vitest'
import { deleteSharedRun, getSharedRun, isShareStoragePersistent, saveSharedRun, verifyDeleteToken } from '../../server/utils/shareStorage'

function makeRun(overrides: Partial<Parameters<typeof saveSharedRun>[0]> = {}) {
  return saveSharedRun({
    teamName: 'Test XI',
    teamEmblem: 'de',
    formation: '4-3-3',
    teamOVR: 86,
    outcome: 'Winner',
    lineRatings: { def: 85, mid: 86, att: 87, overall: 86 },
    runStats: null,
    squad: [],
    matches: [],
    ...overrides
  })
}

describe('GDPR Self-Service Server Storage', () => {
  it('falls back to the in-memory store when DATABASE_URL is unset (as in this test env)', () => {
    expect(isShareStoragePersistent()).toBe(false)
  })

  it('saves and allows instant retrieval and deletion of a shared tournament run', async () => {
    const { record, deleteToken } = await makeRun()

    expect(record.id).toBeDefined()
    expect(record.teamName).toBe('Test XI')
    expect(deleteToken).toBeDefined()

    // Retrieve
    const found = await getSharedRun(record.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(record.id)

    // Delete (Art. 17 GDPR Self-Service)
    const deleted = await deleteSharedRun(record.id)
    expect(deleted).toBe(true)

    // Verify it is gone
    const gone = await getSharedRun(record.id)
    expect(gone).toBeUndefined()
  })

  it('returns false when attempting to delete non-existent ID', async () => {
    const result = await deleteSharedRun('non_existent_id_999')
    expect(result).toBe(false)
  })

  it('generates unpredictable, non-sequential IDs', async () => {
    const runs = await Promise.all(Array.from({ length: 20 }, () => makeRun()))
    const ids = new Set(runs.map(r => r.record.id))
    expect(ids.size).toBe(20)
    for (const id of ids) {
      expect(id).not.toMatch(/^\d+$/)
      expect(id.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('rejects deletion/export without the token issued at creation', async () => {
    const { record, deleteToken } = await makeRun()

    expect(await verifyDeleteToken(record.id, 'wrong-token')).toBe(false)
    expect(await verifyDeleteToken(record.id, '')).toBe(false)
    expect(await verifyDeleteToken('some-other-id', deleteToken)).toBe(false)
    expect(await verifyDeleteToken(record.id, deleteToken)).toBe(true)
  })

  it('invalidates the token once the record is deleted', async () => {
    const { record, deleteToken } = await makeRun()
    expect(await deleteSharedRun(record.id)).toBe(true)
    expect(await verifyDeleteToken(record.id, deleteToken)).toBe(false)
  })
})
