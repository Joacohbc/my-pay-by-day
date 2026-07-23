import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { initUserTimezone } from '@/lib/utils/dateUtils'
import { initUserLanguage } from '@/lib/i18n'
import { installErrorReporter } from '@/lib/errorReporter'
import { installRumReporter } from '@/lib/rumReporter'

initUserTimezone();
initUserLanguage();
installErrorReporter();
installRumReporter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
