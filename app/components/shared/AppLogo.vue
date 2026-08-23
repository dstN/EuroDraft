<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'icon' | 'horizontal' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}>(), {
  variant: 'horizontal',
  size: 'md',
  animated: true
})

const sizeClasses = computed(() => {
  if (props.variant === 'icon') {
    switch (props.size) {
      case 'sm': return 'size-7'
      case 'md': return 'size-9'
      case 'lg': return 'size-12'
      case 'xl': return 'size-16'
      default: return 'size-9'
    }
  }
  switch (props.size) {
    case 'sm': return 'h-7'
    case 'md': return 'h-9'
    case 'lg': return 'h-12'
    case 'xl': return 'h-16'
    default: return 'h-9'
  }
})
</script>

<template>
  <div
    class="inline-flex items-center select-none"
    :class="sizeClasses"
  >
    <!-- Variant: ICON (Layered Gold & Green Cards) -->
    <svg
      v-if="variant === 'icon'"
      viewBox="0 0 240 240"
      class="w-full h-full drop-shadow-md overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="appLogoGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="50%" stop-color="#059669" />
          <stop offset="100%" stop-color="#047857" />
        </linearGradient>
        <linearGradient id="appLogoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="50%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <filter id="appLogoShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="6" stdDeviation="4" flood-color="#000000" flood-opacity="0.35" />
        </filter>
      </defs>

      <g transform="translate(120, 120)">
        <!-- Gold Card (Back Left) -->
        <g
          transform="rotate(-12) translate(-22, -12)"
          filter="url(#appLogoShadow)"
          class="transition-transform duration-300 group-hover:rotate-[-16deg] group-hover:translate-x-[-26px]"
        >
          <rect x="-44" y="-62" width="88" height="124" rx="10" fill="url(#appLogoGoldGrad)" />
          <line x1="-30" y1="-38" x2="30" y2="-38" stroke="#060b10" stroke-width="3" stroke-linecap="round" opacity="0.35" />
          <line x1="-30" y1="-22" x2="8" y2="-22" stroke="#060b10" stroke-width="3" stroke-linecap="round" opacity="0.35" />
        </g>

        <!-- Green Card with Star (Front Right) -->
        <g
          transform="rotate(8) translate(16, 8)"
          filter="url(#appLogoShadow)"
          class="transition-transform duration-300 group-hover:rotate-[12deg] group-hover:translate-x-[20px]"
        >
          <rect x="-44" y="-62" width="88" height="124" rx="10" fill="url(#appLogoGreenGrad)" />
          <polygon
            points="0,-25 7,-10 24,-7 12,4 15,20 0,12 -15,20 -12,4 -24,-7 -7,-10"
            fill="#060b10"
            transform="translate(0, 4) scale(1.15)"
          />
        </g>
      </g>
    </svg>

    <!-- Variant: HORIZONTAL (Icon Mark + Typography for Navbars) -->
    <div
      v-else-if="variant === 'horizontal'"
      class="flex items-center gap-2.5 group"
    >
      <div class="size-8 shrink-0 relative flex items-center justify-center">
        <svg
          viewBox="0 0 240 240"
          class="w-full h-full drop-shadow-md overflow-visible group-hover:scale-105 transition-transform duration-300"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="appLogoGreenGradH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="50%" stop-color="#059669" />
              <stop offset="100%" stop-color="#047857" />
            </linearGradient>
            <linearGradient id="appLogoGoldGradH" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="50%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#d97706" />
            </linearGradient>
            <filter id="appLogoShadowH" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
            </filter>
          </defs>

          <g transform="translate(120, 120)">
            <g
              transform="rotate(-12) translate(-22, -12)"
              filter="url(#appLogoShadowH)"
            >
              <rect x="-44" y="-62" width="88" height="124" rx="10" fill="url(#appLogoGoldGradH)" />
              <line x1="-30" y1="-38" x2="30" y2="-38" stroke="#060b10" stroke-width="3" stroke-linecap="round" opacity="0.35" />
              <line x1="-30" y1="-22" x2="8" y2="-22" stroke="#060b10" stroke-width="3" stroke-linecap="round" opacity="0.35" />
            </g>

            <g
              transform="rotate(8) translate(16, 8)"
              filter="url(#appLogoShadowH)"
            >
              <rect x="-44" y="-62" width="88" height="124" rx="10" fill="url(#appLogoGreenGradH)" />
              <polygon
                points="0,-25 7,-10 24,-7 12,4 15,20 0,12 -15,20 -12,4 -24,-7 -7,-10"
                fill="#060b10"
                transform="translate(0, 4) scale(1.15)"
              />
            </g>
          </g>
        </svg>
      </div>

      <div class="flex flex-col leading-none">
        <span class="font-black text-lg tracking-tight flex items-center">
          <span class="text-zinc-900 dark:text-white">Euro</span>
          <span class="text-amber-600 dark:text-amber-400 font-black">Draft</span>
        </span>
        <span class="text-[8px] font-mono uppercase tracking-[0.25em] font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">
          Build Your Legacy
        </span>
      </div>
    </div>

    <!-- Variant: FULL (Complete Standalone Banner / Poster) -->
    <div
      v-else-if="variant === 'full'"
      class="w-full max-w-lg mx-auto"
    >
      <img
        src="/logo.svg"
        alt="EuroDraft — Build Your Legacy"
        class="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
      />
    </div>
  </div>
</template>
