import type { MatchResult, Player, TournamentRunStats } from '~/types'

// ============================================================
// useShareSubmission — the two explicit opt-in consent flows in
// TournamentShareModal.vue: generating a public share link (saves
// the run to the database) and submitting to the public leaderboard.
// Two separate API calls with independent consent checkboxes, kept
// together since both are "share modal side effects" the modal's
// consent-checkbox UI drives directly.
// ============================================================
export function useShareSubmission(props: {
  teamName: string
  teamEmblem: string
  formation: string
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: TournamentRunStats | null
  squad: Player[]
  matches: MatchResult[]
}, uploadOgImage?: (shareId: string, shareToken: string) => Promise<boolean>) {
  const agreeToSave = ref(false)
  const shareId = ref<string | null>(null)
  const isGeneratingLink = ref(false)
  const copiedLink = ref(false)

  const agreeToLeaderboard = ref(false)
  const isSubmittingLeaderboard = ref(false)
  const leaderboardSubmitted = ref(false)
  const leaderboardError = ref('')

  const shareLinkUrl = computed(() => {
    if (!shareId.value) return ''
    return `https://ed.rntm.de/r/${shareId.value}`
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

        const res = await $fetch<{ success: boolean, id: string, deleteToken: string }>('/api/share', {
          method: 'POST',
          body: payload
        })

        if (res?.id) {
          shareId.value = res.id
          if (typeof window !== 'undefined') {
            // deleteToken proves ownership for DELETE /api/share/:id and the
            // GDPR export/delete endpoints -- it's returned exactly once, in
            // this response, and kept only here and in GdprSelfService's
            // tracked-shares list (see server/utils/shareStorage.ts).
            localStorage.setItem(`eurodraft_shared_${res.id}`, JSON.stringify({ ...payload, deleteToken: res.deleteToken }))
            try {
              const list = JSON.parse(localStorage.getItem('eurodraft_my_shares') || '[]')
              list.unshift({
                id: res.id,
                teamName: props.teamName || 'EuroDraft Squad',
                createdAt: new Date().toISOString(),
                deleteToken: res.deleteToken
              })
              localStorage.setItem('eurodraft_my_shares', JSON.stringify(list.slice(0, 30)))
            } catch {
              // Ignore storage parse error
            }
          }

          // Best-effort: the share link and page work fine without this --
          // it only affects how the link previews in Discord/social embeds.
          void uploadOgImage?.(res.id, res.deleteToken)
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

  async function onLeaderboardToggle() {
    if (!agreeToLeaderboard.value || leaderboardSubmitted.value) return
    isSubmittingLeaderboard.value = true
    leaderboardError.value = ''
    try {
      await $fetch('/api/leaderboard', {
        method: 'POST',
        body: {
          teamName: props.teamName,
          teamEmblem: props.teamEmblem,
          formation: props.formation,
          ovr: props.lineRatings.overall,
          outcome: props.outcome,
          lineRatings: props.lineRatings,
          shareId: shareId.value
        }
      })
      leaderboardSubmitted.value = true
    } catch {
      leaderboardError.value = 'Leaderboard is not available right now — please try again later.'
      agreeToLeaderboard.value = false
    } finally {
      isSubmittingLeaderboard.value = false
    }
  }

  async function copyShareLink() {
    if (!shareLinkUrl.value) return
    try {
      await navigator.clipboard.writeText(shareLinkUrl.value)
      copiedLink.value = true
      setTimeout(() => {
        copiedLink.value = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy link', err)
    }
  }

  return {
    agreeToSave,
    shareId,
    isGeneratingLink,
    copiedLink,
    shareLinkUrl,
    onConsentToggle,
    copyShareLink,
    agreeToLeaderboard,
    isSubmittingLeaderboard,
    leaderboardSubmitted,
    leaderboardError,
    onLeaderboardToggle
  }
}
