import type { PositionCode } from '~/types'

/**
 * Shared pitch-coordinate logic for FormationPitch.vue and MiniFormationPitch.vue.
 * Generic across any count per position (not just the counts the 11 preset
 * formations happen to use) so custom, user-built formations render without
 * overlapping discs.
 */

interface PitchContext {
  hasCDM: boolean
  hasCM: boolean
  hasCAM: boolean
}

/**
 * Spread `count` items around the center of [min, max] using a natural per-slot
 * spacing (matched to the original hand-tuned 2/3-count layouts, e.g. CB's old
 * 37/63 for a pair), only stretching to fill the full band once there are enough
 * items that the natural spacing would exceed it. A naive "always stretch to
 * min/max" formula puts a *pair* at the extreme edges of the band -- fine as
 * numbers, but visually overlapping a neighboring position (e.g. CB landing
 * almost on top of LB/RB) since discs have real pixel size, not zero width.
 */
function spread(index: number, count: number, min: number, max: number, naturalStep = 28): number {
  if (count <= 1) return (min + max) / 2
  const center = (min + max) / 2
  const span = Math.min(max - min, naturalStep * (count - 1))
  const start = center - span / 2
  return start + (index / (count - 1)) * span
}

/** Stack same-position items vertically around a base row, for wide/edge positions */
function stack(index: number, count: number, baseTop: number, gap = 13): number {
  if (count <= 1) return baseTop
  const offset = (index - (count - 1) / 2) * gap
  return Math.min(92, Math.max(10, baseTop + offset))
}

export function getPitchCoordinates(
  position: PositionCode,
  sameIndex: number,
  sameCount: number,
  ctx: PitchContext
): { top: number, left: number } {
  const { hasCDM, hasCAM } = ctx

  switch (position) {
    case 'GK':
      return { top: 88, left: 50 }

    case 'CB':
      return { top: 74, left: spread(sameIndex, sameCount, 25, 75) }

    case 'LB':
      return { top: stack(sameIndex, sameCount, 70), left: 14 }
    case 'RB':
      return { top: stack(sameIndex, sameCount, 70), left: 86 }

    case 'CDM':
      return { top: 60, left: spread(sameIndex, sameCount, 32, 68) }

    case 'CM': {
      let top = 48
      if (hasCDM && hasCAM) top = 47
      else if (hasCDM && !hasCAM) top = 44
      else if (!hasCDM && hasCAM) top = 52
      return { top, left: spread(sameIndex, sameCount, 22, 78) }
    }

    case 'CAM': {
      if (sameCount <= 1 && hasCDM && ctx.hasCM) return { top: 33, left: 60 }
      return { top: 33, left: spread(sameIndex, sameCount, 30, 70) }
    }

    case 'LM':
      return { top: stack(sameIndex, sameCount, hasCDM ? 48 : 46), left: 14 }
    case 'RM':
      return { top: stack(sameIndex, sameCount, hasCDM ? 48 : 46), left: 86 }

    case 'LW':
      return { top: stack(sameIndex, sameCount, 20), left: 18 }
    case 'RW':
      return { top: stack(sameIndex, sameCount, 20), left: 82 }

    case 'ST':
    case 'CF':
      return { top: 15, left: spread(sameIndex, sameCount, 26, 74) }

    default:
      return { top: 50, left: 50 }
  }
}

/** Same-position index/count for one slot within a flat position list */
export function samePositionIndex(position: PositionCode, index: number, allPositions: PositionCode[]): { sameIndex: number, sameCount: number } {
  let sameIndex = 0
  let sameCount = 0
  for (let i = 0; i < allPositions.length; i++) {
    if (allPositions[i] === position) {
      if (i === index) sameIndex = sameCount
      sameCount++
    }
  }
  return { sameIndex, sameCount }
}
