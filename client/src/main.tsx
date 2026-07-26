import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import {
  notifyPwaNeedRefresh,
  setPwaUpdateHandler,
  startPwaResumeUpdateChecks,
} from './lib/pwaUpdate'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    notifyPwaNeedRefresh()
  },
})

setPwaUpdateHandler(updateSW)
startPwaResumeUpdateChecks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
