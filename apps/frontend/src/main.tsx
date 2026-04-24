import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/design-system.css'
import './styles/footer.css'
import './styles/neumorphic.css'
import './styles/global-ui.css'
import './i18n/config'
import { AppSettingsProvider } from './contexts/AppSettingsContext'
import { APP_THEMES, applyTheme } from './hooks/useAppTheme'

// Apply saved theme before first render to avoid flash
const savedThemeId = localStorage.getItem('app-theme') || 'default';
const savedTheme = APP_THEMES.find(t => t.id === savedThemeId) ?? APP_THEMES[0];
applyTheme(savedTheme);

// Only use StrictMode in development for debugging, remove in production to prevent duplicate API calls
const isDevelopment = import.meta.env.DEV;

const AppWrapper = () => (
  <AppSettingsProvider>
    <App />
  </AppSettingsProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  isDevelopment ? (
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  ) : (
    <AppWrapper />
  )
)
