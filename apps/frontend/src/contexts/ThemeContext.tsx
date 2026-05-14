import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 🔥 Sync với main.tsx
const STORAGE_KEY = 'app-theme';

function normalizeTheme(value: string | null): Theme {
  if (value === 'dark') return 'dark';
  return 'light';
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const normalized = normalizeTheme(saved);

      console.log('🎨 Init theme from localStorage:', saved, '→', normalized);

      return normalized;
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      console.log('🎨 Theme changed to:', theme);

      // ✅ Sync localStorage (same key as main.tsx)
      localStorage.setItem(STORAGE_KEY, theme);

      // ✅ Sync DOM class (Tailwind uses this)
      const root = document.documentElement;

      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // ✅ Trigger other listeners (optional but useful)
      window.dispatchEvent(new Event('storage'));

    } catch (err) {
      console.error('❌ Theme error:', err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      console.log('🎨 Toggle:', prev, '→', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};