<script setup lang="ts">
import LegalImprintTab from '~/components/legal/LegalImprintTab.vue'
import LegalPrivacyTab from '~/components/legal/LegalPrivacyTab.vue'
import LegalTermsTab from '~/components/legal/LegalTermsTab.vue'
import LegalContactTab from '~/components/legal/LegalContactTab.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()

type LegalTab = 'imprint' | 'privacy' | 'terms' | 'contact'

const activeTab = ref<LegalTab>('imprint')

// Sync tab from query (e.g. /legal?tab=contact or /legal?tab=privacy) -- watched,
// not just read on mount, so links into an already-open /legal page (e.g. the
// footer's Contact link) actually switch the tab instead of no-opping.
watch(() => route.query.tab, (queryTab) => {
  if (queryTab && ['imprint', 'privacy', 'terms', 'contact'].includes(queryTab as string)) {
    activeTab.value = queryTab as LegalTab
  }
}, { immediate: true })

function setTab(tab: LegalTab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
    <!-- Header -->
    <div class="space-y-3 text-center sm:text-left">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
        <UIcon
          name="i-lucide-shield-check"
          class="size-3.5"
        />
        <span>{{ $t('legal.badge') }}</span>
      </div>
      <h1 class="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
        {{ $t('legal.title') }}
      </h1>
      <p class="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
        {{ $t('legal.subtitle') }}
      </p>
    </div>

    <!-- Navigation Tabs (2x2 grid on mobile so long translated labels never force
         horizontal scrolling; single row from sm up) -->
    <div class="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl select-none">
      <button
        type="button"
        class="sm:flex-1 py-2.5 px-2 sm:px-3.5 rounded-xl font-mono text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-center"
        :class="activeTab === 'imprint'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('imprint')"
      >
        <UIcon
          name="i-lucide-file-text"
          class="size-4 text-emerald-500 shrink-0"
        />
        <span class="truncate">{{ $t('legal.tab_imprint') }}</span>
      </button>

      <button
        type="button"
        class="sm:flex-1 py-2.5 px-2 sm:px-3.5 rounded-xl font-mono text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-center"
        :class="activeTab === 'privacy'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('privacy')"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-4 text-emerald-500 shrink-0"
        />
        <span class="truncate">{{ $t('legal.tab_privacy') }}</span>
      </button>

      <button
        type="button"
        class="sm:flex-1 py-2.5 px-2 sm:px-3.5 rounded-xl font-mono text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-center"
        :class="activeTab === 'terms'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('terms')"
      >
        <UIcon
          name="i-lucide-scale"
          class="size-4 text-emerald-500 shrink-0"
        />
        <span class="truncate">{{ $t('legal.tab_terms') }}</span>
      </button>

      <button
        type="button"
        class="sm:flex-1 py-2.5 px-2 sm:px-3.5 rounded-xl font-mono text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer text-center"
        :class="activeTab === 'contact'
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/80 dark:border-white/10'
          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5'"
        @click="setTab('contact')"
      >
        <UIcon
          name="i-lucide-mail"
          class="size-4 text-emerald-500 shrink-0"
        />
        <span class="truncate">{{ $t('legal.tab_contact') }}</span>
      </button>
    </div>

    <LegalImprintTab v-if="activeTab === 'imprint'" />
    <LegalPrivacyTab v-else-if="activeTab === 'privacy'" />
    <LegalTermsTab v-else-if="activeTab === 'terms'" />
    <LegalContactTab
      v-else-if="activeTab === 'contact'"
      @switch-to-privacy-tab="setTab('privacy')"
    />
  </div>
</template>
