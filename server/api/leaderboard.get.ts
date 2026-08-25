import { getDbPool, isDbConfigured } from '../utils/db'

interface LeaderboardRow {
  id: number
  teamName: string
  teamEmblem: string
  formation: string
  ovr: number
  defRating: number
  midRating: number
  attRating: number
  outcome: string
  score: number
  shareId: string | null
  submittedAt: string
}

export default defineEventHandler(async (event) => {
  if (!isDbConfigured()) {
    return { success: true, configured: false, entries: [] }
  }

  const db = getDbPool()
  if (!db) {
    return { success: true, configured: false, entries: [] }
  }

  const query = getQuery(event)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  // score (see migrations/004) ranks by tournament outcome first -- a
  // winner always outranks a non-winner regardless of OVR -- and only
  // within the same outcome tier does a lower OVR rank higher, rewarding
  // going far with a weaker squad. Plain "ORDER BY ovr" used to let a
  // group-stage exit outrank an outright win on equal OVR.
  const [rows] = await db.query(
    `SELECT
       id,
       team_name AS teamName,
       team_emblem AS teamEmblem,
       formation,
       ovr,
       def_rating AS defRating,
       mid_rating AS midRating,
       att_rating AS attRating,
       outcome,
       score,
       share_id AS shareId,
       submitted_at AS submittedAt
     FROM leaderboard
     ORDER BY score DESC, submitted_at ASC
     LIMIT ?`,
    [limit]
  )

  return {
    success: true,
    configured: true,
    entries: rows as LeaderboardRow[]
  }
})
