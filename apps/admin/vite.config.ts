import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const appRoot = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, appRoot, '');

  return {
    base: env.VITE_ADMIN_BASE || process.env.VITE_ADMIN_BASE || '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target:
            env.API_PROXY_TARGET ||
            process.env.API_PROXY_TARGET ||
            'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        // Serve local S3Mock assets through the storefront's trusted HTTPS origin.
        '/material-square-assets': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true,
        },
      },
      port: 5174,
      strictPort: true,
      host: true,
    },
  };
});
