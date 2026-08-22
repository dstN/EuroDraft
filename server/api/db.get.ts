import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { EuroDraftDB } from '~/types'

let cachedDb: EuroDraftDB | null = null

export default defineEventHandler(async () => {
  if (cachedDb) return cachedDb

  const filePath = join(process.cwd(), 'public', 'eurodraft_db.json')
  const content = await readFile(filePath, 'utf8')
  cachedDb = JSON.parse(content)
  return cachedDb
})
