export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const shareIds: string[] = Array.isArray(body?.shareIds) ? body.shareIds : (body?.shareId ? [String(body.shareId)] : [])

  if (shareIds.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      message: 'No server records requested for deletion.'
    }
  }

  let deletedCount = 0
  const deletedIds: string[] = []

  for (const id of shareIds) {
    const cleanId = String(id).trim().replace(/^https?:\/\/ed\.rntm\.de\/r\//, '')
    if (deleteSharedRun(cleanId)) {
      deletedCount++
      deletedIds.push(cleanId)
    }
  }

  return {
    success: true,
    deletedCount,
    deletedIds,
    legalBasis: 'Art. 17 DSGVO / GDPR (Right to Erasure / Right to be Forgotten)',
    message: deletedCount > 0
      ? `Successfully and permanently deleted ${deletedCount} record(s) from server storage.`
      : 'Specified share ID(s) were not found on the server or were already deleted.'
  }
})
