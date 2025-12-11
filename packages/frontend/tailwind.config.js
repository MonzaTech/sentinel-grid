/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      colors: {
        // Primary blue - for buttons and accents
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Professional dark palette - Bloomberg/Palantir inspired
        navy: {
          950: '#080b12',
          900: '#0c1018',
          850: '#10151f',
          800: '#141a26',
          750: '#182030',
          700: '#1e2738',
          600: '#283244',
          500: '#354052',
        },
        // Subtle blue accent - professional, not flashy
        accent: {
          DEFAULT: '#5b9bd5',
          light: '#7eb3e4',
          dark: '#4080c4',
          muted: '#1a3550',
          subtle: '#0f1f30',
        },
        // Status colors - clear but not garish
        status: {
          operational: '#4ade80',
          warning: '#fbbf24',
          critical: '#f87171',
          offline: '#6b7280',
          info: '#60a5fa',
        },
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '3px',
        'md': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
