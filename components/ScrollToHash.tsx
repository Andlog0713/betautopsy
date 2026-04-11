'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ScrollToHash() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('scrollTo');
    if (!id) return;
    // Wait for the page to fully render
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return null;
}
