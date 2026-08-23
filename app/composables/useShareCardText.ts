import type { ComputedRef, Ref } from 'vue'
import type { PlayerTournamentStats, TournamentRunStats } from '~/types'

// ============================================================
// useShareCardText — the "Text Summary" tab's Wordle-style share
// text and its copy-to-clipboard action.
// ============================================================
export function useShareCardText(props: {
  lineRatings: { def: number, mid: number, att: number, overall: number }
  formation: string
  runStats: TournamentRunStats | null
}, data: {
  outcomeTitle: ComputedRef<string>
  topPerformers: ComputedRef<PlayerTournamentStats[]>
}, share: {
  agreeToSave: Ref<boolean>
  shareLinkUrl: ComputedRef<string>
}) {
  const copiedText = ref(false)

  const wordleShareText = computed(() => {
    let text = `🏆 EuroDraft Tournament Run\n`
    text += `🛡️ DEF: ${props.lineRatings.def} · 🎯 MID: ${props.lineRatings.mid} · ⚡ ATT: ${props.lineRatings.att} · ⭐ ${props.lineRatings.overall} GES (${props.formation})\n\n`
    text += `📈 Finish: ${data.outcomeTitle.value}\n`
    if (props.runStats) {
      text += `📊 Record: ${props.runStats.totalMatches} Matches · ${props.runStats.totalGoalsFor}:${props.runStats.totalGoalsAgainst} GD · ${props.runStats.cleanSheets} Clean Sheets\n\n`
    }

    if (data.topPerformers.value.length > 0) {
      text += `⚽ Top Scorers & Playmakers (G/A):\n`
      data.topPerformers.value.forEach((p, i) => {
        const gaText = p.assists > 0 ? `${p.goals} ⚽ · ${p.assists} 🎯 (${p.goals + p.assists} G/A)` : `${p.goals} ⚽`
        text += `${i + 1}. ${p.player.name} — ${gaText}\n`
      })
      text += `\n`
    }

    if (share.agreeToSave.value && share.shareLinkUrl.value) {
      text += `🔗 View full squad & results: ${share.shareLinkUrl.value}\n`
    } else {
      text += `🎮 Draft your own Euro XI: https://ed.rntm.de\n`
    }

    return text.trim()
  })

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(wordleShareText.value)
      copiedText.value = true
      setTimeout(() => {
        copiedText.value = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  return {
    wordleShareText,
    copiedText,
    copyShareText
  }
}
