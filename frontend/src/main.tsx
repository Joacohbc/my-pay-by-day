import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { initUserTimezone } from '@/lib/utils/dateUtils'
import { initUserLanguage } from '@/lib/i18n'

initUserTimezone();
initUserLanguage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
