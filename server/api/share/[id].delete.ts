export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or missing share ID.'
    })
  }

  const success = deleteSharedRun(id)

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
