// Vitest config — separate from vite.config.js so it doesn't pollute the
// production bundle config. We pick up both src/**/*.test.js (unit tests
// next to the source) and root-level *.test.js (menu.test.js for main.js
// helpers), and explicitly exclude e2e/ so Playwright specs don't get
// swept in.
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: [
      'src/**/*.test.{js,jsx,mjs}',
      '*.test.{js,mjs}',
    ],
    exclude: [
      '**/node_modules/**',
      'e2e/**',
      'dist/**',
      'distribution/**',
      'web-dist/**',
      '.venv-build/**',
    ],
    environment: 'node',
  },
})
