/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          400: '#22d3ee', // Bright Cyan (Neon)
          500: '#06b6d4', // Vibrant Cyan Base
          600: '#0891b2',
          700: '#0e7490',
        },
        accent: {
          400: '#c084fc',
          500: '#a855f7', // Electric Violet
          600: '#9333ea',
        },
        dark: {
          bg: '#05050A',       // Almost perfect black/abyss
          surface: '#11111A',  // Lifted deep space
          border: '#1A1A2E'    // Subtle deep violet border
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
