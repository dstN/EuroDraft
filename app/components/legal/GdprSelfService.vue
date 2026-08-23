<script setup lang="ts">
interface MyShareItem {
  id: string
  teamName: string
  createdAt: string
}

const { t } = useI18n()

// Local dev origins are shared across every project running on localhost, so a
// different project's dev server can leave its own keys sitting in the SAME
// origin's storage (e.g. "vsgraph-theme"). This page's whole point is telling
// the user what EuroDraft itself stores, so it must only ever read/export/wipe
// keys EuroDraft actually owns -- never the full, unscoped localStorage/sessionStorage.
const EURODRAFT_STORAGE_PREFIX = 'eurodraft_'
const EURODRAFT_EXTRA_KEYS = new Set(['nuxt-color-mode']) // Nuxt's own un-prefixed key for this app's theme toggle

function isEuroDraftStorageKey(key: string): boolean {
  return key.startsWith(EURODRAFT_STORAGE_PREFIX) || EURODRAFT_EXTRA_KEYS.has(key)
}

// Reactive storage state
const localKeys = ref<Array<{ key: string, size: number, value: string }>>([])
const totalStorageBytes = ref(0)
const myShares = ref<MyShareItem[]>([])
const manualShareInput = ref('')
const isExporting = ref(false)
const isDeletingServer = ref(false)
const actionMessage = ref<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

function scanBrowserStorage() {
  if (typeof window === 'undefined') return

  const keys: Array<{ key: string, size: number, value: string }> = []
  let totalBytes = 0

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isEuroDraftStorageKey(key)) {
      const val = localStorage.getItem(key) || ''
      const size = new Blob([key + val]).size
      totalBytes += size
      keys.push({ key, size, value: val })
    }
  }

  localKeys.value = keys
  totalStorageBytes.value = totalBytes

  try {
    const rawShares = localStorage.getItem('eurodraft_my_shares')
    if (rawShares) {
      myShares.value = JSON.parse(rawShares)
    } else {
      myShares.value = []
    }
  } catch {
    myShares.value = []
  }
}

onMounted(() => {
  scanBrowserStorage()
})

async function handleExportData() {
  isExporting.value = true
  actionMessage.value = null

  try {
    // Gather all local storage items
    const clientData: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && isEuroDraftStorageKey(k)) {
        try {
          clientData[k] = JSON.parse(localStorage.getItem(k) || '')
        } catch {
          clientData[k] = localStorage.getItem(k)
        }
      }
    }

    // Query server for any shared run records
    const shareIds = myShares.value.map(s => s.id)
    const serverRes = await $fetch<{
      success: boolean
      timestamp: string
      legalBasis: string
      dataController: Record<string, string>
      serverStoredRecords: Record<string, unknown>[]
    }>('/api/gdpr/export', {
      method: 'POST',
      body: { shareIds }
    }).catch(() => null)

    const exportBundle = {
      title: 'EuroDraft Personal Data Export (DSGVO / GDPR Art. 15)',
      exportDate: new Date().toISOString(),
      legalBasis: 'Art. 15 & 20 DSGVO / GDPR',
      dataController: serverRes?.dataController || {
        name: 'Dustin Tramm',
        address: 'c/o Impressumservice Dein-Impressum, Stettiner Str. 41, 35410 Hungen, Deutschland',
        email: 'info@rntm.de'
      },
      browserLocalStorage: clientData,
      serverSharedRecords: serverRes?.serverStoredRecords || [],
      notice: 'EuroDraft does not track personal IP profiles, advertising cookies, or user accounts. All gameplay state resides on your device.'
    }

    // Trigger client-side JSON download
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eurodraft-gdpr-data-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    actionMessage.value = {
      type: 'success',
      text: t('legal.gdpr_export_success', 'Your personal data export was downloaded successfully.')
    }
  } catch {
    actionMessage.value = {
      type: 'error',
      text: t('legal.gdpr_export_error', 'Failed to generate data export. Please try again.')
    }
  } finally {
    isExporting.value = false
  }
}

