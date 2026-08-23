<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
    <h1 class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
      {{ $t('legal.impressum_title') }}
    </h1>
    <p class="text-sm text-zinc-700 dark:text-zinc-300">
      {{ $t('legal.impressum_note') }}
    </p>

    <USeparator class="my-6" />

    <div class="surface-card p-6 sm:p-8 space-y-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
      <!-- Fill in with actual personal details -->
      <div>
        <p class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400 mb-2">
          Responsible for Content
        </p>
        <p>[Your Full Name]</p>
        <p>[Street Address]</p>
        <p>[ZIP City]</p>
        <p>[Country]</p>
      </div>

      <div>
        <p class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400 mb-2">
          Contact
        </p>
        <p>E-Mail: [your@email.com]</p>
      </div>

      <div>
        <p class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400 mb-2">
          Legal Notice / Rechtlicher Hinweis
        </p>
        <div class="space-y-3 text-zinc-700 dark:text-zinc-300">
          <p>
            <strong>Rechtlicher Hinweis:</strong> EuroDraft ist ein unabhängiges Simulationsspiel und ein reines Fan-Projekt. Alle Verweise auf spezifische Jahreszahlen, Nationalteams und historische Turnierdaten dienen ausschließlich der beschreibenden, historischen Information. Dieses Spiel steht in keiner Verbindung zu, wird nicht unterstützt von und ist nicht lizenziert durch die UEFA, die offiziellen UEFA EURO-Turniere oder die jeweiligen Fußballverbände.
          </p>
          <p>
            <strong>Legal Notice:</strong> EuroDraft is an independent simulation game and non-commercial fan project. All references to specific years, national teams, and historical tournament data are used solely for descriptive, historical purposes. This project is not affiliated with, endorsed by, or licensed by UEFA, official European Championship tournaments, or any national football associations.
          </p>
        </div>
      </div>

      <div>
        <p class="text-xs uppercase font-mono font-bold tracking-widest text-zinc-600 dark:text-zinc-400 mb-2">
          Data Protection
        </p>
        <p class="text-zinc-700 dark:text-zinc-300">
          This site does not collect any personal data, does not use cookies,
          and does not make any external network requests. No analytics are employed.
          All game logic runs entirely in your browser.
        </p>
      </div>
    </div>
  </div>
</template>
