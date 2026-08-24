import { getDbPool, isDbConfigured } from '../../utils/db'
import { getSharedRun, verifyDeleteToken } from '../../utils/shareStorage'

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

// Each entry must prove ownership with the deletion token issued at
// creation time (POST /api/share) -- a share ID alone is not sufficient,
// since share links are deliberately public and shared with other people.
// Unproven entries are silently excluded rather than erroring the whole
// request: the client only ever sends {id, token} pairs it holds locally,
// so a mismatch means either a stale/foreign ID or a tampered request,
// neither of which should surface any information about the record.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const shareRefs = parseShareRefs(body).filter(ref => verifyDeleteToken(ref.id, ref.token))

  const serverRecords: unknown[] = []
  const leaderboardRecords: unknown[] = []

  const db = isDbConfigured() ? getDbPool() : null

  for (const { id } of shareRefs) {
    const record = getSharedRun(id)
    if (record) {
      serverRecords.push(record)
    }
    if (db) {
      const [rows] = await db.query('SELECT * FROM leaderboard WHERE share_id = ?', [id])
      leaderboardRecords.push(...(rows as unknown[]))
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    legalBasis: 'Art. 15 & 20 DSGVO / GDPR (Right of Access & Data Portability)',
    dataController: {
      name: 'Dustin Tramm',
      address: 'c/o Impressumservice Dein-Impressum, Stettiner Str. 41, 35410 Hungen, Deutschland',
      contactEmail: 'info@rntm.de',
      website: 'https://ed.rntm.de'
    },
    privacyArchitecture: {
      trackingCookies: 'None. EuroDraft does not employ tracking cookies, advertising beacons, or third-party profiling.',
      userAccounts: 'None. EuroDraft operates without mandatory user registrations or accounts.',
      thirdPartyCDNs: 'None. Fonts, icons, and flags are served directly by our server.'
    },
    serverStoredRecords: serverRecords,
    leaderboardRecords,
    message: serverRecords.length > 0 || leaderboardRecords.length > 0
      ? `Found ${serverRecords.length} shared squad record(s) and ${leaderboardRecords.length} leaderboard entry(ies) on the server.`
      : 'No matching records found on server. Server operates zero user profiling.'
  }
})
