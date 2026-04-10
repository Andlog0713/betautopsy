import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BetAutopsy — Forensic Betting Analysis',
    short_name: 'BetAutopsy',
    description: 'AI-powered behavioral analysis for sports bettors',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D1117',
    theme_color: '#00C9A7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
