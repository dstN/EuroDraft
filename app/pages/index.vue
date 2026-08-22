<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="hero-safe flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
    <!-- Background: radial glow orbs -->
    <div
      class="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <div
        class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
        style="background: radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)"
      />
      <div
        class="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
        style="background: radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-xl mx-auto space-y-8">
      <!-- Eyebrow -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-[11px] uppercase tracking-[0.18em] font-medium">
        <UIcon
          name="i-lucide-trophy"
          class="size-3"
        />
        Euro 1960 — 2024
      </div>

      <!-- Headline -->
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white">
        {{ $t('landing.headline') }}
      </h1>

      <p class="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-[55ch] mx-auto">
        {{ $t('landing.subline') }}
      </p>

      <!-- CTA -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <UButton
          to="/draft/formation"
          size="lg"
          color="primary"
          class="w-full sm:w-auto font-semibold px-8"
          :label="$t('landing.cta_start')"
          trailing-icon="i-lucide-arrow-right"
        />
        <UButton
          size="lg"
          color="neutral"
          variant="ghost"
          class="w-full sm:w-auto"
          :label="$t('landing.cta_learn')"
        />
      </div>
    </div>

    <!-- How It Works — 3 steps -->
    <div class="relative z-10 mt-24 w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="(step, i) in [
          { icon: 'i-lucide-layout-grid', title: $t('landing.step1_title'), desc: $t('landing.step1_desc') },
          { icon: 'i-lucide-dices', title: $t('landing.step2_title'), desc: $t('landing.step2_desc') },
          { icon: 'i-lucide-swords', title: $t('landing.step3_title'), desc: $t('landing.step3_desc') }
        ]"
        :key="i"
        class="rounded-2xl border border-white/8 p-5 text-left"
        style="background: rgba(255,255,255,0.03)"
      >
        <!-- Double-bezel step icon -->
        <div class="mb-4 size-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
          <UIcon
            :name="step.icon"
            class="size-5 text-primary-400"
          />
        </div>
        <p class="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">
          Step {{ i + 1 }}
        </p>
        <h3 class="font-semibold text-white mb-1.5 text-sm">
          {{ step.title }}
        </h3>
        <p class="text-zinc-400 text-xs leading-relaxed">
          {{ step.desc }}
        </p>
      </div>
    </div>
  </div>
</template>
