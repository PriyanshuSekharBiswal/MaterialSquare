import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installScrollPositionPersistence, restoreInitialScrollPosition } from './scroll-position'

installScrollPositionPersistence()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
restoreInitialScrollPosition()
