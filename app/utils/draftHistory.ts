import type { Player, MatchResult, TournamentRunStats } from '~/types'

const STORAGE_KEY = 'eurodraft_draft_history'
const MAX_ENTRIES = 20

export interface DraftHistoryEntry {
  id: string
  createdAt: string
  teamName: string
  teamEmblem: string
  formation: string
  teamOVR: number
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: TournamentRunStats | null
  squad: Player[]
  matches: MatchResult[]
}

function readAll(): DraftHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(entries: DraftHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // Storage full or unavailable -- silently skip, this is a nice-to-have, not critical data
  }
}

export function getDraftHistory(): DraftHistoryEntry[] {
  return readAll()
}

export function saveDraftToHistory(entry: Omit<DraftHistoryEntry, 'id' | 'createdAt'>): DraftHistoryEntry {
  const record: DraftHistoryEntry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry
  }
  const existing = readAll()
  writeAll([record, ...existing])
  return record
}

export function deleteDraftHistoryEntry(id: string): void {
  writeAll(readAll().filter(e => e.id !== id))
}

export function clearDraftHistory(): void {
  writeAll([])
}
