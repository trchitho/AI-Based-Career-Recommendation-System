/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // ── shadcn/ui semantic color tokens (CSS variable-driven) ──────────
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          // Legacy shades kept for backward compat
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        // ── Legacy semantic tokens (kept for backward compat) ──────────
        'primary-cta': '#4A7C59',
        'primary-avatar': '#5D8468',
        beige: {
          light: '#E8DCC8',
          DEFAULT: '#D4C4B0',
          dark: '#C4B4A0',
        },
        surface: {
          primary: '#FAFAF9',
          secondary: '#F5F5F4',
          tertiary: '#E7E5E4',
        },
        admin: {
          'dark-bg': '#0F172A',
          'dark-card': '#1E293B',
          'dark-border': '#2C3A4B',
          'dark-hover': '#1A2333',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
          dark: '#15803D',
        },
        warning: {
          DEFAULT: '#EA580C',
          light: '#F97316',
          dark: '#C2410C',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#B91C1C',
        },
        info: {
          DEFAULT: '#0284C7',
          light: '#0EA5E9',
          dark: '#0369A1',
        },
      },

      // ── Border radius ──────────────────────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Legacy tokens
        button: '0.5rem',
        card: '0.75rem',
        'card-lg': '1rem',
        'card-feature': '1.5rem',
        'card-special': '1.75rem',
        'card-hero': '2rem',
      },

      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          'Inter',
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'Monaco',
          '"Cascadia Code"',
          '"Roboto Mono"',
          'Consolas',
          'monospace',
        ],
        logo: ['"Plus Jakarta Sans"', 'sans-serif'],
      },

      // ── Spacing / sizing ───────────────────────────────────────────────
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },

      // ── Transitions ────────────────────────────────────────────────────
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        base: '200ms',
        slow: '300ms',
        slower: '500ms',
      },

      // ── Shadows ────────────────────────────────────────────────────────
      boxShadow: {
        // Semantic elevation
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        // Primary brand shadows
        'primary': '0 4px 6px -1px rgb(45 95 76 / 0.1), 0 2px 4px -2px rgb(45 95 76 / 0.1)',
        'primary-lg': '0 10px 15px -3px rgb(45 95 76 / 0.1), 0 4px 6px -4px rgb(45 95 76 / 0.1)',
        // Colored shadows
        'success-sm': '0 4px 6px -1px rgb(34 197 94 / 0.2)',
        'success': '0 10px 15px -3px rgb(34 197 94 / 0.2)',
        'purple-sm': '0 4px 6px -1px rgb(168 85 247 / 0.2)',
        'purple': '0 10px 15px -3px rgb(168 85 247 / 0.2)',
      },

      // ── Keyframes & animations ─────────────────────────────────────────
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(8px)' },
        },
        'slide-in-from-top': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'blob': {
          '0%': { transform: 'scale(1)' },
          '33%': { transform: 'scale(1.1)' },
          '66%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.9)' },
          '50%': { opacity: '0.8', transform: 'translateY(-5px) scale(1.02)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'scroll-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 60px rgba(124,58,237,0.45), 0 0 100px rgba(124,58,237,0.22), 0 18px 42px rgba(109,40,217,0.42)',
          },
          '50%': {
            transform: 'scale(1.03)',
            boxShadow: '0 0 80px rgba(124,58,237,0.55), 0 0 120px rgba(124,58,237,0.28), 0 20px 50px rgba(109,40,217,0.48)',
          },
        },
        'progressFlow': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite linear',
        'spin-slow': 'spin-slow 3s linear infinite',
        'blob': 'blob 7s infinite',
        'bounce-in': 'bounce-in 0.4s ease-out',
        'scroll': 'scroll 40s linear infinite',
        'scroll-reverse': 'scroll-reverse 40s linear infinite',
        'float': 'float 5s ease-in-out infinite',
        'pulse': 'pulse 3s ease-in-out infinite',
        'progressFlow': 'progressFlow 1.8s linear infinite',
      },

      // ── Background images ──────────────────────────────────────────────
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #16A34A, #10B981, #14B8A6)',
        'gradient-primary-cta': 'linear-gradient(to right, #4A7C59, #3d6449)',
        'gradient-premium-pro': 'linear-gradient(to right, #A855F7, #EC4899, #A855F7)',
        'gradient-surface-hero': 'linear-gradient(to bottom right, #4A7C59, #2D5F4C)',
        'gradient-text-primary': 'linear-gradient(to right, #16A34A, #10B981, #14B8A6)',
      },
    },
  },
  plugins: [],
};
