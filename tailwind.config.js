/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0D1117',
          800: '#1C1E2D',
          700: '#5A5C6F',
          600: '#A0A3B1',
          500: '#C0C3CE',
        },
        scalpel: {
          400: '#00E8C0',
          500: '#00C9A7',
          600: '#00A88C',
          700: '#007D66',
        },
        bleed: {
          400: '#F06B63',
          500: '#E8453C',
          600: '#C93A32',
        },
        // Keep flame/mint as aliases during transition to avoid breakage
        flame: {
          500: '#00C9A7',
          600: '#00A88C',
        },
        mint: {
          500: '#00C9A7',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,201,167,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0,201,167,0.4)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'fade-in-d1': 'fade-in 0.5s ease-out 0.1s both',
        'fade-in-d2': 'fade-in 0.5s ease-out 0.2s both',
        'fade-in-d3': 'fade-in 0.5s ease-out 0.3s both',
        'fade-in-d4': 'fade-in 0.5s ease-out 0.4s both',
        'fade-in-d5': 'fade-in 0.5s ease-out 0.5s both',
        'slide-up': 'slide-up 0.6s ease-out both',
        'slide-up-d1': 'slide-up 0.6s ease-out 0.1s both',
        'slide-up-d2': 'slide-up 0.6s ease-out 0.2s both',
        'slide-up-d3': 'slide-up 0.6s ease-out 0.3s both',
        'slide-up-d4': 'slide-up 0.6s ease-out 0.4s both',
        'slide-up-d5': 'slide-up 0.6s ease-out 0.5s both',
        'slide-up-d6': 'slide-up 0.6s ease-out 0.6s both',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
