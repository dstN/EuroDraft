<script setup lang="ts">
definePageMeta({
  middleware: [
    () => navigateTo('/legal', { redirectCode: 301 })
  ]
})
</script>

<template>
  <div class="p-8 text-center">
    <p class="text-sm font-mono text-zinc-500">
      Redirecting to /legal...
    </p>
  </div>
</template>
