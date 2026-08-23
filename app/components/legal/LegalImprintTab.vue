<template>
  <div class="space-y-6">
    <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
      <div>
        <h2 class="text-base font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <UIcon
            name="i-lucide-building"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.imprint_provider_title') }}</span>
        </h2>
        <div class="font-mono text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5 bg-zinc-50 dark:bg-black/30 p-4 rounded-xl border border-zinc-200 dark:border-white/5">
          <p class="font-bold text-zinc-900 dark:text-white">
            Dustin Tramm
          </p>
          <p>c/o Impressumservice Dein-Impressum</p>
          <p>Stettiner Str. 41</p>
          <p>35410 Hungen</p>
          <p>Deutschland / Germany</p>
        </div>
      </div>

      <div>
        <h2 class="text-base font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <UIcon
            name="i-lucide-mail"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.imprint_contact_title') }}</span>
        </h2>
        <p class="text-zinc-700 dark:text-zinc-300">
          E-Mail: <a
            href="mailto:info@rntm.de"
            class="text-emerald-900 dark:text-emerald-300 font-bold hover:underline"
          >info@rntm.de</a>
        </p>
        <p class="text-zinc-700 dark:text-zinc-300 mt-1">
          Website: <a
            href="https://ed.rntm.de"
            class="text-emerald-900 dark:text-emerald-300 font-bold hover:underline"
          >https://ed.rntm.de</a>
        </p>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
        <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-info"
            class="size-4 text-amber-500"
          />
          <span>{{ $t('legal.disclaimer_title') }}</span>
        </h2>
        <div class="space-y-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            {{ $t('legal.disclaimer_text_1') }}
          </p>
          <p>
            {{ $t('legal.disclaimer_text_2') }}
          </p>
        </div>
      </div>

      <div class="pt-4 border-t border-zinc-200 dark:border-white/5 space-y-3">
        <h2 class="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <UIcon
            name="i-lucide-shield-alert"
            class="size-4 text-emerald-500"
          />
          <span>{{ $t('legal.liability_content_title') }}</span>
        </h2>
        <p class="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          {{ $t('legal.liability_content_text') }}
        </p>
      </div>
    </div>
  </div>
</template>
