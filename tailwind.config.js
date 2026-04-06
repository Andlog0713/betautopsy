/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces — 5 elevation levels (warmer, more visible steps)
        base: '#131620',
        surface: {
          DEFAULT: '#1A1D28',
          raised: '#212530',
          elevated: '#282D3A',
          overlay: '#303644',
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
          900: '#131620',
          800: '#1A1D28',
          700: '#5D6673',
          600: '#A0A8B4',
          500: '#B0B8C4',
        },
        flame: { 500: '#00FFCB', 600: '#00B38E' },
        mint: { 500: '#3FB950' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
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
      },
    },
  },
  plugins: [],
};
