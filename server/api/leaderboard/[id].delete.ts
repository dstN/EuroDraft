import type { ResultSetHeader } from 'mysql2'
import { getDbPool, isDbConfigured } from '../../utils/db'

export default defineEventHandler(async (event) => {
  if (!isDbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Leaderboard is not configured on this server.' })
  }
  const db = getDbPool()
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Leaderboard is not configured on this server.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid leaderboard entry ID.' })
  }

  const [result] = await db.query<ResultSetHeader>('DELETE FROM leaderboard WHERE id = ?', [id])

  if (result.affectedRows === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Leaderboard entry not found or already deleted.' })
  }

  return { success: true, message: `Leaderboard entry ${id} was permanently deleted.` }
})
