import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getDbPool, isDbConfigured } from './db'

// Tournament share links. Persisted to MySQL when DATABASE_URL is
// configured (see server/db/migrations/002_create_shared_runs.sql) --
// survives restarts and resolves identically on every Passenger worker.
// Without it, links still work but only in-memory, for the lifetime of the
// single worker process that created them; ensureShareStorageWarning()
// below is how the UI finds out which mode it's in.
export interface SharedRunRecord {
  id: string
  createdAt: string
  teamName: string
  teamEmblem: string
  formation: string
  teamOVR: number
  outcome: string
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: Record<string, unknown> | null
  squad: Record<string, unknown>[]
  matches: Record<string, unknown>[]
}

interface SharedRunRow extends RowDataPacket {
  id: string
  team_name: string
  team_emblem: string
  formation: string
  team_ovr: number
  outcome: string
  def_rating: number
  mid_rating: number
  att_rating: number
  overall_rating: number
  run_stats: unknown
  squad: unknown
  matches: unknown
  delete_token_hash: string
  created_at: Date | string
}

// In-memory fallback, used only when DATABASE_URL is unset.
const memoryStore = new Map<string, SharedRunRecord>()
const memoryTokenHashes = new Map<string, string>()
const memoryOgImages = new Map<string, Buffer>()

// Deletion/export ownership is proven by a bearer token, generated once at
// creation time and returned to the caller only in that response -- never
// again, not even via GET. Only its hash is kept (in the memory map above,
// or the delete_token_hash column), so neither a snapshot of server memory
// nor read access to the database hands out live tokens. The share ID
// itself stays public (it's the whole point of a share link) and is not
// treated as a secret -- see the two-value split below.

function generateId(): string {
  // 6 bytes -> 8 base64url chars, matching the old Math.random() ID length
  // but drawn from a CSPRNG instead of a predictable, enumerable source.
  return randomBytes(6).toString('base64url')
}

function generateDeleteToken(): string {
  // 24 bytes -> 32 base64url chars, 192 bits -- deliberately much longer
  // than the ID since this one *is* the secret.
  return randomBytes(24).toString('base64url')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function rowToRecord(row: SharedRunRow): SharedRunRecord {
  // mysql2 parses JSON columns into JS values already; the only column
  // that needs shaping back into SharedRunRecord's nested form is
  // lineRatings, which is spread across four flat columns for indexing.
  return {
    id: row.id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    teamName: row.team_name,
    teamEmblem: row.team_emblem,
    formation: row.formation,
    teamOVR: row.team_ovr,
    outcome: row.outcome,
    lineRatings: {
      def: row.def_rating,
      mid: row.mid_rating,
      att: row.att_rating,
      overall: row.overall_rating
    },
    runStats: (row.run_stats as Record<string, unknown> | null) ?? null,
    squad: (row.squad as Record<string, unknown>[] | null) ?? [],
    matches: (row.matches as Record<string, unknown>[] | null) ?? []
  }
}

export function isShareStoragePersistent(): boolean {
  return isDbConfigured()
}

export async function saveSharedRun(data: Omit<SharedRunRecord, 'id' | 'createdAt'>): Promise<{ record: SharedRunRecord, deleteToken: string }> {
  const id = generateId()
  const createdAt = new Date().toISOString()
  const record: SharedRunRecord = { id, createdAt, ...data }
  const deleteToken = generateDeleteToken()
  const tokenHash = hashToken(deleteToken)

  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    await db.query(
      `INSERT INTO shared_runs
         (id, team_name, team_emblem, formation, team_ovr, outcome, def_rating, mid_rating, att_rating, overall_rating, run_stats, squad, matches, delete_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.teamName, data.teamEmblem, data.formation, data.teamOVR, data.outcome,
        data.lineRatings.def, data.lineRatings.mid, data.lineRatings.att, data.lineRatings.overall,
        JSON.stringify(data.runStats), JSON.stringify(data.squad), JSON.stringify(data.matches),
        tokenHash
      ]
    )
  } else {
    memoryStore.set(id, record)
    memoryTokenHashes.set(id, tokenHash)
  }

  return { record, deleteToken }
}

export async function getSharedRun(id: string): Promise<SharedRunRecord | undefined> {
  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    const [rows] = await db.query<SharedRunRow[]>('SELECT * FROM shared_runs WHERE id = ?', [id])
    return rows[0] ? rowToRecord(rows[0]) : undefined
  }
  return memoryStore.get(id)
}

/** Constant-time check -- proves the caller holds the token returned at creation, not just the (public) ID. */
export async function verifyDeleteToken(id: string, token: string): Promise<boolean> {
  if (!token) return false

  let expectedHex: string | undefined
  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    const [rows] = await db.query<RowDataPacket[]>('SELECT delete_token_hash FROM shared_runs WHERE id = ?', [id])
    expectedHex = rows[0]?.delete_token_hash
  } else {
    expectedHex = memoryTokenHashes.get(id)
  }
  if (!expectedHex) return false

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = Buffer.from(hashToken(token), 'hex')
  if (expected.length !== actual.length) return false

  return timingSafeEqual(expected, actual)
}

// Stores the rendered result-card PNG (see POST /api/share/:id/og-image)
// used as the /r/:id page's OpenGraph image. Fails closed, not open: if the
// `og_image` column doesn't exist yet (migration 003 not yet run in this
// environment), the upload is silently skipped rather than 500ing the whole
// share flow -- the OG route just keeps falling back to the SVG renderer.
export async function saveOgImage(id: string, image: Buffer): Promise<boolean> {
  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    try {
      const [result] = await db.query<ResultSetHeader>('UPDATE shared_runs SET og_image = ? WHERE id = ?', [image, id])
      return result.affectedRows > 0
    } catch (err) {
      console.error('[shareStorage] Failed to save OG image (has migration 003 been run?):', err)
      return false
    }
  }
  if (!memoryStore.has(id)) return false
  memoryOgImages.set(id, image)
  return true
}

export async function getOgImage(id: string): Promise<Buffer | undefined> {
  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    try {
      const [rows] = await db.query<RowDataPacket[]>('SELECT og_image FROM shared_runs WHERE id = ?', [id])
      const raw = rows[0]?.['og_image']
      return raw ? Buffer.from(raw) : undefined
    } catch (err) {
      console.error('[shareStorage] Failed to read OG image (has migration 003 been run?):', err)
      return undefined
    }
  }
  return memoryOgImages.get(id)
}

export async function deleteSharedRun(id: string): Promise<boolean> {
  const db = isDbConfigured() ? getDbPool() : null
  if (db) {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM shared_runs WHERE id = ?', [id])
    return result.affectedRows > 0
  }
  memoryTokenHashes.delete(id)
  memoryOgImages.delete(id)
  return memoryStore.delete(id)
}
