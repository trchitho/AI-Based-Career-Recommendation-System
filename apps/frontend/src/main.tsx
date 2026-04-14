import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/design-system.css'
import './styles/footer.css'
import './i18n/config'
import { AppSettingsProvider } from './contexts/AppSettingsContext'

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
