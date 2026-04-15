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
    // Custom URL scheme so `https://betautopsy.com` links opened
    // inside the app map to the bundled webview instead of trying
    // to navigate to the hosted origin (where the user would lose
    // their in-app state). Outbound API calls go to the real origin
    // via `lib/api-client.ts`'s `getBaseUrl()` which is
    // independent of this scheme.
    iosScheme: 'betautopsy',
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
