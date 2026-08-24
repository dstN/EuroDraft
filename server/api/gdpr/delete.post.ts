import { getDbPool, isDbConfigured } from '../../utils/db'
import { deleteSharedRun, verifyDeleteToken } from '../../utils/shareStorage'

interface ShareRef {
  id: string
  token: string
}

function parseShareRefs(body: unknown): ShareRef[] {
  const raw = body && typeof body === 'object' && Array.isArray((body as { shares?: unknown }).shares)
    ? (body as { shares: unknown[] }).shares
    : []

  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map(s => ({
      id: String(s.id ?? '').trim().replace(/^https?:\/\/ed\.rntm\.de\/r\//, ''),
      token: String(s.token ?? '')
    }))
    .filter(s => s.id && s.token)
}

// Same ownership requirement as gdpr/export.post.ts -- a deletion token
// proven per entry, share ID alone is not sufficient.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const shareRefs = parseShareRefs(body).filter(ref => verifyDeleteToken(ref.id, ref.token))

  if (shareRefs.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      message: 'No server records requested for deletion.'
    }
  }

  let deletedCount = 0
  const deletedIds: string[] = []
  let deletedLeaderboardCount = 0

  const db = isDbConfigured() ? getDbPool() : null

  for (const { id } of shareRefs) {
    if (deleteSharedRun(id)) {
      deletedCount++
      deletedIds.push(id)
    }
    if (db) {
      const [result] = await db.query('DELETE FROM leaderboard WHERE share_id = ?', [id])
      deletedLeaderboardCount += (result as { affectedRows: number }).affectedRows
    }
  }

  return {
    success: true,
    deletedCount,
    deletedIds,
    deletedLeaderboardCount,
    legalBasis: 'Art. 17 DSGVO / GDPR (Right to Erasure / Right to be Forgotten)',
    message: deletedCount > 0 || deletedLeaderboardCount > 0
      ? `Successfully and permanently deleted ${deletedCount} share record(s) and ${deletedLeaderboardCount} leaderboard entry(ies) from server storage.`
      : 'Specified share ID(s) were not found on the server or were already deleted.'
  }
})
