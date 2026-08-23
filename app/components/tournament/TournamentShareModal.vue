<script setup lang="ts">
import type { Player, TournamentRunStats, MatchResult, PositionCode } from '~/types'
import { loadFlagImage } from '~/utils/flagSvg'

const props = defineProps<{
  open: boolean
  teamName: string
  teamEmblem: string
  formation: string
  squad: Player[]
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: TournamentRunStats | null
  matches: MatchResult[]
  groupStandingRank?: number
  groupPoints?: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const activeTab = ref<'text' | 'image'>('text')
const agreeToSave = ref(false)
const shareId = ref<string | null>(null)
const isGeneratingLink = ref(false)
const copiedStatus = ref<'text' | 'image' | 'link' | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)

import { useDraftStore } from '~/stores/draft'

const draftStore = useDraftStore()

// Positional Pitch Order Priority (GK -> LB/LWB -> CB -> RB/RWB -> LM -> CDM/CM/CAM -> RM -> LW -> CF/ST -> RW)
const POS_PRIORITY: Record<string, number> = {
  GK: 1,
  LB: 10,
  LWB: 11,
  CB: 12,
  RWB: 13,
  RB: 14,
  LM: 20,
  CDM: 21,
  CM: 22,
  CAM: 23,
  RM: 24,
  LW: 30,
  CF: 31,
  ST: 32,
  RW: 33
}

function getPlayerPickedPosition(player: Player): PositionCode {
  if (player.draftedPosition) return player.draftedPosition
  const slot = draftStore.slots.find(s => s.player?.id === player.id || (s.player?.nameNormalized === player.nameNormalized && s.player?.country === player.country))
  if (slot?.position) return slot.position
  return player.primaryPosition || 'CM'
}

// 11 Starters ordered by GK > DEF > MID > ATT with actual picked positions
const sortedSquad = computed(() => {
  return [...props.squad].map(player => ({
    ...player,
    pickedPosition: getPlayerPickedPosition(player)
  })).sort((a, b) => {
    const pA = a.pickedPosition
    const pB = b.pickedPosition
    const prioA = POS_PRIORITY[pA] ?? (a.basePosition === 'Goalkeeper' ? 1 : a.basePosition === 'Defender' ? 2 : a.basePosition === 'Midfielder' ? 3 : 4)
    const prioB = POS_PRIORITY[pB] ?? (b.basePosition === 'Goalkeeper' ? 1 : b.basePosition === 'Defender' ? 2 : b.basePosition === 'Midfielder' ? 3 : 4)
    if (prioA !== prioB) return prioA - prioB
    return b.stats.overall - a.stats.overall
  })
})

// Top 3 Scorers & Playmakers (G/A contributors)
const topPerformers = computed(() => {
  if (!props.runStats?.playerStats) return []
  return [...props.runStats.playerStats]
    .filter(p => (p.goals > 0 || p.assists > 0))
    .sort((a, b) => {
      const gaA = a.goals + a.assists
      const gaB = b.goals + b.assists
      if (gaB !== gaA) return gaB - gaA
      return b.goals - a.goals
    })
    .slice(0, 3)
})

const outcomeTitle = computed(() => {
  switch (props.outcome) {
    case 'winner': return '🏆 Continental Champions'
    case 'runner_up': return '🥈 Tournament Runner-Up (Finalist)'
    case 'semi_final': return '🥉 Semi-Finalist (Top 4)'
    case 'quarter_final': return 'Quarter-Finalist (Top 8)'
    default: return `Group Stage Exit${props.groupStandingRank ? ` (${props.groupStandingRank}. Place · ${props.groupPoints ?? 0} pts)` : ''}`
  }
})

const outcomeBadge = computed(() => {
  switch (props.outcome) {
    case 'winner': return '🏆 CHAMPION'
    case 'runner_up': return '🥈 RUNNER-UP'
    case 'semi_final': return '🥉 TOP 4'
    case 'quarter_final': return 'TOP 8'
    default: return 'GROUP STAGE'
  }
})

