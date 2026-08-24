import { getSharedRun } from '../../utils/shareStorage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing share ID' })
  }

  const record = await getSharedRun(id)
  if (!record) {
    throw createError({ statusCode: 404, message: 'Shared tournament run not found' })
  }

  return {
    success: true,
    record
  }
})
