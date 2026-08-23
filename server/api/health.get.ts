import { getDbPool, isDbConfigured } from '../utils/db'

// The leaderboard's MySQL connection is optional — the rest of the app works
// without it — so an unconfigured DB is healthy, not a problem. Only a
// configured-but-unreachable DB should fail this check (and any deploy smoke
// test / rollback wired to it).
export default defineEventHandler(async (event) => {
  const problems: string[] = []
  let database: 'connected' | 'disconnected' | 'not_configured' = 'not_configured'

  if (isDbConfigured()) {
    try {
      const db = getDbPool()
      if (db) {
        await db.query('SELECT 1')
        database = 'connected'
      } else {
        database = 'disconnected'
      }
    } catch {
      database = 'disconnected'
    }
    if (database === 'disconnected') problems.push('DATABASE_URL')
  }

  const healthy = problems.length === 0
  const body = {
    status: healthy ? 'ok' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
    ...(problems.length ? { problems } : {})
  }

  if (!healthy) setResponseStatus(event, 503)
  return body
})
