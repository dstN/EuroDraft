<script setup lang="ts">
import type { Player, TournamentRunStats, MatchResult } from '~/types'
import CountryFlag from '~/components/shared/CountryFlag.vue'
import FormationPitch from '~/components/draft/FormationPitch.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const shareId = route.params.id as string

interface SharedRun {
  teamName: string
  teamEmblem: string
  formation: string
  teamOVR: number
  outcome: 'winner' | 'runner_up' | 'semi_final' | 'quarter_final' | 'group_stage'
  lineRatings: { def: number, mid: number, att: number, overall: number }
  runStats: TournamentRunStats | null
  squad: Player[]
  matches: MatchResult[]
}

// SSR-fetched so social-media crawlers (which never run client JS or see
// localStorage) get the correct per-share meta tags in the initial HTML
const { data: shareRes } = await useFetch<{ success: boolean, record: SharedRun }>(`/api/share/${shareId}`)

const sharedRun = ref<SharedRun | null>(shareRes.value?.record ?? null)
const isLoading = ref(!sharedRun.value)
const loadError = ref(false)

onMounted(() => {
  if (sharedRun.value) {
    isLoading.value = false
    return
  }
  // Server's in-memory share store may have been reset since this link was created —
  // fall back to the sharer's own local copy (only helps the original browser, not crawlers)
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`eurodraft_shared_${shareId}`)
    if (local) {
      try {
        sharedRun.value = JSON.parse(local)
      } catch {
        loadError.value = true
      }
    } else {
      loadError.value = true
    }
  }
  isLoading.value = false
})

// Outcome Title
const OUTCOME_TITLES: Record<string, string> = {
  winner: '🏆 Continental Champions',
  runner_up: '🥈 Tournament Runner-Up (Finalist)',
  semi_final: '🥉 Semi-Finalist (Top 4)',
  quarter_final: 'Quarter-Finalist (Top 8)'
}
const outcomeTitle = computed(() => {
  if (!sharedRun.value) return ''
  return OUTCOME_TITLES[sharedRun.value.outcome] ?? 'Group Stage Exit'
})