async function onConsentToggle() {
  if (agreeToSave.value && !shareId.value) {
    isGeneratingLink.value = true
    try {
      const payload = {
        teamName: props.teamName,
        teamEmblem: props.teamEmblem,
        formation: props.formation,
        teamOVR: props.lineRatings.overall,
        outcome: props.outcome,
        lineRatings: props.lineRatings,
        runStats: props.runStats,
        squad: props.squad,
        matches: props.matches
      }

      const res = await $fetch<{ success: boolean, id: string }>('/api/share', {
        method: 'POST',
        body: payload
      })

      if (res?.id) {
        shareId.value = res.id
        if (typeof window !== 'undefined') {
          localStorage.setItem(`eurodraft_shared_${res.id}`, JSON.stringify(payload))
        }
      }
    } catch {
      // Local fallback ID
      const fallbackId = Math.random().toString(36).substring(2, 10)
      shareId.value = fallbackId
    } finally {
      isGeneratingLink.value = false
    }
  }
}

const shareLinkUrl = computed(() => {
  if (!shareId.value) return ''
  return `https://ed.rntm.de/r/${shareId.value}`
})

const wordleShareText = computed(() => {
  let text = `🏆 EuroDraft Tournament Run\n`
  text += `🛡️ DEF: ${props.lineRatings.def} · 🎯 MID: ${props.lineRatings.mid} · ⚡ ATT: ${props.lineRatings.att} · ⭐ ${props.lineRatings.overall} GES (${props.formation})\n\n`
  text += `📈 Finish: ${outcomeTitle.value}\n`
  if (props.runStats) {
    text += `📊 Record: ${props.runStats.totalMatches} Matches · ${props.runStats.totalGoalsFor}:${props.runStats.totalGoalsAgainst} GD · ${props.runStats.cleanSheets} Clean Sheets\n\n`
  }

  if (topPerformers.value.length > 0) {
    text += `⚽ Top Scorers & Playmakers (G/A):\n`
    topPerformers.value.forEach((p, i) => {
      const gaText = p.assists > 0 ? `${p.goals} ⚽ · ${p.assists} 🎯 (${p.goals + p.assists} G/A)` : `${p.goals} ⚽`
      text += `${i + 1}. ${p.player.name} — ${gaText}\n`
    })
    text += `\n`
  }

  if (agreeToSave.value && shareLinkUrl.value) {
    text += `🔗 View full squad & results: ${shareLinkUrl.value}\n`
  } else {
    text += `🎮 Draft your own Euro XI: https://ed.rntm.de\n`
  }

  return text.trim()
})

async function copyShareText() {
  try {
    await navigator.clipboard.writeText(wordleShareText.value)
    copiedStatus.value = 'text'
    setTimeout(() => { copiedStatus.value = null }, 2000)
  } catch (err) {
    console.error('Failed to copy text', err)
  }
}

async function copyShareLink() {
  if (!shareLinkUrl.value) return
  try {
    await navigator.clipboard.writeText(shareLinkUrl.value)
    copiedStatus.value = 'link'
    setTimeout(() => { copiedStatus.value = null }, 2000)
  } catch (err) {
    console.error('Failed to copy link', err)
  }
}

function loadAppLogoImage(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/favicon.svg'
  })
}

