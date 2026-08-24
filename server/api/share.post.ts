import { saveSharedRun } from '../utils/shareStorage'
import { checkRateLimit } from '../utils/rateLimit'

const VALID_OUTCOMES = new Set(['winner', 'runner_up', 'semi_final', 'quarter_final', 'group_stage'])

// Generous headroom over a real full-tournament payload (squad of 11 +
// up to ~9 matches, each embedding two full squads) while still bounding
// the unauthenticated, unbounded-memory-store DoS this closes off.
const MAX_BODY_BYTES = 1_000_000
const MAX_SQUAD_SIZE = 11
const MAX_MATCHES = 20

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  if (!checkRateLimit(`share:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please wait a few minutes before sharing another run.' })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody || Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload too large.' })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload.' })
  }

  const teamName = String(body?.teamName ?? '').trim().slice(0, 24)
  const teamEmblem = String(body?.teamEmblem ?? 'eu').trim().slice(0, 16) || 'eu'
  const formation = String(body?.formation ?? '').trim().slice(0, 24)
  const outcome = String(body?.outcome ?? '').trim()
  const teamOVR = clampInt(body?.teamOVR, 0, 99)

  const lineRatingsInput = (body?.lineRatings ?? {}) as Record<string, unknown>
  const def = clampInt(lineRatingsInput.def, 0, 99)
  const mid = clampInt(lineRatingsInput.mid, 0, 99)
  const att = clampInt(lineRatingsInput.att, 0, 99)
  const overall = clampInt(lineRatingsInput.overall, 0, 99)

  if (!teamName || !formation || !VALID_OUTCOMES.has(outcome) || teamOVR === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission: team name, formation, outcome, and OVR are required.' })
  }
  if (def === null || mid === null || att === null || overall === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission: line ratings must be numbers between 0 and 99.' })
  }

  const runStats = body?.runStats && typeof body.runStats === 'object' && !Array.isArray(body.runStats)
    ? body.runStats as Record<string, unknown>
    : null
  const squad = Array.isArray(body?.squad) ? body.squad.slice(0, MAX_SQUAD_SIZE) : []
  const matches = Array.isArray(body?.matches) ? body.matches.slice(0, MAX_MATCHES) : []

  const { record, deleteToken } = saveSharedRun({
    teamName,
    teamEmblem,
    formation,
    teamOVR,
    outcome,
    lineRatings: { def, mid, att, overall },
    runStats,
    squad,
    matches
  })

  // deleteToken is returned exactly once, here -- it proves ownership for
  // DELETE /api/share/:id and the GDPR export/delete endpoints, and is
  // never included in the record itself (so GET /api/share/:id, which is
  // public, can't leak it).
  return {
    success: true,
    id: record.id,
    deleteToken,
    record
  }
})
