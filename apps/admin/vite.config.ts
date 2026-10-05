import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_ADMIN_BASE || '/',
  plugins: [react()],
  server: {
    proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true } },
    port: 5174,
    host: true,
  },
});
