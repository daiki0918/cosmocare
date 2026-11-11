import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import process from 'node:process'

export default defineConfig(() => ({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.COSMOCARE_API_PROXY_TARGET || 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
}))
