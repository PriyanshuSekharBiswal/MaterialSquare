import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_ADMIN_BASE || '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true },
      // Serve local S3Mock assets through the storefront's trusted HTTPS host.
      '/material-square-assets': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: true,
      },
    },
    port: 5174,
    strictPort: true,
    host: true,
  },
});
