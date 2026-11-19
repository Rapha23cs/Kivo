/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#09090B', // Pure carbon black
          900: '#0D0E10', // Main canvas background
          850: '#141518', // Card / Modal surface
          800: '#18191D', // Elevated surface / row
          750: '#1F2025', // Hover / Active pill
          700: '#27282E', // Subtle border
          600: '#32343C', // Contrast border
        },
        ice: {
          50: '#FFFFFF',
          100: '#F4F4F5', // Ice white
          200: '#E4E4E7',
          300: '#A1A1AA', // Cool ash gray
          400: '#71717A', // Muted neutral gray
          500: '#52525B',
        },
        mint: {
          400: '#34D399',
          500: '#2EB88A', // Photo reference mint green
          600: '#10B981',
        },
        frost: {
          cyan: '#34D399',
          teal: '#2EB88A',
          blue: '#94A3B8',
          glow: '#10B981',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#2eb88a',
          600: '#10b981',
          700: '#059669',
          800: '#047857',
          900: '#064e3b',
        },
        navy: {
          800: '#18191D',
          900: '#111214',
          950: '#0B0B0D',
        },
        hazard: {
          orange: '#94A3B8',
          yellow: '#CBD5E1',
          red: '#F43F5E',
          blue: '#94A3B8',
        }
      }
    },
  },
  plugins: [],
}

