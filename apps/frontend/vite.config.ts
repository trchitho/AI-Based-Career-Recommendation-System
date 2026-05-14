/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // 🔧 Kích hoạt plugin cho React
  resolve: {
    alias: {
      // Use ESM-safe path resolution (no __dirname in ESM)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000, // 🌐 Chạy server dev tại http://localhost:3000
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/bff': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
})

