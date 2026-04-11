'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ScrollToHashInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('scrollTo');
    if (!id) return;
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState({}, '', '/');
    }, 500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return null;
}

export default function ScrollToHash() {
  return (
    <Suspense fallback={null}>
      <ScrollToHashInner />
    </Suspense>
  );
}
