/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces — 4-level dark system
        base: '#0a0a12',
        surface: {
          DEFAULT: '#12121c',
          base: '#0a0a12',
          1: '#12121c',
          2: '#1a1a26',
          3: '#222232',
          // Legacy aliases — KEEP until migration complete
          raised: '#1a1a26',
          elevated: '#222232',
          overlay: '#222232',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        // Text hierarchy — 4 levels (brighter)
        fg: {
          DEFAULT: '#D0D5DD',
          bright: '#F0F2F5',
          muted: '#A0A8B4',
          dim: '#5D6673',
        },
        // Brand
        scalpel: {
          DEFAULT: '#00FFCB',
          dim: '#00B38E',
          muted: 'rgba(0,255,203,0.12)',
        },
        bleed: {
          DEFAULT: '#E8453C',
          dim: '#991F1F',
          muted: 'rgba(232,69,60,0.08)',
        },
        // Semantic
        win: '#3FB950',
        loss: '#F85149',
        caution: '#D29922',
        // Legacy aliases — KEEP until migration complete
        ink: {
          900: '#0a0a12',
          800: '#0f0f17',
          700: '#5D6673',
          600: '#A0A8B4',
          500: '#B0B8C4',
        },
        flame: { 500: '#00FFCB', 600: '#00B38E' },
        mint: { 500: '#3FB950' },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '2px',
        'md': '4px',
        'lg': '4px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-d1': 'fade-in 0.4s ease-out 0.1s both',
        'fade-in-d2': 'fade-in 0.4s ease-out 0.2s both',
        'fade-in-d3': 'fade-in 0.4s ease-out 0.3s both',
        'fade-in-d4': 'fade-in 0.4s ease-out 0.4s both',
        'fade-in-d5': 'fade-in 0.4s ease-out 0.5s both',
        'slide-up': 'slide-up 0.5s ease-out both',
        'slide-up-d1': 'slide-up 0.5s ease-out 0.1s both',
        'slide-up-d2': 'slide-up 0.5s ease-out 0.2s both',
        'slide-up-d3': 'slide-up 0.5s ease-out 0.3s both',
        'slide-up-d4': 'slide-up 0.5s ease-out 0.4s both',
        'slide-up-d5': 'slide-up 0.5s ease-out 0.5s both',
        'slide-up-d6': 'slide-up 0.5s ease-out 0.6s both',
        shimmer: 'shimmer 2s infinite',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
