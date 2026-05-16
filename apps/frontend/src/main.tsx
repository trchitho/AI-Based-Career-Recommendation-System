import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/neumorphic.css'
import './i18n/config'
import { AppSettingsProvider } from './contexts/AppSettingsContext'

// Apply saved theme before first render to avoid flash
const STORAGE_KEY = 'app-theme';

// Sửa URL cũ /learning_path/* sang /learning-path/* trước khi React Router boot
// (tránh trang trắng khi user gõ tay hoặc bookmark sai)
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/learning_path')) {
  const newPath = window.location.pathname.replace(/^\/learning_path/, '/learning-path');
  window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
}
const LEGACY_THEME_MAP: Record<string, 'light' | 'dark'> = {
  'default': 'light',
  'cream': 'light',
  'sakura': 'light',
  'forest': 'light',
  'sunset': 'light',
  'arctic': 'light',
  'midnight': 'dark',
  'ocean': 'dark',
  'neon': 'dark',
};

const THEME_CONFIGS = {
  light: {
    '--neu-bg': '#eef0f5',
    '--neu-bg-card': '#eceef4',
    '--neu-shadow-dark': '#c5c8d2',
    '--neu-shadow-light': '#ffffff',
    '--neu-accent': '#16a34a',
    '--neu-btn-text': '#ffffff',
    '--neu-text': '#1f2937',
    '--neu-text-muted': '#6b7280',
  },
  dark: {
    '--neu-bg': '#0f172a',
    '--neu-bg-card': '#1e293b',
    '--neu-shadow-dark': '#090e1a',
    '--neu-shadow-light': '#1c2d47',
    '--neu-accent': '#60a5fa',
    '--neu-btn-text': '#0f172a',
    '--neu-text': '#e2e8f0',
    '--neu-text-muted': '#94a3b8',
  },
};

function normalizeThemeValue(value: string | null): 'light' | 'dark' {
  if (!value) return 'light';
  if (value === 'light' || value === 'dark') return value;
  return LEGACY_THEME_MAP[value] || 'light';
}

const savedValue = localStorage.getItem(STORAGE_KEY);
const mode = normalizeThemeValue(savedValue);
const themeVars = THEME_CONFIGS[mode];

// Apply theme variables
const root = document.documentElement;
Object.entries(themeVars).forEach(([key, val]) => {
  root.style.setProperty(key, val);
});
root.setAttribute('data-theme', mode);
if (mode === 'dark') {
  root.classList.add('dark');
} else {
  root.classList.remove('dark');
}
document.body.style.background = themeVars['--neu-bg'];
document.body.style.color = themeVars['--neu-text'];

// Update localStorage with normalized value
localStorage.setItem(STORAGE_KEY, mode);

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
