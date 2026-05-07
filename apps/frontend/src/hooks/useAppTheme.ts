import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeConfig {
  mode: ThemeMode;
  name: string;
  vars: Record<string, string>;
}

const THEME_CONFIGS: Record<ThemeMode, ThemeConfig> = {
  light: {
    mode: 'light',
    name: 'Light',
    vars: {
      '--neu-bg': '#e8eaf0',
      '--neu-bg-card': '#eceef4',
      '--neu-shadow-dark': '#c5c8d2',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': 'var(--color-primary)',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#1f2937',
      '--neu-text-muted': '#6b7280',
    },
  },
  dark: {
    mode: 'dark',
    name: 'Dark',
    vars: {
      '--neu-bg': '#0f172a',
      '--neu-bg-card': '#1e293b',
      '--neu-shadow-dark': '#090e1a',
      '--neu-shadow-light': '#1c2d47',
      '--neu-accent': '#60a5fa',
      '--neu-btn-text': '#0f172a',
      '--neu-text': '#e2e8f0',
      '--neu-text-muted': '#94a3b8',
    },
  },
};

const STORAGE_KEY = 'app-theme';

// Map old theme IDs to new modes for backward compatibility
const LEGACY_THEME_MAP: Record<string, ThemeMode> = {
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

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement;

  // Apply CSS variables
  Object.entries(config.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set data-theme attribute for CSS targeting
  root.setAttribute('data-theme', config.mode);

  // Control dark mode class for Tailwind dark: variants
  if (config.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply base styles to body
  document.body.style.background = config.vars['--neu-bg'] ?? '';
  document.body.style.color = config.vars['--neu-text'] ?? '';
}

function normalizeThemeValue(value: string | null): ThemeMode {
  if (!value) return 'light';

  // Check if it's already a valid mode
  if (value === 'light' || value === 'dark') {
    return value;
  }

  // Map legacy theme IDs to modes
  return LEGACY_THEME_MAP[value] || 'light';
}

export function useAppTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeThemeValue(stored);
  });

  const currentTheme = THEME_CONFIGS[mode];

  useEffect(() => {
    applyTheme(currentTheme);
    // Update localStorage with normalized value
    localStorage.setItem(STORAGE_KEY, mode);
  }, [currentTheme, mode]);

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const toggleTheme = () => {
    setThemeMode(mode === 'light' ? 'dark' : 'light');
  };

  return {
    mode,
    currentTheme,
    setThemeMode,
    toggleTheme,
    isLight: mode === 'light',
    isDark: mode === 'dark',
  };
}
