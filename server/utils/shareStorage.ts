import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

// In-memory storage for tournament share links (see the persistence issue
// tracked separately -- this comment used to claim persistence that was
// never built; it doesn't anymore).
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

const sharedRunsStore = new Map<string, SharedRunRecord>()

// Deletion/export ownership is proven by a bearer token, generated once at
// creation time and returned to the caller only in that response -- never
// again, not even via GET. Only its hash is kept, so a snapshot of server
// memory doesn't hand out live tokens either. The share ID itself stays
// public (it's the whole point of a share link) and is not treated as a
// secret -- see the two-value split below.
const deleteTokenHashes = new Map<string, string>()

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

export function saveSharedRun(data: Omit<SharedRunRecord, 'id' | 'createdAt'>): { record: SharedRunRecord, deleteToken: string } {
  const id = generateId()
  const record: SharedRunRecord = {
    id,
    createdAt: new Date().toISOString(),
    ...data
  }
  const deleteToken = generateDeleteToken()

  sharedRunsStore.set(id, record)
  deleteTokenHashes.set(id, hashToken(deleteToken))

  return { record, deleteToken }
}

export function getSharedRun(id: string): SharedRunRecord | undefined {
  return sharedRunsStore.get(id)
}

/** Constant-time check -- proves the caller holds the token returned at creation, not just the (public) ID. */
export function verifyDeleteToken(id: string, token: string): boolean {
  const expectedHex = deleteTokenHashes.get(id)
  if (!expectedHex || !token) return false

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = Buffer.from(hashToken(token), 'hex')
  if (expected.length !== actual.length) return false

  return timingSafeEqual(expected, actual)
}

export function deleteSharedRun(id: string): boolean {
  deleteTokenHashes.delete(id)
  return sharedRunsStore.delete(id)
}