async function handleDeleteShareId(id: string) {
  if (!id) return
  isDeletingServer.value = true
  actionMessage.value = null

  try {
    const cleanId = id.trim().replace(/^https?:\/\/ed\.rntm\.de\/r\//, '')
    const res = await $fetch<{ success: boolean, message: string }>(`/api/share/${cleanId}`, {
      method: 'DELETE'
    })

    // Remove from local tracking
    myShares.value = myShares.value.filter(s => s.id !== cleanId)
    localStorage.setItem('eurodraft_my_shares', JSON.stringify(myShares.value))
    localStorage.removeItem(`eurodraft_shared_${cleanId}`)
    scanBrowserStorage()

    actionMessage.value = {
      type: 'success',
      text: res.message || `Shared run "${cleanId}" was permanently deleted from the server.`
    }
    manualShareInput.value = ''
  } catch (err: unknown) {
    const errorMsg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not find or delete this shared run record from the server.'
    actionMessage.value = {
      type: 'error',
      text: errorMsg
    }
  } finally {
    isDeletingServer.value = false
  }
}

function handleWipeLocalStorage() {
  if (typeof window === 'undefined') return
  if (!confirm(t('legal.gdpr_wipe_confirm', 'Are you sure you want to delete all local EuroDraft data, saved formations, and preferences from this device?'))) {
    return
  }

  // Remove only EuroDraft's own keys -- never a blanket clear(), which would also
  // wipe unrelated data any other site/app happens to share this origin with.
  for (const store of [localStorage, sessionStorage]) {
    const keysToRemove: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k && isEuroDraftStorageKey(k)) keysToRemove.push(k)
    }
    keysToRemove.forEach(k => store.removeItem(k))
  }
  scanBrowserStorage()

  actionMessage.value = {
    type: 'success',
    text: t('legal.gdpr_wipe_success', 'All local storage and browser state have been permanently wiped from this device.')
  }
}
</script>

