import { describe, expect, it } from 'vitest'
import { renderShareOgImage } from '../../server/utils/ogImage'
import type { SharedRunRecord } from '../../server/utils/shareStorage'

function makeRecord(overrides: Partial<SharedRunRecord> = {}): SharedRunRecord {
  return {
    id: 'abc123',
    createdAt: new Date().toISOString(),
    teamName: 'Dream XI',
    teamEmblem: 'eu',
    formation: '4-3-3',
    teamOVR: 88,
    outcome: 'winner',
    lineRatings: { def: 85, mid: 87, att: 90, overall: 88 },
    runStats: null,
    squad: [],
    matches: [],
    ...overrides
  }
}

describe('renderShareOgImage', () => {
  it('renders a well-formed SVG embedding the record\'s stats', () => {
    const svg = renderShareOgImage(makeRecord())

    expect(svg).toContain('<svg')
    expect(svg).toContain('Dream XI')
    expect(svg).toContain('4-3-3 FORMATION')
    expect(svg).toContain('CONTINENTAL CHAMPIONS')
  })

  it('renders a fallback card when given an undefined record', () => {
    const svg = renderShareOgImage(undefined)

    expect(svg).toContain('<svg')
    expect(svg).toContain('Dream XI') // default team name
    expect(svg).toContain('TOURNAMENT RESULT') // default outcome label
  })

  it('escapes a hostile team name so it cannot break out of the SVG into a script', () => {
    const hostile = makeRecord({ teamName: '</text><script>alert(1)</script>' })

    const svg = renderShareOgImage(hostile)

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })

  it('escapes a hostile formation string', () => {
    const hostile = makeRecord({ formation: '"><image href="x" onerror="alert(1)"' })

    const svg = renderShareOgImage(hostile)

    expect(svg).not.toContain('onerror="alert(1)"')
  })

  it('coerces a non-numeric lineRatings field to a safe fallback instead of interpolating it raw', () => {
    const hostile = makeRecord({
      // @ts-expect-error -- deliberately hostile/malformed input, as if it
      // reached storage from a source that bypassed share.post.ts's validation
      lineRatings: { def: '</text><script>alert(1)</script>', mid: 87, att: 90, overall: 88 }
    })

    const svg = renderShareOgImage(hostile)

    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('alert(1)')
  })

  it('clamps an out-of-range OVR to the fallback rather than printing it raw', () => {
    const hostile = makeRecord({ teamOVR: 99999 })

    const svg = renderShareOgImage(hostile)

    expect(svg).not.toContain('99999')
  })

  it('truncates an excessively long team name', () => {
    const long = makeRecord({ teamName: 'A'.repeat(200) })

    const svg = renderShareOgImage(long)

    expect(svg).toContain('…')
    expect(svg).not.toContain('A'.repeat(200))
  })

  it('falls back to the neutral outcome label for an unrecognized outcome value', () => {
    // @ts-expect-error -- deliberately outside the validated outcome union
    const svg = renderShareOgImage(makeRecord({ outcome: 'not-a-real-outcome' }))

    expect(svg).toContain('TOURNAMENT RESULT')
  })
})