// Canvas Drawing Engine (Complete 11-player squad, Top Scorers/G+A, vector flags & equal box heights)
async function renderCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = 1080
  const h = 760
  canvas.width = w
  canvas.height = h

  // Preload all required flags + App Logo
  const userTeamEmblem = props.teamEmblem || 'eu'
  const playerCountries = sortedSquad.value.slice(0, 11).map(p => p.country || 'eu')
  const performerCountries = topPerformers.value.map(p => p.player.country || 'eu')
  const opponentCountries = (props.matches || []).map(m => {
    return m.teamA.team.country === userTeamEmblem ? m.teamB.team.country : m.teamA.team.country
  })

  const uniqueCountries = [...new Set([userTeamEmblem, ...playerCountries, ...performerCountries, ...opponentCountries])]
  const flagImages: Record<string, HTMLImageElement> = {}

  const [appLogoImg] = await Promise.all([
    loadAppLogoImage(),
    ...uniqueCountries.map(async (code) => {
      flagImages[code.toLowerCase()] = await loadFlagImage(code)
    })
  ])

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h)
  bgGrad.addColorStop(0, '#060c14')
  bgGrad.addColorStop(0.5, '#0b1622')
  bgGrad.addColorStop(1, '#05090f')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // Ambient glow
  ctx.save()
  const glowGrad = ctx.createRadialGradient(250, 100, 20, 250, 100, 420)
  glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.16)')
  glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, w, h)

  // Outer border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 3
  ctx.strokeRect(20, 20, w - 40, h - 40)

  // Header: Official Full Brand Logo (Icon Mark + Dual-Color EuroDraft Typography)
  if (appLogoImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(68, 64, 22, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(appLogoImg, 46, 42, 44, 44)
    ctx.restore()

    ctx.beginPath()
    ctx.arc(68, 64, 22.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Brand Typography: 'Euro' (White) + 'Draft' (Gold)
    ctx.font = '900 32px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Euro', 104, 62)
    const euroWidth = ctx.measureText('Euro').width
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('Draft', 104 + euroWidth, 62)

    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 12px monospace'
    ctx.fillText('CONTINENTAL SQUAD & TOURNAMENT RUN', 104, 86)
  } else {
    ctx.font = '900 32px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Euro', 45, 62)
    const euroWidth = ctx.measureText('Euro').width
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('Draft', 45 + euroWidth, 62)

    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 13px monospace'
    ctx.fillText('CONTINENTAL SQUAD & TOURNAMENT RUN', 45, 87)
  }

  // Top Right: Outcome Badge & Primary ed.rntm.de Domain
  ctx.fillStyle = props.outcome === 'winner' ? '#fbbf24' : '#34d399'
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(outcomeBadge.value, w - 45, 61)

  ctx.fillStyle = '#34d399'
  ctx.font = 'bold 13px monospace'
  ctx.fillText('ed.rntm.de', w - 45, 85)
  ctx.textAlign = 'left'

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.beginPath()
  ctx.moveTo(45, 105)
  ctx.lineTo(w - 45, 105)
  ctx.stroke()

  // Equal Height Boxes: y = 120, height = 585
  const boxY = 120
  const boxH = 585

  // ==========================================
  // LEFT BOX: 3 PROPORTIONED SUB-CARDS (x: 45, w: 470, h: 585)
  // ==========================================
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)'
  ctx.fillRect(45, boxY, 470, boxH)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.strokeRect(45, boxY, 470, boxH)

  // ----------------------------------------------------
  // SUB-CARD 1: SQUAD IDENTITY & LINE RATINGS (y: 130 to 226)
  // ----------------------------------------------------
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.fillRect(55, 130, 450, 96)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.strokeRect(55, 130, 450, 96)

  // User Squad Emblem with Golden Ring
  const emblemImg = flagImages[userTeamEmblem.toLowerCase()]
  if (emblemImg) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(84, 159, 18, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(emblemImg, 66, 141, 36, 36)
    ctx.restore()

    ctx.beginPath()
    ctx.arc(84, 159, 18.5, 0, Math.PI * 2)
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText(props.teamName || 'Dream XI', 114, 155)

  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 12px monospace'
  ctx.fillText(`⭐ ${props.lineRatings.overall} GES · Formation: ${props.formation}`, 114, 173)

  // 3 Positional Line Rating Badges
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
  ctx.fillRect(114, 187, 100, 24)
  ctx.fillStyle = '#34d399'
  ctx.font = 'bold 11px monospace'
  ctx.fillText(`🛡️ DEF: ${props.lineRatings.def}`, 122, 203)

  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'
  ctx.fillRect(224, 187, 100, 24)
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 11px monospace'
  ctx.fillText(`🎯 MID: ${props.lineRatings.mid}`, 232, 203)

  ctx.fillStyle = 'rgba(251, 113, 133, 0.15)'
  ctx.fillRect(334, 187, 100, 24)
  ctx.fillStyle = '#fb7185'
  ctx.font = 'bold 11px monospace'
  ctx.fillText(`⚡ ATT: ${props.lineRatings.att}`, 342, 203)

  // ----------------------------------------------------
  // SUB-CARD 2: TOURNAMENT FINISH & TOP 3 G/A STARS (y: 236 to 378)
  // ----------------------------------------------------
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.fillRect(55, 236, 450, 142)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.strokeRect(55, 236, 450, 142)

  // Tournament Result
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText(`🏆 ${outcomeTitle.value}`, 68, 258)

  if (props.runStats) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`${props.runStats.totalMatches} Matches · ${props.runStats.totalGoalsFor}:${props.runStats.totalGoalsAgainst} GD · ${props.runStats.cleanSheets} 🧤 Clean Sheets · ${props.runStats.totalYellowCards} 🟨 ${props.runStats.totalRedCards} 🟥`, 68, 275)
  }

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.beginPath()
  ctx.moveTo(68, 285)
  ctx.lineTo(492, 285)
  ctx.stroke()

  // Top Performers (G/A)
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 10px monospace'
  ctx.fillText('⚽ TOP PERFORMERS (G/A)', 68, 300)

  if (topPerformers.value.length > 0) {
    const performersToDraw = topPerformers.value.slice(0, 3)
    performersToDraw.forEach((p, pIdx) => {
      const py = 318 + pIdx * 20

      // Performer flag
      const pFlag = flagImages[(p.player.country || 'eu').toLowerCase()]
      if (pFlag) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(77, py - 4, 7, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(pFlag, 70, py - 11, 14, 14)
        ctx.restore()

        ctx.beginPath()
        ctx.arc(77, py - 4, 7.5, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      const displayName = p.player.name.length > 18 ? `${p.player.name.slice(0, 16)}…` : p.player.name
      ctx.fillText(`${pIdx + 1}. ${displayName}`, 90, py)

      // G/A Stat Pill
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'right'
      const gaBadge = p.assists > 0 ? `${p.goals} ⚽ · ${p.assists} 🎯 (${p.goals + p.assists} G/A)` : `${p.goals} ⚽ (${p.goals} G/A)`
      ctx.fillText(gaBadge, 492, py)
      ctx.textAlign = 'left'
    })
  } else {
    ctx.fillStyle = '#64748b'
    ctx.font = '11px sans-serif'
    ctx.fillText('No goals or assists recorded in this run', 70, 325)
  }

  // ----------------------------------------------------
  // SUB-CARD 3: ROAD TO THE FINAL / MATCH RESULTS (y: 388 to 695)
  // ----------------------------------------------------
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.fillRect(55, 388, 450, 307)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.strokeRect(55, 388, 450, 307)

  ctx.fillStyle = '#34d399'
  ctx.font = 'bold 10px monospace'
  ctx.fillText(`⚔️ ROAD TO THE FINAL (${(props.matches || []).length} FIXTURES)`, 68, 408)

  const matchesToDraw = (props.matches || []).slice(0, 6)
  const matchCount = matchesToDraw.length
  const matchRowH = 34
  const matchStep = matchCount > 0 ? Math.min(44, Math.floor(255 / matchCount)) : 44
  const matchStartY = 420

  matchesToDraw.forEach((m, mIdx) => {
    const my = matchStartY + mIdx * matchStep

    ctx.fillStyle = mIdx % 2 === 0 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.015)'
    ctx.fillRect(65, my, 430, matchRowH)

    // Phase Label (MD1, MD2, MD3, QF, SF, FINAL)
    const phaseLabel = m.phase === 'group' ? `MD${mIdx + 1}` : m.phase === 'quarter-final' ? 'QF' : m.phase === 'semi-final' ? 'SF' : 'FINAL'
    ctx.fillStyle = m.phase === 'final' ? '#fbbf24' : m.phase === 'group' ? '#94a3b8' : '#38bdf8'
    ctx.font = 'bold 10px monospace'
    ctx.fillText(phaseLabel, 75, my + 21)

    // 1. User Team Flag with GOLDEN RING
    if (emblemImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(114, my + 17, 8.5, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(emblemImg, 105, my + 8, 18, 18)
      ctx.restore()

      ctx.beginPath()
      ctx.arc(114, my + 17, 9, 0, Math.PI * 2)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 10px monospace'
    ctx.fillText('vs', 128, my + 21)

    // 2. Opponent Team Flag
    const isTeamAUser = m.teamA.team.id === 'player-team' || m.teamA.team.isPlayerTeam || m.teamA.team.country === userTeamEmblem
    const oppTeam = isTeamAUser ? m.teamB.team : m.teamA.team
    const oppFlagImg = flagImages[oppTeam.country.toLowerCase()]

    if (oppFlagImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(152, my + 17, 8.5, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(oppFlagImg, 143, my + 8, 18, 18)
      ctx.restore()
    }

    // Opponent Name
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 11px sans-serif'
    const oppDisplayName = oppTeam.countryName.length > 13 ? `${oppTeam.countryName.slice(0, 11)}…` : oppTeam.countryName
    ctx.fillText(oppDisplayName, 168, my + 21)

    // Score & Outcome Result Pill
    const myGoals = isTeamAUser ? m.teamA.goals : m.teamB.goals
    const theirGoals = isTeamAUser ? m.teamB.goals : m.teamA.goals
    const won = myGoals > theirGoals || (m.penalties && (isTeamAUser ? m.penalties.teamA > m.penalties.teamB : m.penalties.teamB > m.penalties.teamA))
    const draw = myGoals === theirGoals && !m.penalties

    ctx.fillStyle = won ? 'rgba(16, 185, 129, 0.2)' : draw ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)'
    ctx.fillRect(410, my + 6, 78, 22)

    ctx.fillStyle = won ? '#34d399' : draw ? '#fbbf24' : '#fb7185'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    const scoreText = m.penalties ? `${myGoals}-${theirGoals}p` : `${myGoals}–${theirGoals}`
    ctx.fillText(`${scoreText} ${won ? '✓' : draw ? '=' : '✗'}`, 449, my + 21)
    ctx.textAlign = 'left'
  })

  // ==========================================
  // RIGHT BOX: 11 STARTERS WITH WIDER ROW SPACING (x: 530, w: 505, h: 585)
  // ==========================================
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.fillRect(530, boxY, 505, boxH)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.strokeRect(530, boxY, 505, boxH)

  // Header
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 13px monospace'
  ctx.fillText('⭐ SQUAD LINEUP', 545, 146)

  // Render 11 Players with wider spacing
  const squadToRender = sortedSquad.value.slice(0, 11)
  const startY = 165
  const rowH = 47

  squadToRender.forEach((p, idx) => {
    const y = startY + idx * rowH

    // Row Background
    if (idx % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)'
      ctx.fillRect(540, y - 4, 485, rowH - 4)
    }

    const pos = p.pickedPosition || getPlayerPickedPosition(p)
    const prio = POS_PRIORITY[pos] || 3

    // Position color coding
    let posBg = 'rgba(56, 189, 248, 0.2)'
    let posText = '#38bdf8'
    if (prio === 1) {
      posBg = 'rgba(245, 158, 11, 0.25)'
      posText = '#fbbf24'
    } else if (prio >= 10 && prio < 20) {
      posBg = 'rgba(16, 185, 129, 0.25)'
      posText = '#34d399'
    } else if (prio >= 30) {
      posBg = 'rgba(251, 113, 133, 0.25)'
      posText = '#fb7185'
    }

    // 1. Position Badge
    ctx.fillStyle = posBg
    ctx.fillRect(545, y + 2, 40, 24)
    ctx.fillStyle = posText
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(pos, 565, y + 18)
    ctx.textAlign = 'left'

    // 2. Real Vector Circular Flag
    const pFlagImg = flagImages[(p.country || 'eu').toLowerCase()]
    if (pFlagImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(606, y + 14, 11, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(pFlagImg, 595, y + 3, 22, 22)
      ctx.restore()

      // Flag border ring
      ctx.beginPath()
      ctx.arc(606, y + 14, 11.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 3. Player Name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    const displayName = p.name.length > 20 ? `${p.name.slice(0, 18)}…` : p.name
    ctx.fillText(displayName, 626, y + 19)

    // 4. GES Rating Badge
    ctx.fillStyle = p.stats.overall >= 90 ? '#fbbf24' : '#cbd5e1'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${p.stats.overall} GES`, 1015, y + 19)
    ctx.textAlign = 'left'
  })

  // Footer Tagline
  ctx.font = 'bold 12px monospace'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Euro', 45, 732)
  const fEuroW = ctx.measureText('Euro').width
  ctx.fillStyle = '#fbbf24'
  ctx.fillText('Draft', 45 + fEuroW, 732)
  const fDraftW = ctx.measureText('Draft').width
  ctx.fillStyle = '#64748b'
  ctx.fillText(' · Draft Your Euro Dream Team · ed.rntm.de', 45 + fEuroW + fDraftW, 732)

  ctx.restore()
}

watch([() => props.open, activeTab], ([isOpen]) => {
  if (isOpen) {
    nextTick(() => {
      renderCanvas()
    })
  }
})

async function copyCanvasImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.toBlob(async (blob) => {
    if (!blob) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      copiedStatus.value = 'image'
      setTimeout(() => { copiedStatus.value = null }, 2000)
    } catch (err) {
      console.error('Failed to copy canvas image', err)
      downloadCanvasImage()
    }
  })
}

function downloadCanvasImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `eurodraft-${props.teamName.toLowerCase().replace(/\s+/g, '-')}-result.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="emit('update:open', false)"
      >
        <div class="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 sm:p-6 text-zinc-100 animate-scale-in max-h-[90vh]">
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UIcon
                  name="i-lucide-share-2"
                  class="size-5"
                />
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white">
                Share Your Tournament Run
              </h3>
            </div>

            <button
              type="button"
              class="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
              @click="emit('update:open', false)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-5"
              />
            </button>
          </div>

          <!-- Format Switcher -->
          <div class="flex p-1 bg-black/40 rounded-xl border border-white/5 select-none">
            <button
              type="button"
              class="flex-1 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              :class="activeTab === 'text' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'"
              @click="activeTab = 'text'"
            >
              <UIcon
                name="i-lucide-file-text"
                class="size-4"
              />
              <span>Text Summary</span>
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              :class="activeTab === 'image' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'"
              @click="activeTab = 'image'"
            >
              <UIcon
                name="i-lucide-image"
                class="size-4"
              />
              <span>Squad Card (PNG)</span>
            </button>
          </div>

          <!-- Explicit Opt-in Link Sharing & Database Storage Consent -->
          <div class="p-3.5 rounded-xl bg-zinc-800/80 border border-white/5 space-y-2">
            <label class="flex items-start gap-3 cursor-pointer select-none">
              <input
                v-model="agreeToSave"
                type="checkbox"
                class="mt-1 size-4 accent-emerald-500 rounded cursor-pointer"
                @change="onConsentToggle"
              >
              <div class="text-xs text-zinc-300 space-y-0.5">
                <span class="font-bold text-white">Save Result & Generate Public Link</span>
                <p class="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  By checking this box, you explicitly agree that your tournament run and drafted squad will be saved in our database to generate a shareable public link on <strong>ed.rntm.de</strong>.
                </p>
              </div>
            </label>

            <!-- Generated Link Box if active -->
            <div
              v-if="agreeToSave && shareLinkUrl"
              class="flex items-center gap-2 pt-1"
            >
              <input
                readonly
                :value="shareLinkUrl"
                class="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-emerald-300 select-all focus:outline-none"
              >
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold cursor-pointer transition-colors shrink-0"
                @click="copyShareLink"
              >
                {{ copiedStatus === 'link' ? '✓ Copied' : 'Copy Link' }}
              </button>
            </div>
            <div
              v-else-if="agreeToSave && isGeneratingLink"
              class="text-xs font-mono text-zinc-400 animate-pulse"
            >
              Generating shareable URL...
            </div>
          </div>

          <!-- TAB 1: TEXT FORMAT -->
          <div
            v-if="activeTab === 'text'"
            class="space-y-4"
          >
            <div class="relative">
              <textarea
                readonly
                rows="9"
                :value="wordleShareText"
                class="w-full p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 resize-none focus:outline-none select-all"
              />
            </div>

            <button
              type="button"
              class="w-full py-3 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              @click="copyShareText"
            >
              <UIcon
                :name="copiedStatus === 'text' ? 'i-lucide-check' : 'i-lucide-copy'"
                class="size-4"
              />
              <span>{{ copiedStatus === 'text' ? '✓ Copied Text to Clipboard!' : 'Copy Text to Clipboard' }}</span>
            </button>
          </div>

          <!-- TAB 2: CANVAS IMAGE FORMAT -->
          <div
            v-else
            class="space-y-4 flex flex-col items-center"
          >
            <div class="w-full overflow-hidden rounded-xl border border-white/10 shadow-lg bg-black">
              <canvas
                ref="canvasRef"
                class="w-full h-auto block"
              />
            </div>

            <div class="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                class="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                @click="copyCanvasImage"
              >
                <UIcon
                  :name="copiedStatus === 'image' ? 'i-lucide-check' : 'i-lucide-copy'"
                  class="size-4"
                />
                <span>{{ copiedStatus === 'image' ? '✓ Copied Image!' : 'Copy Image' }}</span>
              </button>

              <button
                type="button"
                class="py-2.5 px-4 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10 cursor-pointer inline-flex items-center justify-center gap-2 transition-colors"
                @click="downloadCanvasImage"
              >
                <UIcon
                  name="i-lucide-download"
                  class="size-4"
                />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-active {
  opacity: 0;
}
</style>
