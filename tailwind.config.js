/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Only explicitly approved shape and depth utilities are generated.
    boxShadow: {
      none: 'none',
    },
    backdropBlur: {
      none: '0',
    },
    borderRadius: {
      none: '0px',
      sm: '2px',
      DEFAULT: '4px',
      md: '6px',
      full: '9999px',
    },
    extend: {
      colors: {
        base: '#0A0E12',
        surface: {
          DEFAULT: '#131A20',
          base: '#0A0E12',
          1: '#131A20',
          2: 'rgba(255,255,255,0.04)',
          3: 'rgba(255,255,255,0.06)',
          raised: 'rgba(255,255,255,0.04)',
          elevated: 'rgba(255,255,255,0.06)',
          overlay: 'rgba(255,255,255,0.08)',
        },
        tier: {
          0: '#0A0E12',
          1: '#131A20',
          2: 'rgba(255,255,255,0.04)',
          3: 'rgba(255,255,255,0.06)',
          4: 'rgba(255,255,255,0.08)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        fg: {
          DEFAULT: '#EDEDF3',
          bright: '#FFFFFF',
          muted: 'rgba(255,255,255,0.7)',
          dim: 'rgba(255,255,255,0.5)',
        },
        scalpel: {
          DEFAULT: '#FACC15',
          dim: '#EAB308',
          muted: 'rgba(250,204,21,0.12)',
        },
        bleed: {
          DEFAULT: '#FF4D4D',
          dim: '#CC3D3D',
          muted: 'rgba(255,77,77,0.08)',
        },
        win: '#00DC82',
        loss: '#FF4D4D',
        caution: '#FFCD2C',
        ink: {
          900: '#0A0E12',
          800: '#131A20',
          700: '#3D3F50',
          600: 'rgba(255,255,255,0.5)',
          500: 'rgba(255,255,255,0.7)',
        },
        flame: { 500: '#FACC15', 600: '#EAB308' },
        mint: { 500: '#00DC82' },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
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
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'border-beam': {
          '100%': { 'offset-distance': '100%' },
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
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        marquee: 'marquee var(--duration) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration) infinite linear',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
