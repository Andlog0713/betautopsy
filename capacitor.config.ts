import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.betautopsy.app',
  appName: 'BetAutopsy',
  // `out/` is produced by `npm run build:mobile` (which wraps
  // `next build` with `output: 'export'`). `npx cap sync ios` copies
  // this directory into `ios/App/App/public/` as the webview's
  // bundled assets.
  webDir: 'out',
  ios: {
    // `contentInset: 'never'` lets the webview content draw under the
    // status bar / home indicator so we control safe-area math via
    // `env(safe-area-inset-*)` instead of WKWebView's automatic
    // top/bottom insets. Native-feeling apps draw edge-to-edge; the
    // default `'always'` adds a translucent inset that produces a
    // visible gap at the top of the splash → first-paint hand-off.
    contentInset: 'never',
    // `scrollEnabled: false` disables WKWebView's outer rubber-band
    // scroll. Inner scroll containers (the dashboard list, etc.)
    // still scroll because they own their own scroll context. This
    // kills the "whole app pulls down then snaps back" gesture that
    // doesn't exist in native iOS apps.
    scrollEnabled: false,
    // Disables the iOS "peek" preview when long-pressing links. We
    // own our own long-press semantics (PR-4 will add a context-menu
    // sheet), and the OS preview reads as "this is a website."
    allowsLinkPreview: false,
    // Forces the mobile UA string regardless of device class. Without
    // this, iPad Capacitor webviews advertise as desktop Safari and
    // server-side `Sec-CH-UA-Mobile`-driven branches misroute.
    preferredContentMode: 'mobile',
    // Background color WKWebView paints before the bundle is ready.
    // Matches the splash + body so there's no flash of any other
    // color during the launch handoff.
    backgroundColor: '#0D1117',
  },
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
      // Matches the root layout / status-bar background so there's
      // no flash of white between launch and first paint.
      //
      // `launchAutoHide: false` — the splash is hidden
      // deterministically by `<SplashHider>` in `app/layout.tsx`,
      // which calls `hideSplashScreen()` once React has mounted.
      // Setting this to `true` causes Capacitor's platform timer
      // to race against React hydration and log a "SplashScreen
      // was automatically hidden after default timeout" warning.
      //
      // `launchShowDuration: 0` is explicit-not-default. With
      // `launchAutoHide: false` the platform timer is a no-op
      // anyway, but pinning the duration to 0 documents the intent
      // and stops Capacitor from logging a "default timeout"
      // warning if a future plugin upgrade flips the auto-hide
      // default back on.
      backgroundColor: '#0D1117',
      launchAutoHide: false,
      launchShowDuration: 0,
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

