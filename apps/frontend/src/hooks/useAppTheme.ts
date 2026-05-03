import { useEffect, useState } from 'react';

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  dark: boolean;
  vars: Record<string, string>;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'default',
    name: 'Default',
    emoji: '⚪',
    dark: false,
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
  {
    id: 'cream',
    name: 'Cream',
    emoji: '☕',
    dark: false,
    vars: {
      '--neu-bg': '#f0e8d8',
      '--neu-bg-card': '#f5ede0',
      '--neu-shadow-dark': '#c8bfaf',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': '#92650a',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#3d2b1f',
      '--neu-text-muted': '#7a5c40',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    dark: true,
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
  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    dark: false,
    vars: {
      '--neu-bg': '#fce7f3',
      '--neu-bg-card': '#fdf2f8',
      '--neu-shadow-dark': '#ddb8cc',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': '#db2777',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#831843',
      '--neu-text-muted': '#be185d',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    dark: true,
    vars: {
      '--neu-bg': '#0c1929',
      '--neu-bg-card': '#112236',
      '--neu-shadow-dark': '#060f18',
      '--neu-shadow-light': '#162a42',
      '--neu-accent': '#22d3ee',
      '--neu-btn-text': '#0c1929',
      '--neu-text': '#cffafe',
      '--neu-text-muted': '#67e8f9',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌿',
    dark: false,
    vars: {
      '--neu-bg': '#e8f5e8',
      '--neu-bg-card': '#f0f9f0',
      '--neu-shadow-dark': '#c2d9c2',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': 'var(--color-primary-hover)',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#14532d',
      '--neu-text-muted': '#166534',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    dark: false,
    vars: {
      '--neu-bg': '#fdebd0',
      '--neu-bg-card': '#fef3e2',
      '--neu-shadow-dark': '#d4c0a0',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': '#ea580c',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#7c2d12',
      '--neu-text-muted': '#9a3412',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    emoji: '💜',
    dark: true,
    vars: {
      '--neu-bg': '#0d0d1a',
      '--neu-bg-card': '#131328',
      '--neu-shadow-dark': '#06060f',
      '--neu-shadow-light': '#1a1a38',
      '--neu-accent': '#a855f7',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#ede9fe',
      '--neu-text-muted': '#c4b5fd',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    emoji: '❄️',
    dark: false,
    vars: {
      '--neu-bg': '#e8f0f8',
      '--neu-bg-card': '#f0f6fc',
      '--neu-shadow-dark': '#bccedd',
      '--neu-shadow-light': '#ffffff',
      '--neu-accent': '#0284c7',
      '--neu-btn-text': '#ffffff',
      '--neu-text': '#0c4a6e',
      '--neu-text-muted': '#0369a1',
    },
  },
];

const STORAGE_KEY = 'app-theme';

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  // Control dark mode class — drives all Tailwind dark: variants
  if (theme.dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Apply base text + bg to body so non-Tailwind elements are also covered
  document.body.style.background = theme.vars['--neu-bg'] ?? '';
  document.body.style.color = theme.vars['--neu-text'] ?? '';
}

export function useAppTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  });

  const currentTheme = APP_THEMES.find(t => t.id === themeId) ?? APP_THEMES[0];

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const selectTheme = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);
  };

  return { themeId, currentTheme, selectTheme, themes: APP_THEMES };
}
