/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces — legacy aliases kept for compat, mapped to brand tier values
        base: '#0D1117',
        surface: {
          DEFAULT: '#111318',
          base: '#0D1117',
          1: '#111318',
          2: '#161820',
          3: '#1C1F28',
          raised: '#161820',
          elevated: '#1C1F28',
          overlay: '#222530',
        },
        // Brand-compliant 5-elevation surface stack
        tier: {
          0: '#0D1117', // Midnight — page background
          1: '#111318', // Base — primary cards
          2: '#161820', // Surface — secondary / nav
          3: '#1C1F28', // Raised — hover
          4: '#222530', // Elevated — overlay / pressed
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.04)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        // Text hierarchy — brand guide values
        fg: {
          DEFAULT: '#D0D5DD',
          bright: '#F0F2F5',
          muted: '#848D9A',
          dim: '#515968',
        },
        // Brand — unified teal
        scalpel: {
          DEFAULT: '#00C9A7',
          dim: '#00A88C',
          muted: 'rgba(0,201,167,0.12)',
        },
        // Severity — brand guide Bleed Red
        bleed: {
          DEFAULT: '#E8453C',
          dim: '#A32F28',
          muted: 'rgba(232,69,60,0.08)',
        },
        // Semantic — brand guide values
        win: '#3FB950',
        loss: '#F85149',
        caution: '#D29922',
        // Legacy aliases — mapped to new brand values
        ink: {
          900: '#0D1117',
          800: '#111318',
          700: '#515968',
          600: '#848D9A',
          500: '#D0D5DD',
        },
        flame: { 500: '#00C9A7', 600: '#00A88C' },
        mint: { 500: '#00C9A7' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Brand guide: max 4px on cards/containers/buttons. Most elements 2px.
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '4px',
        'md': '4px',
        'lg': '4px',
        'xl': '4px',
        '2xl': '4px',
        '3xl': '4px',
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
        'border-beam': {
          '100%': { 'offset-distance': '100%' },
        },
        'shiny-text': {
          '0%, 90%, 100%': { 'background-position': 'calc(-100% - var(--shiny-width)) 0' },
          '30%, 60%': { 'background-position': 'calc(100% + var(--shiny-width)) 0' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(calc(-100% - var(--gap)))' },
        },
        'marquee-vertical': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(calc(-100% - var(--gap)))' },
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
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'shiny-text': 'shiny-text 8s infinite',
        marquee: 'marquee var(--duration) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration) infinite linear',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
