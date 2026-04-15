import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.betautopsy.app',
  appName: 'BetAutopsy',
  // `out/` is produced by `npm run build:mobile` (which wraps
  // `next build` with `output: 'export'`). `npx cap sync ios` copies
  // this directory into `ios/App/App/public/` as the webview's
  // bundled assets.
  webDir: 'out',
  server: {
    // Serve the bundled webview from `https://localhost` instead of
    // a custom URL scheme like `betautopsy://localhost`. Rationale:
    //
    //   WKWebView at a custom URL scheme reports its origin as
    //   `null` (or the raw scheme), which breaks cross-origin
    //   `fetch()` to upstream APIs that require a real HTTPS
    //   origin for CORS — including Supabase's auth server. The
    //   first call to `supabase.auth.signInWithPassword` then
    //   hangs indefinitely because the CORS preflight never
    //   returns.
    //
    //   Using `iosScheme: 'https'` + `hostname: 'localhost'`
    //   makes WKWebView load the bundle from `https://localhost`,
    //   which has standard HTTPS CORS semantics and is what every
    //   production Capacitor + Supabase app uses. Cookies also
    //   start working at this scheme, but we still prefer the
    //   localStorage-backed Supabase client for Capacitor (set
    //   up in `lib/supabase.ts`) because the behavior is more
    //   consistent across Capacitor upgrades.
    //
    // `allowNavigation` whitelists hosts the webview is allowed
    // to navigate to externally (e.g. following a real-world link
    // back to the hosted web app, or a Stripe checkout redirect).
    // Does NOT govern `fetch()` calls — those are always allowed
    // outbound.
    hostname: 'localhost',
    iosScheme: 'https',
    androidScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
      'betautopsy.com',
      'www.betautopsy.com',
    ],
  },
  plugins: {
    SplashScreen: {
      // Match the root layout / status-bar background so there's no
      // flash of white between launch and first paint. Keep the
      // splash visible until the app explicitly calls
      // `hideSplashScreen()` in `lib/native.ts` — gives us
      // deterministic control over when the app is "ready".
      backgroundColor: '#0D1117',
      launchAutoHide: false,
      showSpinner: false,
    },
    Keyboard: {
      // `body` resize lets the webview shrink when the keyboard
      // comes up so inputs don't end up hidden under it. `dark`
      // keyboard appearance matches the rest of the dark theme.
      resize: 'body',
      style: 'dark',
    },
    StatusBar: {
      // `dark` here refers to the style of the status-bar *content*
      // (light text on dark background), which matches the app's
      // dark theme. The explicit `backgroundColor` is Android-only
      // — iOS ignores it and reads the color from the view underneath
      // the status bar — but leaving it set is harmless.
      style: 'dark',
      backgroundColor: '#0D1117',
    },
  },
};

export default config;

