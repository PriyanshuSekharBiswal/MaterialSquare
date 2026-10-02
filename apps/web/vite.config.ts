import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true } },
    port: 5173,
    host: true,
  },
})
