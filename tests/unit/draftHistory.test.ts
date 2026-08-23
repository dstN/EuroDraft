import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDraftHistory, saveDraftToHistory, deleteDraftHistoryEntry, clearDraftHistory } from '../../app/utils/draftHistory'

// This project's test environment doesn't provide a working localStorage (see
// app/stores/audio.ts's `typeof localStorage !== 'undefined'` guards, written for
// the same reason) -- stub a minimal real implementation so persistence logic
// (serialization, cap-at-20, ordering) actually gets exercised here.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size }
  }
}

vi.stubGlobal('localStorage', createMemoryStorage())

function makeEntry(teamName: string) {
  return {
    teamName,
    teamEmblem: 'eu',
    formation: '4-3-3',
    teamOVR: 82,
    outcome: 'winner' as const,
    lineRatings: { def: 80, mid: 84, att: 82, overall: 82 },
    runStats: null,
    squad: [],
    matches: []
  }
}

describe('draftHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(getDraftHistory()).toEqual([])
  })

  it('saves an entry with a generated id and timestamp, newest first', () => {
    const a = saveDraftToHistory(makeEntry('Alpha'))
    const b = saveDraftToHistory(makeEntry('Beta'))

    expect(a.id).toBeTruthy()
    expect(a.createdAt).toBeTruthy()
    expect(a.id).not.toBe(b.id)

    const all = getDraftHistory()
    expect(all.map(e => e.teamName)).toEqual(['Beta', 'Alpha'])
  })

  it('deletes a single entry by id without touching others', () => {
    const a = saveDraftToHistory(makeEntry('Alpha'))
    saveDraftToHistory(makeEntry('Beta'))

    deleteDraftHistoryEntry(a.id)

    const all = getDraftHistory()
    expect(all.map(e => e.teamName)).toEqual(['Beta'])
  })

  it('clears all entries', () => {
    saveDraftToHistory(makeEntry('Alpha'))
    saveDraftToHistory(makeEntry('Beta'))

    clearDraftHistory()

    expect(getDraftHistory()).toEqual([])
  })

  it('caps stored history at 20 entries, keeping the newest', () => {
    for (let i = 0; i < 25; i++) {
      saveDraftToHistory(makeEntry(`Team ${i}`))
    }

    const all = getDraftHistory()
    expect(all.length).toBe(20)
    expect(all[0]!.teamName).toBe('Team 24')
    expect(all[19]!.teamName).toBe('Team 5')
  })
})
