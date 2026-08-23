import { describe, expect, it } from 'vitest'
import { deleteSharedRun, getSharedRun, saveSharedRun } from '../../server/utils/shareStorage'

describe('GDPR Self-Service Server Storage', () => {
  it('saves and allows instant retrieval and deletion of a shared tournament run', () => {
    const record = saveSharedRun({
      teamName: 'Test XI',
      teamEmblem: 'de',
      formation: '4-3-3',
      teamOVR: 86,
      outcome: 'Winner',
      lineRatings: { def: 85, mid: 86, att: 87, overall: 86 },
      runStats: null,
      squad: [],
      matches: []
    })

    expect(record.id).toBeDefined()
    expect(record.teamName).toBe('Test XI')

    // Retrieve
    const found = getSharedRun(record.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(record.id)

    // Delete (Art. 17 GDPR Self-Service)
    const deleted = deleteSharedRun(record.id)
    expect(deleted).toBe(true)

    // Verify it is gone
    const gone = getSharedRun(record.id)
    expect(gone).toBeUndefined()
  })

  it('returns false when attempting to delete non-existent ID', () => {
    const result = deleteSharedRun('non_existent_id_999')
    expect(result).toBe(false)
  })
})
