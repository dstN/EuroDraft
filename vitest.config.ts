import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts']
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '#imports': resolve(__dirname, './app/composables/index.ts')
    }
  }
})
