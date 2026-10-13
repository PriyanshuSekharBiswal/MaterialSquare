import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installScrollPositionPersistence, restoreInitialScrollPosition } from './scroll-position'

const localOtpOverride = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCALHOST_OTP_TESTS === 'true'
const localHttpsHostname = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const shouldUseCaptchaHostname = import.meta.env.DEV && !localOtpOverride && localHttpsHostname && window.location.port === '5175'

if (shouldUseCaptchaHostname) {
  const destination = new URL(window.location.href)
  destination.protocol = 'https:'
  destination.hostname = 'material-square.localtest.me'
  window.location.replace(destination.href)
} else {
  installScrollPositionPersistence()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  restoreInitialScrollPosition()
}
