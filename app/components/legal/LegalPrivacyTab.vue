<template>
  <div class="space-y-6">
    <!-- Automated GDPR Self-Service Portal (Art. 15 / 17 DSGVO) -->
    <LegalGdprSelfService />

    <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
      <div>
        <h2 class="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <UIcon
            name="i-lucide-user-check"
            class="size-5 text-emerald-500"
          />
          <span>{{ $t('legal.privacy_controller_title') }}</span>
        </h2>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          {{ $t('legal.privacy_controller_text') }}
        </p>
        <div class="font-mono text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-black/30 p-3.5 rounded-xl border border-zinc-200 dark:border-white/5">
          <p class="font-bold text-zinc-900 dark:text-white">
            Dustin Tramm
          </p>
          <p>c/o Impressumservice Dein-Impressum</p>
          <p>Stettiner Str. 41, 35410 Hungen, Deutschland</p>
          <p>E-Mail: info@rntm.de</p>
        </div>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-hard-drive"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.privacy_localstorage_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.privacy_localstorage_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-share-2"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.privacy_sharing_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.privacy_sharing_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-server"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.privacy_serverlogs_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.privacy_serverlogs_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-check-circle-2"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.privacy_rights_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.privacy_rights_text') }}
        </p>
      </div>
    </div>
  </div>
</template>
