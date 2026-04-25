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
          raised: '#1a1a26',
          elevated: '#222232',
          overlay: '#222232',
        },
        // Dashboard redesign tier system — background contrast instead of borders
        // Brand-compliant 5-elevation surface stack
        tier: {
          0: '#0D1117', // Midnight — page background
          1: '#111318', // Base — primary cards
          2: '#161820', // Surface — secondary / nav
          3: '#1C1F28', // Raised — hover
          4: '#222530', // Elevated — overlay / pressed
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        // Text hierarchy — weight/size for hierarchy, not color
        fg: {
          DEFAULT: '#fbf9ff',
          bright: '#fbf9ff',
          muted: '#fbf9ff',
          dim: '#9ca3af',
        },
        // Brand — unified teal
        scalpel: {
          DEFAULT: '#00C9A7',
          dim: '#00A88C',
          muted: 'rgba(0,201,167,0.12)',
        },
        // Severity — desaturated, clinical
        bleed: {
          DEFAULT: '#C4463A',
          dim: '#8B2E25',
          muted: 'rgba(196,70,58,0.08)',
        },
        // Semantic
        win: '#00C9A7',
        loss: '#C4463A',
        caution: '#C9A04E',
        // Legacy aliases
        ink: {
          900: '#0a0a12',
          800: '#12121c',
          700: '#4A5260',
          600: '#7A8494',
          500: '#B0B8C4',
        },
        flame: { 500: '#00C9A7', 600: '#00A88C' },
        mint: { 500: '#00C9A7' },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Forensic aesthetic: no soft shadows, no glass blur. Tailwind's
      // defaults for these would let `shadow-md`/`backdrop-blur-sm` slip
      // back in via training-data muscle memory; the empty objects make
      // those classes emit no CSS so they fail loudly in review.
      boxShadow: {},
      backdropBlur: {},
      // Cards top out at `lg` (10px). The previous `2xl` (16px) and
      // `3xl` (20px) tokens encouraged shadcn-style soft shapes that
      // don't fit the case-file metaphor — dropped here. Existing
      // `rounded-2xl`/`rounded-3xl` usages will silently stop emitting
      // CSS; `scripts/check-design-system.mjs` surfaces them as CI
      // warnings until the sweep branch maps each one to the right
      // token.
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '10px',
        'xl': '12px',
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
