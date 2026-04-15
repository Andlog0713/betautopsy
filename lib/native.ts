import { isMobileApp } from './platform';

/**
 * Native integration wrappers for BetAutopsy.
 *
 * Every function in this file is safe to call from any platform:
 *
 *   - On web (`isMobileApp()` is false) each helper either no-ops
 *     or falls back to the browser-native API that does the same
 *     thing (e.g. `navigator.share`, `localStorage`, `window.open`).
 *
 *   - On mobile (Capacitor native webview) each helper dynamically
 *     imports its `@capacitor/*` plugin so that web bundles never
 *     pay the cost of the plugin code — tree-shaking can't reach
 *     behind a dynamic `import()`, so webpack emits the plugin
 *     into a separate chunk that only the mobile build actually
 *     loads.
 *
 * Dynamic import is also what keeps `npm run build` (which has
 * no `@capacitor/*` packages in its resolver scope when built
 * without `node_modules` — e.g. CI image slimming) from crashing
 * on static analysis. The imports are resolved at runtime inside
 * the mobile webview.
 */

// ─── Haptics ──────────────────────────────────────────────────────

type HapticStyle = 'light' | 'medium' | 'heavy';

export async function triggerHaptic(style: HapticStyle = 'light'): Promise<void> {
  if (!isMobileApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map: Record<HapticStyle, typeof ImpactStyle[keyof typeof ImpactStyle]> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    // Silent — a missing haptics plugin or unsupported device
    // should never break a user interaction.
  }
}

// ─── Browser ──────────────────────────────────────────────────────

export async function openInBrowser(url: string): Promise<void> {
  if (!isMobileApp()) {
    // Plain browser: open in a new tab. `noopener,noreferrer`
    // prevents the opened page from reaching back into this one.
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  try {
    const { Browser } = await import('@capacitor/browser');
    // `Browser.open` uses SFSafariViewController on iOS — the
    // in-app browser with back/forward and a working cookie jar
    // — rather than kicking the user out to Safari.
    await Browser.open({ url });
  } catch {
    // Fall back to whatever `window.open` does inside the webview
    // if the plugin isn't available for any reason.
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }
}

// ─── Share ────────────────────────────────────────────────────────

export async function shareContent(
  title: string,
  text: string,
  url: string
): Promise<void> {
  if (isMobileApp()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return;
    } catch {
      // Fall through to the web paths below.
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      // User cancelled or the API rejected — fall through to clipboard.
    }
  }

  // Final fallback: copy the URL to the clipboard. This is what
  // desktop browsers without Web Share get.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* swallow — nothing more we can do */
    }
  }
}

// ─── Preferences / localStorage ──────────────────────────────────

export async function storeLocally(key: string, value: string): Promise<void> {
  if (!isMobileApp()) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* Safari private mode / quota errors */
      }
    }
    return;
  }
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } catch {
    /* silent */
  }
}

export async function getLocally(key: string): Promise<string | null> {
  if (!isMobileApp()) {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

// ─── Splash screen ────────────────────────────────────────────────

export async function hideSplashScreen(): Promise<void> {
  if (!isMobileApp()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* silent */
  }
}
