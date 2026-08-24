// Simple in-memory sliding-window rate limiter, shared across route
// handlers (contact form, share submission). One process-wide bucket map,
// namespaced by the caller's own key prefix so independent endpoints don't
// share a budget.
//
// Per-worker only, by design -- see DEPLOYMENT.md on Passenger running
// several worker processes concurrently. A caller can get `max` requests
// per worker rather than truly globally, which is an acceptable trade-off
// for abuse-mitigation rate limiting on this scale of app.
//
// Entries are swept on a timer independent of request traffic, so IPs that
// stop sending don't linger in the map forever.

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()
let sweepTimer: ReturnType<typeof setInterval> | null = null

function ensureSweepTimer(windowMs: number) {
  if (sweepTimer) return
  sweepTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs)
      if (bucket.timestamps.length === 0) buckets.delete(key)
    }
  }, windowMs)
  sweepTimer.unref?.()
}

export function checkRateLimit(key: string, opts: { windowMs: number, max: number }): boolean {
  ensureSweepTimer(opts.windowMs)

  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  const fresh = bucket.timestamps.filter(t => now - t < opts.windowMs)

  if (fresh.length >= opts.max) {
    bucket.timestamps = fresh
    buckets.set(key, bucket)
    return false
  }

  fresh.push(now)
  bucket.timestamps = fresh
  buckets.set(key, bucket)
  return true
}
