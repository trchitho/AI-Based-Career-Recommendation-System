import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // 🔧 Kích hoạt plugin cho React
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 📁 Tạo alias '@' trỏ đến thư mục src
    },
  },
  server: {
    port: 3000, // 🌐 Chạy server dev tại http://localhost:3000
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // 🔄 Proxy API backend
        changeOrigin: true,
      },
    },
  },
})

