import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BetAutopsy — Forensic Betting Analysis',
    short_name: 'BetAutopsy',
    description: 'See what your betting data is trying to tell you. 47 behavioral signals. One forensic report.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0E12',
    theme_color: '#FACC15',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
