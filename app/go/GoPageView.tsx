'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoPageView() {
  useEffect(() => {
    window.gtag?.('event', 'landing_page_view', {
      page_variant: 'tiktok_go',
    });
  }, []);
  return null;
}
