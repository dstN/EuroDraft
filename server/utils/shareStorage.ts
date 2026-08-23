// Shared in-memory and persistence storage for tournament share links
export interface SharedRunRecord {
  id: string
  createdAt: string
  teamName: string
  teamEmblem: string
  formation: string
  teamOVR: number
  outcome: string
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: Record<string, unknown> | null
  squad: Record<string, unknown>[]
  matches: Record<string, unknown>[]
}

const sharedRunsStore = new Map<string, SharedRunRecord>()

export function saveSharedRun(data: Omit<SharedRunRecord, 'id' | 'createdAt'>): SharedRunRecord {
  const id = Math.random().toString(36).substring(2, 10)
  const record: SharedRunRecord = {
    id,
    createdAt: new Date().toISOString(),
    ...data
  }
  sharedRunsStore.set(id, record)
  return record
}

export function getSharedRun(id: string): SharedRunRecord | undefined {
  return sharedRunsStore.get(id)
}

export function deleteSharedRun(id: string): boolean {
  return sharedRunsStore.delete(id)
}
