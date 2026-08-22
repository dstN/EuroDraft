<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    country: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    rounded?: boolean
  }>(),
  {
    size: 'md',
    rounded: true
  }
)

const sizeClasses = {
  xs: 'size-4',
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-8',
  xl: 'size-12'
}

// Convert code like gb-eng, de, es, su, cs, yu, cis to valid circle-flags icon name
const flagIcon = computed(() => {
  const code = (props.country || 'de').toLowerCase()
  if (code === 'cs') return 'i-circle-flags-cz'
  if (code === 'cis') return 'i-circle-flags-ru'
  return `i-circle-flags-${code}`
})
</script>

<template>
  <span
    class="inline-flex items-center justify-center shrink-0 select-none overflow-hidden"
    :class="[
      sizeClasses[size],
      rounded ? 'rounded-full' : 'rounded'
    ]"
    :title="country ? country.toUpperCase() : ''"
  >
    <UIcon
      :name="flagIcon"
      class="w-full h-full"
    />
  </span>
</template>