// Dynamic per-share Open Graph / Twitter card meta
const requestUrl = useRequestURL()
useSeoMeta({
  title: () => sharedRun.value ? `${sharedRun.value.teamName} — ${outcomeTitle.value.replace(/^[^\w]+/, '')} | EuroDraft` : 'Shared Tournament Run | EuroDraft',
  description: () => sharedRun.value
    ? `${sharedRun.value.formation} formation · ${sharedRun.value.teamOVR} OVR squad. See the full lineup and tournament results on EuroDraft.`
    : 'View a shared EuroDraft tournament run.',
  ogTitle: () => sharedRun.value ? `${sharedRun.value.teamName} — ${outcomeTitle.value.replace(/^[^\w]+/, '')}` : 'Shared Tournament Run | EuroDraft',
  ogDescription: () => sharedRun.value
    ? `${sharedRun.value.formation} formation · ${sharedRun.value.teamOVR} OVR squad. See the full lineup and tournament results on EuroDraft.`
    : 'View a shared EuroDraft tournament run.',
  ogImage: `${requestUrl.origin}/og/${shareId}`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: 'website',
  ogUrl: requestUrl.href,
  twitterCard: 'summary_large_image',
  twitterTitle: () => sharedRun.value ? `${sharedRun.value.teamName} — ${outcomeTitle.value.replace(/^[^\w]+/, '')}` : 'Shared Tournament Run | EuroDraft',
  twitterDescription: () => sharedRun.value
    ? `${sharedRun.value.formation} formation · ${sharedRun.value.teamOVR} OVR squad. See the full lineup and tournament results on EuroDraft.`
    : 'View a shared EuroDraft tournament run.',
  twitterImage: `${requestUrl.origin}/og/${shareId}`
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 py-6 pb-16">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="p-12 text-center space-y-3"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 text-emerald-500 animate-spin mx-auto"
      />
      <p class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
        Loading Shared Tournament Run...
      </p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="loadError || !sharedRun"
      class="surface-card p-10 text-center space-y-4 max-w-lg mx-auto"
    >
      <UIcon
        name="i-lucide-search-x"
        class="size-12 text-zinc-500 mx-auto"
      />
      <h2 class="text-xl font-bold text-white">
        Tournament Run Not Found
      </h2>
      <p class="text-xs text-zinc-400">
        The shared link may have expired or is invalid. Draft your own squad to enter the tournament!
      </p>
      <NuxtLink
        to="/draft/formation"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
      >
        <span>Start New Draft</span>
        <UIcon
          name="i-lucide-arrow-right"
          class="size-4"
        />
      </NuxtLink>
    </div>

    <!-- Shared Tournament View -->
    <div
      v-else
      class="space-y-8 animate-fade-in"
    >
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 text-emerald-300 text-xs uppercase font-mono tracking-[0.2em] font-bold">
            Shared Tournament Run
          </div>
          <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <CountryFlag
              :country="sharedRun.teamEmblem || 'eu'"
              size="md"
            />
            <span>{{ sharedRun.teamName }}</span>
          </h1>
          <p class="text-zinc-300 text-xs sm:text-sm font-semibold">
            Formation: {{ sharedRun.formation }} · Overall Rating: <strong class="font-mono text-emerald-400 font-black">{{ sharedRun.teamOVR }} GES</strong>
          </p>
        </div>

        <NuxtLink
          to="/draft/formation"
          class="rounded-full px-6 py-3 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg inline-flex items-center justify-center gap-2 transition-all shrink-0 active:scale-[0.99]"
        >
          <span>Draft Your Own Dream XI →</span>
        </NuxtLink>
      </div>

      <!-- Outcome Banner -->
      <div
        class="surface-card p-6 sm:p-8 text-center space-y-3 relative overflow-hidden"
        :class="sharedRun.outcome === 'winner' ? 'bg-gradient-to-b from-amber-500/20 via-transparent to-transparent border-amber-500/50 ring-1 ring-amber-500/40 shadow-2xl' : ''"
      >
        <UIcon
          v-if="sharedRun.outcome === 'winner'"
          name="i-lucide-trophy"
          class="size-14 mx-auto mb-1 text-amber-400 animate-bounce"
        />
        <UIcon
          v-else-if="sharedRun.outcome === 'runner_up'"
          name="i-lucide-medal"
          class="size-12 mx-auto mb-1 text-slate-300"
        />
        <UIcon
          v-else
          name="i-lucide-shield-alert"
          class="size-12 mx-auto mb-1 text-zinc-400"
        />

        <h2 class="text-2xl sm:text-4xl font-black text-white">
          {{ outcomeTitle }}
        </h2>
        <p class="text-xs sm:text-sm text-zinc-300 font-mono">
          Final Tournament Run Result
        </p>
      </div>

      <!-- Line Ratings -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="surface-card p-4 space-y-1 text-center">
          <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-400">DEF (GK+Def)</span>
          <p class="text-2xl font-black font-mono text-emerald-400">
            {{ sharedRun.lineRatings.def }} <span class="text-xs text-zinc-500 font-bold">GES</span>
          </p>
        </div>
        <div class="surface-card p-4 space-y-1 text-center">
          <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-400">MID Avg</span>
          <p class="text-2xl font-black font-mono text-sky-400">
            {{ sharedRun.lineRatings.mid }} <span class="text-xs text-zinc-500 font-bold">GES</span>
          </p>
        </div>
        <div class="surface-card p-4 space-y-1 text-center">
          <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-400">ATT Avg</span>
          <p class="text-2xl font-black font-mono text-amber-400">
            {{ sharedRun.lineRatings.att }} <span class="text-xs text-zinc-500 font-bold">GES</span>
          </p>
        </div>
        <div class="surface-card p-4 space-y-1 text-center">
          <span class="text-[11px] uppercase font-mono font-bold tracking-widest text-zinc-400">Overall GES</span>
          <p class="text-2xl font-black font-mono text-white">
            {{ sharedRun.lineRatings.overall }} <span class="text-xs text-zinc-500 font-bold">GES</span>
          </p>
        </div>
      </div>

      <!-- Tactical Pitch -->
      <div class="surface-card p-5 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-white/5">
          <span class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
            Drafted XI Tactical Lineup
          </span>
          <span class="text-xs font-mono font-bold text-emerald-400">
            {{ sharedRun.formation }}
          </span>
        </div>

        <div class="w-full max-w-xl mx-auto h-[440px] py-1">
          <FormationPitch
            :slots="sharedRun.squad.map((p, idx) => ({ id: `${p.primaryPosition}-${idx}`, position: p.primaryPosition, player: p }))"
            :interactive="false"
            class="h-full"
          />
        </div>
      </div>

      <!-- Bottom CTA Banner -->
      <div class="surface-card p-6 sm:p-8 text-center space-y-4 bg-gradient-to-r from-emerald-950/60 to-zinc-900 border-emerald-500/30">
        <h3 class="text-xl sm:text-2xl font-black text-white">
          Think you can draft a better Euro XI?
        </h3>
        <p class="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
          Spin legendary players from European tournament history, build your formation, and simulate the championship tournament.
        </p>
        <NuxtLink
          to="/draft/formation"
          class="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-xl active:scale-[0.99]"
        >
          <span>Start Your EuroDraft →</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
