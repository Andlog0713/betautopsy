'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PrivacyContext = createContext<{
  hidden: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}>({
  hidden: false,
  toggle: () => {},
  mask: (v) => v,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('betautopsy_hide_numbers');
    if (stored === 'true') setHidden(true);
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      localStorage.setItem('betautopsy_hide_numbers', String(next));
      return next;
    });
  }, []);

  const mask = useCallback(
    (value: string) => (hidden ? '••••••' : value),
    [hidden]
  );

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function EyeToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy();

  return (
    <button
      onClick={toggle}
      className={`text-fg-muted hover:text-fg-muted transition-colors ${className ?? ''}`}
      aria-label={hidden ? 'Show numbers' : 'Hide numbers'}
    >
      {hidden ? (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
