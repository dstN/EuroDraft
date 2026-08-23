import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise'

// Leaderboard persistence is optional: the rest of the app works fine with
// DATABASE_URL unset (local dev, or before it's provisioned in production).
// See server/db/migrations/001_create_leaderboard.sql for the schema.

let pool: Pool | null = null
let attemptedInit = false

export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL
}

export function getDbPool(): Pool | null {
  if (pool) return pool
  if (attemptedInit) return null
  attemptedInit = true

  const uri = process.env.DATABASE_URL
  if (!uri) return null

  // connectionLimit is per Passenger worker process, not global -- keep it
  // low on shared hosting where several processes may run concurrently.
  pool = mysql.createPool({
    uri,
    connectionLimit: 4,
    waitForConnections: true
  })
  return pool
}
