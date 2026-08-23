<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'icon' | 'horizontal' | 'loader' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  loop?: boolean
}>(), {
  variant: 'horizontal',
  size: 'md',
  animated: true,
  loop: false
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
  if (props.variant === 'loader') {
    switch (props.size) {
      case 'sm': return 'w-48'
      case 'md': return 'w-64'
      case 'lg': return 'w-80'
      case 'xl': return 'w-96'
      default: return 'w-64'
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
    class="inline-flex items-center justify-center select-none"
    :class="sizeClasses"
  >
    <!-- ============================================================ -->
    <!-- Variant: ICON (Layered Gold & Green Cards with Wrappers)     -->
    <!-- ============================================================ -->
    <svg
      v-if="variant === 'icon'"
      viewBox="0 0 240 240"
      class="w-full h-full drop-shadow-md overflow-visible group"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="appLogoGreenGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#10b981"
          />
          <stop
            offset="50%"
            stop-color="#059669"
          />
          <stop
            offset="100%"
            stop-color="#047857"
          />
        </linearGradient>
        <linearGradient
          id="appLogoGoldGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#fbbf24"
          />
          <stop
            offset="50%"
            stop-color="#f59e0b"
          />
          <stop
            offset="100%"
            stop-color="#d97706"
          />
        </linearGradient>
        <filter
          id="appLogoShadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="2"
            dy="6"
            stdDeviation="4"
            flood-color="#000000"
            flood-opacity="0.35"
          />
        </filter>
      </defs>

      <g transform="translate(120, 120)">
        <!-- Gold Card Wrapper -->
        <g :class="[animated ? 'anim-wrap-gold' : '', loop ? 'anim-pulse-gold' : '']">
          <g
            transform="rotate(-12) translate(-22, -12)"
            filter="url(#appLogoShadow)"
          >
            <rect
              x="-44"
              y="-62"
              width="88"
              height="124"
              rx="10"
              fill="url(#appLogoGoldGrad)"
            />
            <line
              x1="-30"
              y1="-38"
              x2="30"
              y2="-38"
              stroke="#060b10"
              stroke-width="3"
              stroke-linecap="round"
              opacity="0.35"
            />
            <line
              x1="-30"
              y1="-22"
              x2="8"
              y2="-22"
              stroke="#060b10"
              stroke-width="3"
              stroke-linecap="round"
              opacity="0.35"
            />
          </g>
        </g>

        <!-- Green Card Wrapper -->
        <g :class="[animated ? 'anim-wrap-green' : '', loop ? 'anim-pulse-green' : '']">
          <g
            transform="rotate(8) translate(16, 8)"
            filter="url(#appLogoShadow)"
          >
            <rect
              x="-44"
              y="-62"
              width="88"
              height="124"
              rx="10"
              fill="url(#appLogoGreenGrad)"
            />
            <polygon
              points="0,-25 7,-10 24,-7 12,4 15,20 0,12 -15,20 -12,4 -24,-7 -7,-10"
              fill="#060b10"
              transform="translate(0, 4) scale(1.15)"
            />
          </g>
        </g>
      </g>
    </svg>

    <!-- ============================================================ -->
    <!-- Variant: HORIZONTAL (Animated Icon Mark + Typography for Nav) -->
    <!-- ============================================================ -->
    <div
      v-else-if="variant === 'horizontal'"
      class="flex items-center gap-2 group shrink-0"
    >
      <!-- Dual Card Icon with Isolated Animation Wrappers -->
      <div class="size-7 sm:size-8 shrink-0 relative flex items-center justify-center">
        <svg
          viewBox="0 0 240 240"
          class="w-full h-full drop-shadow-md overflow-visible group-hover:scale-105 transition-transform duration-300"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="appLogoGreenGradH"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stop-color="#10b981"
              />
              <stop
                offset="50%"
                stop-color="#059669"
              />
              <stop
                offset="100%"
                stop-color="#047857"
              />
            </linearGradient>
            <linearGradient
              id="appLogoGoldGradH"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stop-color="#fbbf24"
              />
              <stop
                offset="50%"
                stop-color="#f59e0b"
              />
              <stop
                offset="100%"
                stop-color="#d97706"
              />
            </linearGradient>
            <filter
              id="appLogoShadowH"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="2"
                dy="5"
                stdDeviation="4"
                flood-color="#000000"
                flood-opacity="0.3"
              />
            </filter>
          </defs>

          <g transform="translate(120, 120)">
            <g :class="animated ? 'anim-wrap-gold' : ''">
              <g
                transform="rotate(-12) translate(-22, -12)"
                filter="url(#appLogoShadowH)"
              >
                <rect
                  x="-44"
                  y="-62"
                  width="88"
                  height="124"
                  rx="10"
                  fill="url(#appLogoGoldGradH)"
                />
                <line
                  x1="-30"
                  y1="-38"
                  x2="30"
                  y2="-38"
                  stroke="#060b10"
                  stroke-width="3"
                  stroke-linecap="round"
                  opacity="0.35"
                />
                <line
                  x1="-30"
                  y1="-22"
                  x2="8"
                  y2="-22"
                  stroke="#060b10"
                  stroke-width="3"
                  stroke-linecap="round"
                  opacity="0.35"
                />
              </g>
            </g>

            <g :class="animated ? 'anim-wrap-green' : ''">
              <g
                transform="rotate(8) translate(16, 8)"
                filter="url(#appLogoShadowH)"
              >
                <rect
                  x="-44"
                  y="-62"
                  width="88"
                  height="124"
                  rx="10"
                  fill="url(#appLogoGreenGradH)"
                />
                <polygon
                  points="0,-25 7,-10 24,-7 12,4 15,20 0,12 -15,20 -12,4 -24,-7 -7,-10"
                  fill="#060b10"
                  transform="translate(0, 4) scale(1.15)"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <!-- Animated Typography -->
      <div class="flex flex-col leading-none">
        <span class="font-black text-base sm:text-lg tracking-tight flex items-center">
          <span
            class="text-zinc-900 dark:text-white"
            :class="animated ? 'anim-text-euro' : ''"
          >
            Euro
          </span>
          <span
            class="text-amber-500 dark:text-amber-400 font-black"
            :class="animated ? 'anim-text-draft' : ''"
          >
            Draft
          </span>
        </span>
        <span
          class="hidden sm:inline-block text-[8px] font-mono uppercase tracking-[0.25em] font-bold text-emerald-800 dark:text-emerald-400 mt-0.5"
          :class="animated ? 'anim-slogan' : ''"
        >
          Build Your Legacy
        </span>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Variant: LOADER (Cards + EuroDraft Text without Slogan)      -->
    <!-- ============================================================ -->
    <div
      v-else-if="variant === 'loader'"
      class="flex flex-col items-center justify-center gap-6 text-center"
    >
      <div class="size-36 sm:size-44 relative flex items-center justify-center">
        <svg
          viewBox="0 0 240 240"
          class="w-full h-full drop-shadow-2xl overflow-visible loader-glow"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="appLogoGreenGradL"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stop-color="#10b981"
              />
              <stop
                offset="50%"
                stop-color="#059669"
              />
              <stop
                offset="100%"
                stop-color="#047857"
              />
            </linearGradient>
            <linearGradient
              id="appLogoGoldGradL"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stop-color="#fbbf24"
              />
              <stop
                offset="50%"
                stop-color="#f59e0b"
              />
              <stop
                offset="100%"
                stop-color="#d97706"
              />
            </linearGradient>
            <filter
              id="appLogoShadowL"
              x="-35%"
              y="-35%"
              width="170%"
              height="170%"
            >
              <feDropShadow
                dx="3"
                dy="8"
                stdDeviation="6"
                flood-color="#000000"
                flood-opacity="0.5"
              />
            </filter>
          </defs>

          <g transform="translate(120, 120)">
            <g class="anim-wrap-gold">
              <g
                transform="rotate(-12) translate(-22, -12)"
                filter="url(#appLogoShadowL)"
              >
                <rect
                  x="-44"
                  y="-62"
                  width="88"
                  height="124"
                  rx="10"
                  fill="url(#appLogoGoldGradL)"
                />
                <line
                  x1="-30"
                  y1="-38"
                  x2="30"
                  y2="-38"
                  stroke="#060b10"
                  stroke-width="3"
                  stroke-linecap="round"
                  opacity="0.35"
                />
                <line
                  x1="-30"
                  y1="-22"
                  x2="8"
                  y2="-22"
                  stroke="#060b10"
                  stroke-width="3"
                  stroke-linecap="round"
                  opacity="0.35"
                />
              </g>
            </g>

            <g class="anim-wrap-green">
              <g
                transform="rotate(8) translate(16, 8)"
                filter="url(#appLogoShadowL)"
              >
                <rect
                  x="-44"
                  y="-62"
                  width="88"
                  height="124"
                  rx="10"
                  fill="url(#appLogoGreenGradL)"
                />
                <polygon
                  points="0,-25 7,-10 24,-7 12,4 15,20 0,12 -15,20 -12,4 -24,-7 -7,-10"
                  fill="#060b10"
                  transform="translate(0, 4) scale(1.15)"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <div class="flex items-center text-3xl sm:text-5xl font-black tracking-tight leading-none">
        <span class="text-zinc-900 dark:text-white anim-text-euro">Euro</span>
        <span class="text-amber-500 dark:text-amber-400 anim-text-draft">Draft</span>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Variant: FULL (Complete Standalone Vector SVG)               -->
    <!-- ============================================================ -->
    <div
      v-else-if="variant === 'full'"
      class="w-full max-w-lg mx-auto"
    >
      <img
        src="/logo.svg"
        alt="EuroDraft — Build Your Legacy"
        class="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
      >
    </div>
  </div>
</template>

<style scoped>
/* Entrance Animation Wrappers */
.anim-wrap-gold {
  opacity: 0;
  transform-origin: center;
  animation: foldInGold 0.85s cubic-bezier(0.25, 1.2, 0.5, 1) forwards;
}

.anim-wrap-green {
  opacity: 0;
  transform-origin: center;
  animation: foldInGreen 0.85s cubic-bezier(0.25, 1.2, 0.5, 1) 0.15s forwards;
}

.anim-text-euro {
  display: inline-block;
  opacity: 0;
  animation: slideLeft 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.45s forwards;
}

.anim-text-draft {
  display: inline-block;
  opacity: 0;
  animation: slideRight 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.45s forwards;
}

.anim-slogan {
  display: inline-block;
  opacity: 0;
  animation: fadeInSlogan 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.8s forwards;
}

/* Keyframes */
@keyframes foldInGold {
  0% {
    transform: translateX(-40px) translateY(-15px) rotate(-20deg);
    opacity: 0;
  }
  100% {
    transform: translateX(0) translateY(0) rotate(0deg);
    opacity: 1;
  }
}

@keyframes foldInGreen {
  0% {
    transform: translateX(40px) translateY(15px) rotate(20deg);
    opacity: 0;
  }
  100% {
    transform: translateX(0) translateY(0) rotate(0deg);
    opacity: 1;
  }
}

@keyframes slideLeft {
  0% {
    transform: translateX(-20px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideRight {
  0% {
    transform: translateX(20px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInSlogan {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Subtle continuous breathing / glow for Loader */
.loader-glow {
  animation: loaderBreathing 2.4s ease-in-out infinite alternate;
}

@keyframes loaderBreathing {
  0% {
    filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.25)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.15));
    transform: scale(0.98);
  }
  100% {
    filter: drop-shadow(0 0 28px rgba(16, 185, 129, 0.5)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.35));
    transform: scale(1.02);
  }
}
</style>
