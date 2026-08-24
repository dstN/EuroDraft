import { verifyDeleteToken, deleteSharedRun } from '../../utils/shareStorage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing share ID.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!await verifyDeleteToken(id, token)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Missing or invalid deletion token for this share ID.'
    })
  }

  const success = await deleteSharedRun(id)

  if (!success) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Shared run record not found or already deleted.'
    })
  }

  return {
    success: true,
    message: `Shared run ${id} was permanently deleted from the server.`
  }
})
