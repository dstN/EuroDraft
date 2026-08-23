import { getDbPool, isDbConfigured } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const shareIds: string[] = Array.isArray(body?.shareIds) ? body.shareIds : (body?.shareId ? [String(body.shareId)] : [])

  const serverRecords: unknown[] = []
  const leaderboardRecords: unknown[] = []

  const db = isDbConfigured() ? getDbPool() : null

  for (const id of shareIds) {
    const cleanId = String(id).trim().replace(/^https?:\/\/ed\.rntm\.de\/r\//, '')
    const record = getSharedRun(cleanId)
    if (record) {
      serverRecords.push(record)
    }
    if (db) {
      const [rows] = await db.query('SELECT * FROM leaderboard WHERE share_id = ?', [cleanId])
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
