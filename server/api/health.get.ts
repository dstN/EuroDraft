import { getDbPool, isDbConfigured } from '../utils/db'

// The leaderboard's MySQL connection is optional — the rest of the app works
// without it — so an unconfigured DB is healthy, not a problem. Only a
// configured-but-unreachable DB should fail this check (and any deploy smoke
// test / rollback wired to it).
//
// The player database is not optional -- draft and tournament are the whole
// product. It's a static build artifact (`public/eurodraft_db.json`), so an
// incomplete deploy (missing `.output/public/`, or a build that ran without
// `npm run build:db`) is exactly the failure this endpoint exists to catch --
// see the deploy-path fix this shipped alongside, which stopped reading it
// from `process.cwd()` for the same reason. A local $fetch HEAD exercises
// the same resolution path a real page load would use.
export default defineEventHandler(async (event) => {
  const problems: string[] = []
  let database: 'connected' | 'disconnected' | 'not_configured' = 'not_configured'
  let playerDatabase: 'ok' | 'unreachable' = 'ok'

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

  try {
    await $fetch.raw('/eurodraft_db.json', { method: 'HEAD' })
  } catch {
    playerDatabase = 'unreachable'
    problems.push('eurodraft_db.json')
  }

  const healthy = problems.length === 0
  const body = {
    status: healthy ? 'ok' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
    playerDatabase,
    ...(problems.length ? { problems } : {})
  }

  if (!healthy) setResponseStatus(event, 503)
  return body
})
