import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/lib/i18n'
import '@/index.css'
import App from '@/App.tsx'
import { initUserTimezone } from '@/lib/utils/dateUtils'

initUserTimezone();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
