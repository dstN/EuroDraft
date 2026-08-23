import type { ResultSetHeader } from 'mysql2'
import { getDbPool, isDbConfigured } from '../utils/db'

const VALID_OUTCOMES = new Set(['winner', 'runner_up', 'semi_final', 'quarter_final', 'group_stage'])

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

export default defineEventHandler(async (event) => {
  if (!isDbConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Leaderboard is not configured on this server.' })
  }
  const db = getDbPool()
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Leaderboard is not configured on this server.' })
  }

  const body = await readBody(event).catch(() => ({}))

  const teamName = String(body?.teamName ?? '').trim().slice(0, 24)
  const teamEmblem = String(body?.teamEmblem ?? 'eu').trim().slice(0, 16) || 'eu'
  const formation = String(body?.formation ?? '').trim().slice(0, 24)
  const outcome = String(body?.outcome ?? '').trim()
  const shareId = body?.shareId ? String(body.shareId).trim().slice(0, 20) : null

  const ovr = clampInt(body?.ovr, 0, 99)
  const defRating = clampInt(body?.lineRatings?.def, 0, 99)
  const midRating = clampInt(body?.lineRatings?.mid, 0, 99)
  const attRating = clampInt(body?.lineRatings?.att, 0, 99)

  if (!teamName || !formation || !VALID_OUTCOMES.has(outcome)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission: team name, formation, and outcome are required.' })
  }
  if (ovr === null || defRating === null || midRating === null || attRating === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission: ratings must be numbers between 0 and 99.' })
  }

  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO leaderboard
       (team_name, team_emblem, formation, ovr, def_rating, mid_rating, att_rating, outcome, share_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [teamName, teamEmblem, formation, ovr, defRating, midRating, attRating, outcome, shareId]
  )

  return { success: true, id: result.insertId }
})
