/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Green theme for career growth
        primary: {
          DEFAULT: '#2D5F4C',
          light: '#3A7A5F',
          dark: '#1F4435',
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
        // Additional primary shades (hardcoded colors found in codebase)
        'primary-cta': '#4A7C59',      // CTA buttons (HomeCTA)
        'primary-avatar': '#5D8468',   // Avatar backgrounds (ProfileSummaryCard)

        // Beige/Cream tones for decorative backgrounds
        beige: {
          light: '#E8DCC8',
          DEFAULT: '#D4C4B0',
          dark: '#C4B4A0',
        },

        // Surface colors (backgrounds)
        surface: {
          primary: '#FAFAF9',
          secondary: '#F5F5F4',
          tertiary: '#E7E5E4',
        },

        // Admin dark mode colors
        admin: {
          'dark-bg': '#0F172A',
          'dark-card': '#1E293B',
          'dark-border': '#2C3A4B',
          'dark-hover': '#1A2333',
        },

        // Semantic colors
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

      borderRadius: {
        'button': '0.5rem',      // 8px - Buttons, inputs
        'card': '0.75rem',       // 12px - Standard cards
        'card-lg': '1rem',       // 16px - Large cards, modals
        'card-feature': '1.5rem', // 24px - Feature cards (replaces rounded-[24px])
        'card-special': '1.75rem', // 28px - Special sections (replaces rounded-[28px])
        'card-hero': '2rem',     // 32px - Hero sections (replaces rounded-[32px])
      },

      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
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

      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'base': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },

      boxShadow: {
        // Primary shadows (green theme)
        'primary': '0 4px 6px -1px rgb(45 95 76 / 0.1), 0 2px 4px -2px rgb(45 95 76 / 0.1)',
        'primary-lg': '0 10px 15px -3px rgb(45 95 76 / 0.1), 0 4px 6px -4px rgb(45 95 76 / 0.1)',

        // Colored shadows for buttons and interactive elements
        'success-sm': '0 4px 6px -1px rgb(34 197 94 / 0.2)',
        'success': '0 10px 15px -3px rgb(34 197 94 / 0.2)',
        'success-lg': '0 20px 25px -5px rgb(34 197 94 / 0.3)',

        'primary-cta-sm': '0 4px 6px -1px rgb(74 124 89 / 0.2)',
        'primary-cta': '0 10px 15px -3px rgb(74 124 89 / 0.2)',
        'primary-cta-lg': '0 20px 25px -5px rgb(74 124 89 / 0.3)',

        'purple-sm': '0 4px 6px -1px rgb(168 85 247 / 0.2)',
        'purple': '0 10px 15px -3px rgb(168 85 247 / 0.2)',
        'purple-lg': '0 20px 25px -5px rgb(168 85 247 / 0.3)',

        // Dark mode strategy: subtle highlight instead of shadow
        'dark-highlight': '0 0 0 1px rgb(255 255 255 / 0.05)',
        'dark-highlight-lg': '0 0 0 1px rgb(255 255 255 / 0.1)',
      },

      backgroundImage: {
        // Primary gradients
        'gradient-primary': 'linear-gradient(to right, #16A34A, #10B981, #14B8A6)',
        'gradient-primary-cta': 'linear-gradient(to right, #4A7C59, #3d6449)',

        // Premium gradients
        'gradient-premium-pro': 'linear-gradient(to right, #A855F7, #EC4899, #A855F7)',
        'gradient-premium-plus': 'linear-gradient(to right, #22C55E, #10B981, #22C55E)',
        'gradient-premium-basic': 'linear-gradient(to right, #3B82F6, #06B6D4, #3B82F6)',

        // Surface gradients
        'gradient-surface-light': 'linear-gradient(to right, #E8DCC8, #D4C4B0)',
        'gradient-surface-hero': 'linear-gradient(to bottom right, #4A7C59, #2D5F4C)',

        // Decorative gradients
        'gradient-text-primary': 'linear-gradient(to right, #16A34A, #10B981, #14B8A6)',
        'gradient-text-hero': 'linear-gradient(to right, #22C55E, #10B981, #14B8A6)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
