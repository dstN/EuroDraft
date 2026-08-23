import { saveSharedRun } from '../utils/shareStorage'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'Invalid payload' })
  }

  const record = saveSharedRun(body)
  return {
    success: true,
    id: record.id,
    record
  }
})
