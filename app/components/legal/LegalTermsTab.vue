<template>
  <div class="space-y-6">
    <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
      <div>
        <h2 class="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <UIcon
            name="i-lucide-file-signature"
            class="size-5 text-emerald-500"
          />
          <span>{{ $t('legal.terms_scope_title') }}</span>
        </h2>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.terms_scope_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-gamepad-2"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.terms_gameplay_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.terms_gameplay_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-copyright"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.terms_ip_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.terms_ip_text') }}
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-2">
        <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-4 text-amber-500"
          />
          <span>{{ $t('legal.terms_liability_title') }}</span>
        </h3>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.terms_liability_text') }}
        </p>
      </div>
    </div>
  </div>
</template>
