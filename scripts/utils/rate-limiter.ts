/**
 * Simple async delay rate limiter for polite Wikipedia/Wikidata API querying
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class RateLimiter {
  private lastCall = 0
  private delayMs: number

  constructor(delayMs = 250) {
    this.delayMs = delayMs
  }

  async throttle(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastCall
    if (elapsed < this.delayMs) {
      await sleep(this.delayMs - elapsed)
    }
    this.lastCall = Date.now()
  }
}
