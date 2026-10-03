import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyThemePref, readThemePref } from './lib/theme'

// Apply the saved appearance before the first paint to avoid a flash of the wrong theme.
applyThemePref(readThemePref())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
