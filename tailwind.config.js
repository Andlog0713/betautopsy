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
          900: '#0f0e0c',
          800: '#1f1e1c',
          700: '#5f594f',
          600: '#9a9483',
          500: '#b5ae9e',
        },
        flame: {
          500: '#f97316',
          600: '#ea580c',
        },
        mint: {
          500: '#4ade80',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(249,115,22,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(249,115,22,0.4)' },
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
