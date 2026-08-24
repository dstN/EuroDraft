import { describe, expect, it, vi } from 'vitest'
import { checkRateLimit } from '../../server/utils/rateLimit'

describe('checkRateLimit', () => {
  it('allows up to `max` requests within the window, then rejects', () => {
    const key = `test:${Math.random()}`

    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, { windowMs: 60_000, max: 3 })).toBe(true)
    }
    expect(checkRateLimit(key, { windowMs: 60_000, max: 3 })).toBe(false)
  })

  it('tracks independent buckets per key', () => {
    const a = `test:a:${Math.random()}`
    const b = `test:b:${Math.random()}`

    for (let i = 0; i < 2; i++) checkRateLimit(a, { windowMs: 60_000, max: 2 })

    expect(checkRateLimit(a, { windowMs: 60_000, max: 2 })).toBe(false)
    expect(checkRateLimit(b, { windowMs: 60_000, max: 2 })).toBe(true)
  })

  it('allows a fresh request again once the window has elapsed', () => {
    vi.useFakeTimers()
    try {
      const key = `test:${Math.random()}`
      expect(checkRateLimit(key, { windowMs: 1000, max: 1 })).toBe(true)
      expect(checkRateLimit(key, { windowMs: 1000, max: 1 })).toBe(false)

      vi.advanceTimersByTime(1001)

      expect(checkRateLimit(key, { windowMs: 1000, max: 1 })).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
