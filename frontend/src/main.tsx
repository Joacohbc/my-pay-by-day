import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App.tsx'
import { initUserTimezone } from '@/lib/utils/dateUtils'
import { initUserLanguage } from '@/lib/i18n'
import { installErrorReporter } from '@/lib/errorReporter'
import { installRumReporter } from '@/lib/rumReporter'
import { initCurrency } from '@/lib/format'
import { configService } from '@/services/config.service'
import { logger } from '@/lib/logger'

initUserTimezone();
initUserLanguage();
installErrorReporter();
installRumReporter();

// Best-effort: the app is fully usable on the stored preference alone, so a server that is not
// reachable yet must not hold up the first render.
configService
  .get()
  .then((config) => initCurrency(config.defaultCurrency))
  .catch((error) => logger.child('bootstrap').debug('Server config unavailable, keeping stored currency', { error }));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