<template>
  <div class="surface-card p-6 sm:p-8 space-y-6 border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent rounded-2xl">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-white/10">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <UIcon
            name="i-lucide-shield-check"
            class="size-5"
          />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
            {{ $t('legal.gdpr_portal_title') }}
          </h2>
          <p class="text-xs text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.gdpr_portal_subtitle') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40">
          <span class="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {{ $t('legal.gdpr_zero_trackers') }}
        </span>
      </div>
    </div>

    <!-- Alert / Status message -->
    <div
      v-if="actionMessage"
      class="p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5"
      :class="actionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800'"
    >
      <UIcon
        :name="actionMessage.type === 'success' ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
        class="size-5 shrink-0 mt-0.5"
      />
      <span>{{ actionMessage.text }}</span>
    </div>

    <!-- Live Storage Inventory -->
    <div class="space-y-3">
      <div class="flex items-center justify-between text-xs sm:text-sm">
        <span class="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <UIcon
            name="i-lucide-hard-drive"
            class="size-4 text-emerald-500"
          />
          {{ $t('legal.gdpr_inventory_title') }}
        </span>
        <span class="text-zinc-700 dark:text-zinc-300 font-mono text-xs">
          {{ localKeys.length }} {{ $t('legal.gdpr_keys_count') }} ({{ (totalStorageBytes / 1024).toFixed(1) }} KB)
        </span>
      </div>

      <div class="bg-zinc-50 dark:bg-black/40 p-4 rounded-xl border border-zinc-200 dark:border-white/5 space-y-2">
        <div
          v-if="localKeys.length === 0"
          class="text-xs text-zinc-700 dark:text-zinc-300 italic"
        >
          {{ $t('legal.gdpr_no_local_data') }}
        </div>
        <div
          v-else
          class="flex flex-wrap gap-1.5"
        >
          <span
            v-for="item in localKeys"
            :key="item.key"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-700 dark:text-zinc-300"
          >
            <span class="text-emerald-700 dark:text-emerald-400 font-semibold">{{ item.key }}</span>
            <span class="text-zinc-600 dark:text-zinc-400 text-[10px]">({{ item.size }}B)</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Action Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      <!-- 1. Right to Access / Export (Art. 15 & 20) -->
      <div class="p-4 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/5 flex flex-col justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-download"
              class="size-4 text-emerald-500"
            />
            <h3 class="text-sm font-bold text-zinc-900 dark:text-white">
              {{ $t('legal.gdpr_export_title') }}
            </h3>
          </div>
          <p class="text-xs text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.gdpr_export_desc') }}
          </p>
        </div>

        <button
          type="button"
          :disabled="isExporting"
          class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          @click="handleExportData"
        >
          <UIcon
            v-if="isExporting"
            name="i-lucide-loader-2"
            class="size-3.5 animate-spin"
          />
          <UIcon
            v-else
            name="i-lucide-file-json"
            class="size-3.5"
          />
          <span>{{ isExporting ? $t('legal.gdpr_exporting') : $t('legal.gdpr_export_btn') }}</span>
        </button>
      </div>

      <!-- 2. Local Erasure (Art. 17) -->
      <div class="p-4 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/5 flex flex-col justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-trash-2"
              class="size-4 text-rose-500"
            />
            <h3 class="text-sm font-bold text-zinc-900 dark:text-white">
              {{ $t('legal.gdpr_wipe_local_title') }}
            </h3>
          </div>
          <p class="text-xs text-zinc-700 dark:text-zinc-300">
            {{ $t('legal.gdpr_wipe_local_desc') }}
          </p>
        </div>

        <button
          type="button"
          class="w-full py-2 px-3 rounded-lg bg-zinc-200 hover:bg-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-600 text-zinc-800 hover:text-white dark:text-zinc-200 dark:hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          @click="handleWipeLocalStorage"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="size-3.5"
          />
          <span>{{ $t('legal.gdpr_wipe_local_btn') }}</span>
        </button>
      </div>
    </div>

    <!-- 3. Server-Side Shared Run Deletion (Art. 17) -->
    <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-server"
          class="size-4 text-emerald-500"
        />
        <h3 class="text-sm font-bold text-zinc-900 dark:text-white">
          {{ $t('legal.gdpr_server_shares_title') }}
        </h3>
      </div>
      <p class="text-xs text-zinc-700 dark:text-zinc-300">
        {{ $t('legal.gdpr_server_shares_desc') }}
      </p>

      <!-- Tracked shares on this device -->
      <div
        v-if="myShares.length > 0"
        class="space-y-2"
      >
        <div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {{ $t('legal.gdpr_my_shares_heading') }}:
        </div>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <div
            v-for="item in myShares"
            :key="item.id"
            class="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-white/5 text-xs"
          >
            <div class="flex flex-col">
              <span class="font-bold text-zinc-900 dark:text-white">{{ item.teamName }}</span>
              <span class="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">ID: {{ item.id }} · {{ new Date(item.createdAt).toLocaleDateString() }}</span>
            </div>
            <button
              type="button"
              :disabled="isDeletingServer"
              class="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              @click="handleDeleteShareId(item.id)"
            >
              <UIcon
                name="i-lucide-trash-2"
                class="size-3"
              />
              <span>{{ $t('legal.gdpr_delete_btn') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Manual Share ID Input Deletion -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2">
        <input
          v-model="manualShareInput"
          type="text"
          :placeholder="$t('legal.gdpr_manual_share_placeholder', 'Enter Share ID (e.g. k8s9f2ja) or URL to delete...')"
          class="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
        >
        <button
          type="button"
          :disabled="!manualShareInput.trim() || isDeletingServer"
          class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
          @click="handleDeleteShareId(manualShareInput)"
        >
          <UIcon
            v-if="isDeletingServer"
            name="i-lucide-loader-2"
            class="size-3.5 animate-spin"
          />
          <UIcon
            v-else
            name="i-lucide-trash-2"
            class="size-3.5"
          />
          <span>{{ $t('legal.gdpr_delete_record_btn') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
