import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Apply the persisted theme before React paints so light-theme users never
// see a dark-theme flash on first load (CLS / visual-consistency fix).
try {
  const initialTheme = localStorage.getItem('pulsetask_theme') || 'dark'
  document.documentElement.setAttribute('data-theme', initialTheme)
  document.documentElement.style.colorScheme = initialTheme === 'light' ? 'light' : 'dark'
} catch {
  document.documentElement.setAttribute('data-theme', 'dark')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
