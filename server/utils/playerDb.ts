import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { EuroDraftDB } from '~/types'

let cachedDb: EuroDraftDB | null = null
let loadPromise: Promise<EuroDraftDB> | null = null

export function loadPlayerDb(): Promise<EuroDraftDB> {
  if (cachedDb) return Promise.resolve(cachedDb)
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const filePath = join(process.cwd(), 'public', 'eurodraft_db.json')
    const content = await readFile(filePath, 'utf8')
    cachedDb = JSON.parse(content)
    return cachedDb!
  })()

  return loadPromise
}
