import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const captchaCompatibleLocalHost = 'material-square.localtest.me:5173'

function redirectLocalhostForCaptcha() {
  return {
    name: 'redirect-localhost-for-captcha',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || ''
        const port = host.match(/:(\d+)$/)?.[1]
        const hostname = host
          .replace(/:\d+$/, '')
          .replace(/^\[|\]$/g, '')

        if (port !== '5173' || !['localhost', '127.0.0.1', '::1'].includes(hostname)) {
          next()
          return
        }

        res.statusCode = 302
        res.setHeader(
          'Location',
          `http://${captchaCompatibleLocalHost}${req.url || '/'}`,
        )
        res.end()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), redirectLocalhostForCaptcha()],
  server: {
    allowedHosts: ['material-square.localtest.me'],
    proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000', changeOrigin: true } },
    port: 5173,
    host: true,
  },
})
