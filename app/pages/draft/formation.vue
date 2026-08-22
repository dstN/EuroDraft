<script setup lang="ts">
import { pickRandomFormations } from '~/composables/useFormations'
import type { Formation } from '~/types'
import MiniFormationPitch from '~/components/draft/MiniFormationPitch.vue'

definePageMeta({ layout: 'default' })
const draft = useDraftStore()

// Pick 3 random formations on mount
const formations = ref<Formation[]>(pickRandomFormations(3))

function selectFormation(f: Formation) {
  draft.selectFormation(f)
  navigateTo('/draft')
}
</script>

<template>
  <div class="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-6 py-12">
    <div class="w-full max-w-3xl mx-auto space-y-10">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {{ $t('formation.select_title') }}
        </h1>
        <p class="text-zinc-400 text-sm max-w-md mx-auto">
          {{ $t('formation.select_subtitle') }}
        </p>
      </div>

      <!-- Formation cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          v-for="formation in formations"
          :key="formation.id"
          class="group relative rounded-2xl border border-white/10 p-1.5 text-left transition-all duration-300 hover:border-primary-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] active:scale-[0.98] cursor-pointer"
          style="background: rgba(255,255,255,0.04)"
          @click="selectFormation(formation)"
        >
          <!-- Inner core (double-bezel) -->
          <div
            class="rounded-xl overflow-hidden p-4 space-y-3"
            style="background: rgba(255,255,255,0.03); box-shadow: inset 0 1px 1px rgba(255,255,255,0.06)"
          >
            <!-- Mini formation pitch (Issue #3: real player dots) -->
            <div
              class="relative rounded-lg overflow-hidden"
              style="height: 160px"
            >
              <MiniFormationPitch :formation="formation" />
              <!-- Formation label overlay at bottom -->
              <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-end justify-between">
                <span class="text-white font-black font-mono text-lg tracking-widest drop-shadow">
                  {{ formation.id }}
                </span>
                <div class="flex items-center gap-1 text-[9px] font-semibold">
                  <span class="inline-flex items-center gap-0.5 text-yellow-300">
                    <span class="size-2 rounded-full bg-yellow-400 inline-block" /> GK
                  </span>
                  <span class="inline-flex items-center gap-0.5 text-green-300">
                    <span class="size-2 rounded-full bg-green-400 inline-block" /> DEF
                  </span>
                  <span class="inline-flex items-center gap-0.5 text-orange-300">
                    <span class="size-2 rounded-full bg-orange-400 inline-block" /> MID
                  </span>
                  <span class="inline-flex items-center gap-0.5 text-red-300">
                    <span class="size-2 rounded-full bg-red-400 inline-block" /> FWD
                  </span>
                </div>
              </div>
            </div>

            <!-- Formation name -->
            <div>
              <p class="text-white font-semibold text-base">
                {{ formation.label }}
              </p>
            </div>

            <!-- CTA -->
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              block
              :label="$t('formation.confirm', { formation: formation.id })"
              trailing-icon="i-lucide-arrow-right"
              class="group-hover:bg-primary-500 group-hover:text-white transition-all"
            />
          </div>
        </button>
      </div>

      <!-- Re-draw option -->
      <div class="text-center">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          leading-icon="i-lucide-refresh-cw"
          label="Draw 3 new formations"
          @click="formations = pickRandomFormations(3)"
        />
      </div>
    </div>
  </div>
</template>
