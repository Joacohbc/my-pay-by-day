import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/i18n'
import '@/index.css'
import App from '@/App.tsx'
import { getUserTimezone } from '@/utils/dateUtils'

if (!localStorage.getItem('user-timezone')) {
  localStorage.setItem('user-timezone', getUserTimezone());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
