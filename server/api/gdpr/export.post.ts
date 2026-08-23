export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const shareIds: string[] = Array.isArray(body?.shareIds) ? body.shareIds : (body?.shareId ? [String(body.shareId)] : [])

  const serverRecords: unknown[] = []

  for (const id of shareIds) {
    const cleanId = String(id).trim().replace(/^https?:\/\/ed\.rntm\.de\/r\//, '')
    const record = getSharedRun(cleanId)
    if (record) {
      serverRecords.push(record)
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
    message: serverRecords.length > 0
      ? `Found ${serverRecords.length} shared squad record(s) on the server.`
      : 'No matching records found on server. Server operates zero user profiling.'
  }
})
